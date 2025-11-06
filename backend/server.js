// Load environment variables
require("dotenv").config();

// Import dependencies
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");

// Initialize Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// ✅ SERVE STATIC FILES - FRONTEND
app.use(express.static(path.join(__dirname, "..")));
app.use(express.static(path.join(__dirname, "../web_immacare")));
app.use(express.static(path.join(__dirname, "../login")));
app.use(express.static(path.join(__dirname, "../landing_page")));
app.use(express.static(path.join(__dirname, "../styless")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ SERVE DEPENDENCIES
app.use("/bootstrap", express.static(path.join(__dirname, "../node_modules/bootstrap/dist")));
app.use("/bootstrap-icons", express.static(path.join(__dirname, "../node_modules/bootstrap-icons")));
app.use("/datatables.net", express.static(path.join(__dirname, "../node_modules/datatables.net")));
app.use("/datatables.net-dt", express.static(path.join(__dirname, "../node_modules/datatables.net-dt")));
app.use("/jquery", express.static(path.join(__dirname, "../node_modules/jquery/dist")));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ MONGODB_URI is not defined in your .env file.");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ MONGODB SCHEMAS
const userSchema = new mongoose.Schema({
  firstname: String,
  middlename: String,
  lastname: String,
  gender: String,
  birthdate: Date,
  age: Number,
  role: { type: String, default: 'patient' },
  status: { type: Number, default: 1 }
}, { timestamps: true });

const accountSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: String,
  email: { type: String, unique: true },
  password: String,
  status: { type: Number, default: 1 },
  verification_token: String,
  is_verified: { type: Number, default: 0 }
}, { timestamps: true });

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
}, { timestamps: true });

const appointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  consultation_type: String,
  booking_date: Date,
  booking_time: String,
  status: { type: String, default: 'Pending' },
  queue_no: String,
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const doctorProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  specialty: String,
  department: String,
  years_of_experience: Number,
  professional_board: String,
  certificate: String,
  status: String
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  item: String,
  category: String,
  quantity: Number,
  average_quantity: Number,
  price: Number,
  status: String
}, { timestamps: true });

const doctorRecommendationSchema = new mongoose.Schema({
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  recommendation: String,
  follow_up_required: Boolean,
  prescription_given: Boolean,
  prescription: String
}, { timestamps: true });

// Create models
const User = mongoose.model('User', userSchema);
const Account = mongoose.model('Account', accountSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const DoctorRecommendation = mongoose.model('DoctorRecommendation', doctorRecommendationSchema);

// ✅ FRONTEND ROUTES
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../web_immacare/main.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../login/login.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "../landing_page/landing.html"));
});

app.get("/styles/:filename", (req, res) => {
  res.sendFile(path.join(__dirname, "../styless", req.params.filename));
});

// ✅ API CONSTANTS
const saltRounds = 10;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "bernejojoshua@gmail.com",
    pass: process.env.EMAIL_PASS || "vzas gazb vjco czpv",
  },
});

// ✅ AUTHENTICATION ROUTES

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString()
  });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Email and password are required" });
  }

  try {
    const account = await Account.findOne({ email, status: 1 }).populate('user_id');
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
    if (!user) {
      return res.status(401).send({ message: "User not found" });
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
    res.status(500).send({ message: "Database error" });
  }
});

// Register
app.post("/register", async (req, res) => {
  const { firstname, middlename, lastname, gender, birthdate, age, phone, email, password } = req.body;

  if (!firstname || !lastname || !gender || !birthdate || !email || !password) {
    return res.status(400).send({ message: "All fields are required" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).send({ message: "Invalid email format" });
  }

  try {
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).send({ message: "Email already in use" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = new User({
        firstname,
        middlename: middlename || null,
        lastname,
        gender,
        birthdate,
        age,
        role: 'patient',
        status: 1
      });
      await user.save({ session });

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const account = new Account({
        user_id: user._id,
        phone,
        email,
        password: hashedPassword,
        status: 1,
        verification_token: verificationToken,
        is_verified: 0
      });
      await account.save({ session });

      await session.commitTransaction();

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://web-immacare-deployment-6.onrender.com' 
        : 'http://localhost:3000';
      
      const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}&id=${user._id}`;
      
      const mailOptions = {
        from: '"ImmaCare+" <your-email@gmail.com>',
        to: email,
        subject: "Email Verification",
        html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"><title>Email Verification</title></head>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; line-height: 1.6; color: #333;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 30px;">
              <tr><td>
                <h1 style="color: #4CAF50;">Welcome to ImmaCare+</h1>
                <p>Hi ${firstname},</p>
                <p>Thank you for registering with <strong>ImmaCare+</strong>. Before you can start using your account, we need to verify your email address to ensure your account's security.</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Verify My Email</a>
                </p>
                <p>If the button above does not work, copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; color: #555;">${verificationLink}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p>If you did not register for an ImmaCare+ account, you can safely ignore this email.</p>
                <p>We are excited to have you on board and look forward to helping you manage your healthcare needs.</p>
                <p>Best regards,<br><strong>The ImmaCare+ Team</strong></p>
              </td></tr>
            </table>
          </body>
        </html>`
      };

      await transporter.sendMail(mailOptions);

      res.send({
        message: "User registered successfully. Please check your email to verify your account.",
        userId: user._id,
        accountId: account._id,
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send({ message: "Registration failed" });
  }
});

// Email verification
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
    console.error(err);
    res.send("<h3>Server error during email verification.</h3>");
  }
});

