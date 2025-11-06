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
const port = 5300;

// Middleware setup
app.use(cors({
  origin: 'http://localhost:5300',
  credentials: true
}));
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'immacareSecretKey123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// ✅ SERVE STATIC FILES - UPDATED FOR FRONTEND
app.use(express.static(path.join(__dirname, ".."))); // Root directory
app.use(express.static(path.join(__dirname, "../web_immacare")));
app.use(express.static(path.join(__dirname, "../login")));
app.use(express.static(path.join(__dirname, "../landing_page")));
app.use(express.static(path.join(__dirname, "../styless")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ SERVE DEPENDENCIES
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "../node_modules/bootstrap/dist"))
);
app.use(
  "/bootstrap-icons",
  express.static(path.join(__dirname, "../node_modules/bootstrap-icons"))
);
app.use(
  "/datatables.net",
  express.static(path.join(__dirname, "../node_modules/datatables.net"))
);
app.use(
  "/datatables.net-dt",
  express.static(path.join(__dirname, "../node_modules/datatables.net-dt"))
);
app.use("/jquery", express.static(path.join(__dirname, "../node_modules/jquery/dist")));

// Set EJS as the template engine (if used)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Express session setup with better production settings
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// MongoDB connection
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));

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
  res.sendFile(path.join(__dirname, "../web_immacare_deployment/main.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../login/login.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "../landing_page/landing.html"));
});

// Serve CSS files
app.get("/styles/:filename", (req, res) => {
  res.sendFile(path.join(__dirname, "../styless", req.params.filename));
});

// Serve any HTML page
app.get("/:page", (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, "..", `${page}.html`);
  
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // If HTML file doesn't exist, check if it's an API route
    res.status(404).json({ success: false, error: "Page not found" });
  }
});

// ✅ API ROUTES
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

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString()
  });
});

// LOGIN ENDPOINT
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Email and password are required" });
  }

  try {
    // Find account by email
    const account = await Account.findOne({ email, status: 1 }).populate('user_id');
    if (!account) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    // Check email verification
    if (account.is_verified === 0) {
      return res.status(403).send({ message: "Please verify your email before logging in" });
    }

    // Get user info
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

// REGISTER ENDPOINT
app.post("/register", async (req, res) => {
  const {
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    age,
    phone,
    email,
    password,
  } = req.body;

  if (!firstname || !lastname || !gender || !birthdate || !email || !password) {
    return res.status(400).send({ message: "All fields are required" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).send({ message: "Invalid email format" });
  }

  try {
    // Check if email already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).send({ message: "Email already in use" });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create user
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

      // Hash password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create account
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

      // Commit transaction
      await session.commitTransaction();

      // Send verification email
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
                  <p>Thank you for registering with <strong>ImmaCare+</strong>. Before you can start using your account, we need to verify your email address to ensure your account's security.</p>
                  <p>Please click the button below to verify your email and activate your account:</p>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}"
                       style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                       Verify My Email
                    </a>
                  </p>
                  <p>If the button above does not work, copy and paste the following link into your browser:</p>
                  <p style="word-break: break-all; color: #555;">${verificationLink}</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p>If you did not register for an ImmaCare+ account, you can safely ignore this email.</p>
                  <p>We are excited to have you on board and look forward to helping you manage your healthcare needs.</p>
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

// EMAIL VERIFICATION
app.get("/verify-email", async (req, res) => {
  try {
    const { token, id } = req.query;
    if (!token || !id) return res.send("<h3>Invalid verification link.</h3>");

    const account = await Account.findOne({ 
      user_id: id, 
      verification_token: token 
    });

    if (!account) return res.send("<h3>Invalid token or user.</h3>");

    // Mark user as verified
    account.is_verified = 1;
    account.verification_token = null;
    await account.save();

    // Redirect to login
    res.redirect("/login/login.html?verified=true");
  } catch (err) {
    console.error(err);
    res.send("<h3>Server error during email verification.</h3>");
  }
});

// HOMEPAGE SESSION
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

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: "Logout failed" });
    }
    res.send({ message: "Logged out successfully" });
  });
});

// ✅ ADD YOUR OTHER API ENDPOINTS HERE...
// (You can add the rest of your appointment, inventory, etc. endpoints)

// Example email sending endpoint
app.post("/send-email", async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message,
    });
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Demo endpoints for other functionality (add proper MongoDB implementations later)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().populate('user_id');
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/book-appointment", async (req, res) => {
  // Add your appointment booking logic here
  res.json({ message: "Appointment booking endpoint - implement MongoDB logic" });
});

app.get("/getBookingList", async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('patient_id');
    res.json({ data: appointments });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
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
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}/`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});