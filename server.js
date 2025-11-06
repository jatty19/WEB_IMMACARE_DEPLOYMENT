require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "web_immacare")));
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.use("/bootstrap-icons", express.static(__dirname + "/node_modules/bootstrap-icons"));
app.use("/datatables.net", express.static(__dirname + "/node_modules/datatables.net"));
app.use("/datatables.net-dt", express.static(__dirname + "/node_modules/datatables.net-dt"));
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist"));
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ================== MONGOOSE SCHEMAS ==================

// User Schema
const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  middlename: String,
  lastname: { type: String, required: true },
  gender: { type: String, required: true },
  birthdate: { type: Date, required: true },
  age: Number,
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  status: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Account Schema
const accountSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  status: { type: Number, default: 1 },
  verification_token: String,
  is_verified: { type: Number, default: 0 },
  created_date: { type: Date, default: Date.now },
  updated_date: { type: Date, default: Date.now }
});

// Patient Schema
const patientSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstname: String,
  middlename: String,
  lastname: String,
  gender: String,
  birthdate: Date,
  age: Number,
  civil_status: String,
  mobile_number: String,
  email_address: String,
  home_address: String,
  emergency_name: String,
  emergency_relationship: String,
  emergency_mobile_number: String,
  bloodtype: String,
  allergies: String,
  current_medication: String,
  past_medical_condition: String,
  chronic_illness: String
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  consultation_type: String,
  booking_date: Date,
  booking_time: String,
  status: { type: String, default: 'Pending' },
  queue_no: String,
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_date: { type: Date, default: Date.now },
  updated_date: { type: Date, default: Date.now }
});

// Doctor Profile Schema
const doctorProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialty: String,
  department: String,
  years_of_experience: Number,
  professional_board: String,
  certificate: String,
  status: { type: String, default: 'Active' }
});

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  item: { type: String, required: true },
  category: String,
  quantity: { type: Number, default: 0 },
  average_quantity: Number,
  price: Number,
  status: String
});

// Inventory Category Schema
const inventoryCategorySchema = new mongoose.Schema({
  category: String
});

// Doctor Recommendation Schema
const doctorRecommendationSchema = new mongoose.Schema({
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  recommendation: String,
  follow_up_required: { type: Number, default: 0 },
  prescription_given: { type: Number, default: 0 },
  prescription: String,
  created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Account = mongoose.model('Account', accountSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const InventoryCategory = mongoose.model('InventoryCategory', inventoryCategorySchema);
const DoctorRecommendation = mongoose.model('DoctorRecommendation', doctorRecommendationSchema);

// ================== NODEMAILER CONFIGURATION ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================== CONSTANTS ==================
const saltRounds = 10;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ================== ROUTES ==================

// Home Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "web_immacare", "main.html"));
});

// ================== AUTHENTICATION ROUTES ==================

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Email and password are required" });
    }

    const account = await Account.findOne({ email, status: 1 });
    if (!account) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    if (account.is_verified === 0) {
      return res.status(403).send({ message: "Please verify your email before logging in" });
    }

    const user = await User.findById(account.user_id);
    if (!user || user.status !== 1) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    // Set session
    req.session.userId = account._id;
    req.session.email = account.email;
    req.session.phone = account.phone;
    req.session.user_id_id = user._id;
    req.session.firstname = user.firstname;
    req.session.lastname = user.lastname;
    req.session.middlename = user.middlename;
    req.session.gender = user.gender;
    req.session.birthdate = user.birthdate;
    req.session.age = user.age;
    req.session.role = user.role;

    res.send({
      message: "Login successful",
      user: {
        id: account._id,
        email: account.email,
        firstname: user.firstname,
        lastname: user.lastname,
        middlename: user.middlename,
        gender: user.gender,
        birthdate: user.birthdate,
        age: user.age,
        role: user.role,
        phone: account.phone,
        user_id_id: user._id
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send({ message: "Server error" });
  }
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { firstname, middlename, lastname, gender, birthdate, age, phone, email, password } = req.body;

    if (!firstname || !lastname || !gender || !birthdate || !email || !password) {
      return res.status(400).send({ message: "All fields are required" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).send({ message: "Invalid email format" });
    }

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).send({ message: "Email already in use" });
    }

    // Create user
    const newUser = new User({
      firstname,
      middlename: middlename || null,
      lastname,
      gender,
      birthdate,
      age,
      role: 'patient',
      status: 1
    });
    await newUser.save();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create account
    const newAccount = new Account({
      user_id: newUser._id,
      phone,
      email,
      password: hashedPassword,
      status: 1,
      verification_token: verificationToken,
      is_verified: 0
    });
    await newAccount.save();

    // Send verification email
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}&id=${newUser._id}`;

    const mailOptions = {
      from: `"ImmaCare+" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; line-height: 1.6; color: #333;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 30px;">
            <tr>
              <td>
                <h1 style="color: #4CAF50;">Welcome to ImmaCare+</h1>
                <p>Hi ${firstname},</p>
                <p>Thank you for registering with <strong>ImmaCare+</strong>. Please verify your email:</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                     Verify My Email
                  </a>
                </p>
                <p>If the button doesn't work, copy this link:</p>
                <p style="word-break: break-all; color: #555;">${verificationLink}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p>Best regards,<br><strong>The ImmaCare+ Team</strong></p>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.send({
      message: "User registered successfully. Please check your email to verify your account.",
      userId: newUser._id,
      accountId: newAccount._id
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send({ message: "Server error" });
  }
});