// Homepage session
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

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: "Logout failed" });
    }
    res.send({ message: "Logged out successfully" });
  });
});

// ✅ USER MANAGEMENT ROUTES

// Get all users
app.get("/users", async (req, res) => {
  const { role, fullname } = req.query;

  try {
    let query = { role: { $ne: 'admin' } };
    
    if (role) query.role = role;
    if (fullname) {
      query.$or = [
        { firstname: { $regex: fullname, $options: 'i' } },
        { lastname: { $regex: fullname, $options: 'i' } },
        { middlename: { $regex: fullname, $options: 'i' } }
      ];
    }

    const users = await User.find(query).populate({
      path: 'user_id',
      model: 'Account',
      select: 'email status updated_date'
    });

    const formattedUsers = users.map(user => ({
      user_id: user._id,
      role: user.role,
      fullname: `${user.firstname} ${user.lastname}`,
      status: user.user_id?.status === 1 ? 'Active' : 'Inactive',
      username: user.user_id?.email,
      updated_date: user.user_id?.updated_date
    }));

    res.json({ data: formattedUsers });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Get user by ID
app.get("/users_update/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).populate({
      path: 'user_id',
      model: 'Account',
      select: 'email status updated_date'
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: [{
      user_id: user._id,
      fullname: `${user.firstname} ${user.lastname}`,
      firstname: user.firstname,
      middlename: user.middlename,
      lastname: user.lastname,
      birthdate: user.birthdate,
      gender: user.gender,
      role: user.role,
      username: user.user_id?.email,
      status: user.user_id?.status === 1 ? 'Active' : 'Inactive',
      updated_date: user.user_id?.updated_date
    }]});
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Update user account
app.post("/updateUserAccount", async (req, res) => {
  const { user_id, email, password, status } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    await Account.findOneAndUpdate(
      { user_id: user_id },
      { 
        email, 
        password: hashedPassword, 
        status,
        updated_date: new Date()
      }
    );

    res.json({ message: "User account updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// ✅ APPOINTMENT ROUTES

// Book appointment
app.post("/book-appointment", async (req, res) => {
  const {
    user_id,
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    age,
    civil_status,
    mobile_number,
    email_address,
    home_address,
    emergency_name,
    emergency_relationship,
    emergency_mobile_number,
    bloodtype,
    allergies,
    current_medication,
    past_medical_condition,
    chronic_illness,
    consultation_type,
    booking_date,
    booking_time,
    status,
    doctor_id,
  } = req.body;

  if (!firstname || !lastname || !gender || !birthdate || !age || !civil_status) {
    return res.status(400).send({ message: "Missing required patient info" });
  }

  try {
    // Check if patient exists
    let patient = await Patient.findOne({ user_id: user_id });
    
    if (patient) {
      // Update existing patient
      patient = await Patient.findOneAndUpdate(
        { user_id: user_id },
        {
          firstname, middlename, lastname, gender, birthdate, age, civil_status,
          mobile_number, email_address, home_address, emergency_name, emergency_relationship,
          emergency_mobile_number, bloodtype, allergies, current_medication,
          past_medical_condition, chronic_illness
        },
        { new: true }
      );
    } else {
      // Create new patient
      patient = new Patient({
        user_id,
        firstname, middlename, lastname, gender, birthdate, age, civil_status,
        mobile_number, email_address, home_address, emergency_name, emergency_relationship,
        emergency_mobile_number, bloodtype, allergies, current_medication,
        past_medical_condition, chronic_illness
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
      patient_id: patient._id,
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).send({ message: "Error saving booking" });
  }
});

// Get booking list
app.get("/getBookingList", async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('patient_id');
    const formattedAppointments = appointments.map(apt => ({
      patient_id: apt.patient_id?._id,
      id: apt._id,
      consultation_type: apt.consultation_type,
      booking_date: apt.booking_date,
      booking_time: apt.booking_time,
      status: apt.status,
      queue_no: apt.queue_no,
      fullname: `${apt.patient_id?.firstname || ''} ${apt.patient_id?.lastname || ''}`.trim(),
      gender: apt.patient_id?.gender,
      age: apt.patient_id?.age
    }));

    res.json({ data: formattedAppointments });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Get booking by ID
app.get("/getBookingListById/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const appointment = await Appointment.findById(id).populate('patient_id');
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ data: [{
      patient_id: appointment.patient_id?._id,
      id: appointment._id,
      consultation_type: appointment.consultation_type,
      booking_date: appointment.booking_date,
      booking_time: appointment.booking_time,
      status: appointment.status,
      queue_no: appointment.queue_no,
      fullname: `${appointment.patient_id?.firstname || ''} ${appointment.patient_id?.lastname || ''}`.trim(),
      gender: appointment.patient_id?.gender,
      age: appointment.patient_id?.age
    }]});
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Generate queue number
app.post("/generateQueueNumber/:id", async (req, res) => {
  const bookingId = req.params.id;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get latest queue number for today
    const latestAppointment = await Appointment.findOne({
      updated_date: { $gte: today },
      queue_no: { $regex: /^[0-9]+$/ }
    }).sort({ queue_no: -1 });

    let newQueueNo;
    if (!latestAppointment || !latestAppointment.queue_no) {
      newQueueNo = "001";
    } else {
      const latest = parseInt(latestAppointment.queue_no);
      newQueueNo = (latest + 1).toString().padStart(3, "0");
    }

    await Appointment.findByIdAndUpdate(bookingId, {
      queue_no: newQueueNo,
      status: 'In Queue',
      updated_date: new Date()
    });

    res.json({
      message: "Queue number generated successfully",
      queue_no: newQueueNo,
    });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Search bookings
app.get("/getBookingListSearch", async (req, res) => {
  const { booking_date, status, fullname, consultation_type, role, user_id } = req.query;

  try {
    let query = {};

    if (booking_date) query.booking_date = new Date(booking_date);
    if (status) query.status = status;
    if (consultation_type) query.consultation_type = consultation_type;

    let appointments = await Appointment.find(query).populate('patient_id');

    // Filter by patient name
    if (fullname) {
      appointments = appointments.filter(apt => 
        `${apt.patient_id?.firstname || ''} ${apt.patient_id?.lastname || ''}`
          .toLowerCase().includes(fullname.toLowerCase())
      );
    }

    // Filter by role
    if (role === "patient" && user_id) {
      appointments = appointments.filter(apt => 
        apt.patient_id?.user_id?.toString() === user_id
      );
    }

    if (role === "doctor" && user_id) {
      appointments = appointments.filter(apt => 
        apt.doctor_id?.toString() === user_id && apt.status === "In Queue"
      );
    }

    const formattedAppointments = appointments.map(apt => ({
      patient_id: apt.patient_id?._id,
      id: apt._id,
      consultation_type: apt.consultation_type,
      booking_date: apt.booking_date,
      booking_time: apt.booking_time,
      status: apt.status,
      queue_no: apt.queue_no,
      fullname: `${apt.patient_id?.firstname || ''} ${apt.patient_id?.lastname || ''}`.trim(),
      gender: apt.patient_id?.gender,
      age: apt.patient_id?.age,
      patient_user_id: apt.patient_id?.user_id
    }));

    res.json({ data: formattedAppointments });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err });
  }
});

// ✅ INVENTORY ROUTES

// Save inventory item
app.post("/saveInventoryItem", async (req, res) => {
  const { addItem, addCategory, addQuantity, addMinimum, addPrice } = req.body;

  try {
    const existingItem = await Inventory.findOne({ 
      item: { $regex: new RegExp(`^${addItem}$`, 'i') } 
    });
    
    if (existingItem) {
      return res.status(400).json({ message: "Item already listed" });
    }

    let status = 'in stock';
    if (addQuantity == 0) status = 'out of stock';
    else if (addQuantity < addMinimum) status = 'for reorder';

    const inventory = new Inventory({
      item: addItem,
      category: addCategory,
      quantity: addQuantity,
      average_quantity: addMinimum,
      price: addPrice,
      status
    });
    await inventory.save();

    res.json({ message: "Inventory item added successfully" });
  } catch (err) {
    console.error("Inventory error:", err);
    res.status(500).json({ message: "Insert failed" });
  }
});

// Get inventory
app.get("/getInventory", async (req, res) => {
  const { item, status } = req.query;

  try {
    let query = {};
    if (item) {
      query.$or = [
        { item: { $regex: item, $options: 'i' } },
        { category: { $regex: item, $options: 'i' } }
      ];
    }
    if (status) query.status = status;

    const inventory = await Inventory.find(query);
    res.json({ data: inventory });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Get inventory by ID
app.get("/getItemInventoryByID/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ data: [item] });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Update inventory
app.post("/updateInventory", async (req, res) => {
  const { id, updateItemName, updateCategory, updateQuantity, updateMinimum, updatePrice } = req.body;

  try {
    let status = 'in stock';
    if (updateQuantity == 0) status = 'out of stock';
    else if (updateQuantity < updateMinimum) status = 'for reorder';

    await Inventory.findByIdAndUpdate(id, {
      item: updateItemName,
      category: updateCategory,
      quantity: updateQuantity,
      average_quantity: updateMinimum,
      price: updatePrice,
      status
    });

    res.json({ message: "Inventory updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Inventory update failed" });
  }
});

// ✅ DASHBOARD ROUTES

// Appointment count
app.get("/appointment-count", async (req, res) => {
  try {
    const count = await Appointment.countDocuments({ status: 'booked' });
    res.send({ message: "Count fetched successfully", total_booked: count });
  } catch (err) {
    res.status(500).send({ message: "Database query failed" });
  }
});

// Today's appointments
app.get("/appointment-count-today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await Appointment.countDocuments({ 
      status: 'booked', 
      booking_date: { $gte: today } 
    });
    res.send({ message: "Count fetched successfully", total_booked_today: count });
  } catch (err) {
    res.status(500).send({ message: "Database query failed" });
  }
});

// Overall patients
app.get("/overall_patients", async (req, res) => {
  try {
    const count = await Patient.countDocuments();
    res.send({ message: "Count fetched successfully", patient_count: count });
  } catch (err) {
    res.status(500).send({ message: "Database query failed" });
  }
});

// Inventory count
app.get("/item-inventory-count", async (req, res) => {
  try {
    const count = await Inventory.countDocuments();
    res.send({ message: "Count fetched successfully", inventory_count: count });
  } catch (err) {
    res.status(500).send({ message: "Database query failed" });
  }
});

// Inventory total value
app.get("/getInventoryTotal", async (req, res) => {
  try {
    const inventory = await Inventory.find();
    const inventoryWithTotal = inventory.map(item => ({
      ...item.toObject(),
      total: item.quantity * item.price
    }));
    res.json({ data: inventoryWithTotal });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ ADDITIONAL ROUTES

// Get patients list
app.get("/getPatientsList", async (req, res) => {
  const { fullname, emailAddress, user_id, role } = req.query;

  try {
    let query = {};
    
    if (fullname) {
      query.$or = [
        { firstname: { $regex: fullname, $options: 'i' } },
        { lastname: { $regex: fullname, $options: 'i' } },
        { middlename: { $regex: fullname, $options: 'i' } }
      ];
    }
    if (emailAddress) query.email_address = { $regex: emailAddress, $options: 'i' };
    if (role === "patient" && user_id) query.user_id = user_id;

    const patients = await Patient.find(query);
    const formattedPatients = patients.map(patient => ({
      id: patient._id,
      fullname: `${patient.firstname} ${patient.lastname}`,
      gender: patient.gender,
      age: patient.age,
      mobile_number: patient.mobile_number,
      email_address: patient.email_address,
      user_id: patient.user_id
    }));

    res.json({ data: formattedPatients });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err });
  }
});

// Get doctors list
app.get("/getDoctorsList", async (req, res) => {
  const { doctorName, specialtyId } = req.query;

  try {
    let userQuery = { role: 'doctor' };
    if (doctorName) {
      userQuery.$or = [
        { firstname: { $regex: doctorName, $options: 'i' } },
        { lastname: { $regex: doctorName, $options: 'i' } }
      ];
    }

    const doctors = await User.find(userQuery).populate('user_id').populate({
      path: '_id',
      model: 'DoctorProfile',
      match: specialtyId ? { specialty: specialtyId } : {}
    });

    const formattedDoctors = doctors.filter(doc => doc._id).map(doc => ({
      fullname: `${doc.firstname} ${doc.lastname}`,
      specialty: doc._id?.specialty,
      email: doc.user_id?.email,
      status: doc._id?.status,
      id: doc._id
    }));

    res.json({ data: formattedDoctors });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err });
  }
});

// Reschedule booking
app.post("/reschedBooking", async (req, res) => {
  const { booking_id, formattedDate, newBookingTime } = req.body;

  try {
    await Appointment.findByIdAndUpdate(booking_id, {
      booking_date: formattedDate,
      booking_time: newBookingTime
    });

    res.json({ message: "Booking updated successfully" });
  } catch (err) {
    console.error("Booking update error:", err);
    res.status(500).json({ message: "Booking update failed" });
  }
});

// Cancel booking
app.post("/cancelBooking", async (req, res) => {
  const { booking_id, tag } = req.body;

  try {
    await Appointment.findByIdAndUpdate(booking_id, { status: tag });
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    console.error("Booking cancellation error:", err);
    res.status(500).json({ message: "Booking cancellation failed" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Server listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ImmaCare+ Server is running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}/`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});