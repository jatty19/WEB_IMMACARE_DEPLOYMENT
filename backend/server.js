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

  // Set EJS as the template engine (if used)
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  // Static files (CSS, JS, images)
  app.use(express.static(path.join(__dirname, "public")));

  // Express session setup with better production settings
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );

  // MongoDB connection - UPDATED (remove deprecated options)
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ MONGODB_URI is not defined in your .env file.");
    process.exit(1);
  }

  mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

  // Example route
  app.get("/", (req, res) => {
    res.json({ 
      message: "🚀 ImmaCare+ Backend is running!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Health check route for Render
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "OK", 
      database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
      timestamp: new Date().toISOString()
    });
  });

  // Example email setup (optional)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Example route for sending email (optional test)
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
  app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));