// Email Verification
app.get("/verify-email", async (req, res) => {
  try {
    const { token, id } = req.query;
    if (!token || !id) return res.send("<h3>Invalid verification link.</h3>");

    const account = await Account.findOne({ user_id: id, verification_token: token });
    if (!account) return res.send("<h3>Invalid token or user.</h3>");

    account.is_verified = 1;
    account.verification_token = null;
    await account.save();

    res.redirect("/login/login.html?verified=true");
  } catch (err) {
    console.error("Verification error:", err);
    res.send("<h3>Server error during email verification.</h3>");
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: "Logout failed" });
    }
    res.send({ message: "Logged out successfully" });
  });
});

// Homepage (Session Check)
app.get("/homepage", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send({ message: "Unauthorized: Please login" });
  }

  res.send({
    message: `Welcome user ${req.session.email}`,
    email: req.session.email,
    phone: req.session.phone,
    firstname: req.session.firstname,
    lastname: req.session.lastname,
    user_id: req.session.userId,
    middlename: req.session.middlename,
    gender: req.session.gender,
    birthdate: req.session.birthdate,
    age: req.session.age,
    role: req.session.role,
    user_id_id: req.session.user_id_id
  });
});

// ================== USER MANAGEMENT ROUTES ==================

// Get all users (for admin)
app.get("/users", async (req, res) => {
  try {
    const { role, fullname } = req.query;
    
    let filter = {};
    if (role) filter.role = role;
    if (fullname) {
      filter.$or = [
        { firstname: new RegExp(fullname, 'i') },
        { lastname: new RegExp(fullname, 'i') }
      ];
    }
    filter.role = { $ne: 'admin' };

    const users = await User.find(filter).select('firstname lastname role status _id');
    const result = [];

    for (let user of users) {
      const account = await Account.findOne({ user_id: user._id });
      result.push({
        user_id: user._id,
        role: user.role,
        fullname: `${user.firstname} ${user.lastname}`,
        status: user.status === 1 ? 'Active' : 'Inactive',
        username: account ? account.email : '',
        updated_date: account ? account.updated_date.toLocaleDateString('en-US') : ''
      });
    }

    res.json({ data: result });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// ================== APPOINTMENT BOOKING ROUTES ==================

// Book Appointment
app.post("/book-appointment", async (req, res) => {
  try {
    const {
      user_id, firstname, middlename, lastname, gender, birthdate, age,
      civil_status, mobile_number, email_address, home_address,
      emergency_name, emergency_relationship, emergency_mobile_number,
      bloodtype, allergies, current_medication, past_medical_condition,
      chronic_illness, consultation_type, booking_date, booking_time,
      status, doctor_id
    } = req.body;

    if (!firstname || !lastname || !gender || !birthdate || !age || !civil_status) {
      return res.status(400).send({ message: "Missing required patient info" });
    }

    // Check if patient exists
    let patient = await Patient.findOne({ user_id });

    if (patient) {
      // Update existing patient
      patient.firstname = firstname;
      patient.middlename = middlename;
      patient.lastname = lastname;
      patient.gender = gender;
      patient.birthdate = birthdate;
      patient.age = age;
      patient.civil_status = civil_status;
      patient.mobile_number = mobile_number;
      patient.email_address = email_address;
      patient.home_address = home_address;
      patient.emergency_name = emergency_name;
      patient.emergency_relationship = emergency_relationship;
      patient.emergency_mobile_number = emergency_mobile_number;
      patient.bloodtype = bloodtype;
      patient.allergies = allergies;
      patient.current_medication = current_medication;
      patient.past_medical_condition = past_medical_condition;
      patient.chronic_illness = chronic_illness;
      await patient.save();
    } else {
      // Create new patient
      patient = new Patient({
        user_id, firstname, middlename, lastname, gender, birthdate, age,
        civil_status, mobile_number, email_address, home_address,
        emergency_name, emergency_relationship, emergency_mobile_number,
        bloodtype, allergies, current_medication, past_medical_condition,
        chronic_illness
      });
      await patient.save();
    }

    // Create appointment
    const appointment = new Appointment({
      patient_id: patient._id,
      consultation_type,
      booking_date,
      booking_time,
      status: status || "Pending",
      doctor_id
    });
    await appointment.save();

    res.send({
      message: "Appointment booked successfully",
      appointment_id: appointment._id,
      patient_id: patient._id
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).send({ message: "Error saving booking" });
  }
});

// Get appointment list with search
app.get("/getBookingListSearch", async (req, res) => {
  try {
    const { booking_date, status, fullname, consultation_type, role, user_id } = req.query;

    let filter = {};
    if (booking_date) filter.booking_date = new Date(booking_date);
    if (status) filter.status = status;
    if (consultation_type) filter.consultation_type = consultation_type;

    const appointments = await Appointment.find(filter).populate('patient_id');
    
    let result = appointments.map(apt => {
      const patient = apt.patient_id;
      return {
        patient_id: patient._id,
        id: apt._id,
        consultation_type: apt.consultation_type,
        booking_date: apt.booking_date,
        booking_time: apt.booking_time,
        status: apt.status,
        queue_no: apt.queue_no,
        fullname: `${patient.firstname} ${patient.lastname}`,
        gender: patient.gender,
        age: patient.age,
        patient_user_id: patient.user_id
      };
    });

    // Filter by fullname
    if (fullname) {
      result = result.filter(r => r.fullname.toLowerCase().includes(fullname.toLowerCase()));
    }

    // Filter by role
    if (role === "patient" && user_id) {
      result = result.filter(r => r.patient_user_id && r.patient_user_id.toString() === user_id);
    }

    if (role === "doctor" && user_id) {
      result = result.filter(r => r.doctor_id && r.doctor_id.toString() === user_id && r.status === "In Queue");
    }

    res.json({ data: result });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// ================== DASHBOARD ROUTES ==================

// Get appointment count
app.get("/appointment-count", async (req, res) => {
  try {
    const count = await Appointment.countDocuments({ status: 'booked' });
    res.send({ message: "Count fetched successfully", total_booked: count });
  } catch (err) {
    console.error("Count error:", err);
    res.status(500).send({ message: "Database query failed" });
  }
});

// Get today's appointments
app.get("/appointment-count-today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await Appointment.countDocuments({
      status: 'booked',
      booking_date: { $gte: today, $lt: tomorrow }
    });

    res.send({ message: "Count fetched successfully", total_booked_today: count });
  } catch (err) {
    console.error("Count error:", err);
    res.status(500).send({ message: "Database query failed" });
  }
});

// Get overall patients count
app.get("/overall_patients", async (req, res) => {
  try {
    const count = await Patient.countDocuments();
    res.send({ message: "Count fetched successfully", patient_count: count });
  } catch (err) {
    console.error("Count error:", err);
    res.status(500).send({ message: "Database query failed" });
  }
});

// Get inventory count
app.get("/item-inventory-count", async (req, res) => {
  try {
    const count = await Inventory.countDocuments();
    res.send({ message: "Count fetched successfully", inventory_count: count });
  } catch (err) {
    console.error("Count error:", err);
    res.status(500).send({ message: "Database query failed" });
  }
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});