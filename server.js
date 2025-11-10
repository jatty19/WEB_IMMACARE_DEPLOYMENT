const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { ObjectId } = mongoose.Types;

const app = express();

// --- Middleware Setup ---
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Static File Serving ---
app.use(express.static(path.join(__dirname, "web_immacare")));
app.use(express.static(path.join(__dirname, "public")));
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.use("/bootstrap-icons", express.static(path.join(__dirname, "node_modules/bootstrap-icons")));
app.use("/datatables.net", express.static(path.join(__dirname, "node_modules/datatables.net")));
app.use("/datatables.net-dt", express.static(path.join(__dirname, "node_modules/datatables.net-dt")));
app.use("/jquery", express.static(path.join(__dirname, "node_modules/jquery/dist")));

// --- Session Management ---
app.use(
  session({
    secret: "your-strong-and-secret-key-for-immacare-sessions",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: false // Set to true if using HTTPS
    },
  })
);

// --- MongoDB Connection ---
const MONGO_URI = "mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB database."))
  .catch((err) => console.error("MongoDB connection failed: ", err));

// --- Mongoose Schemas and Models ---

// Schema for the 'users_info' collection (Core user profile)
const UserInfoSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    middlename: { type: String },
    lastname: { type: String, required: true },
    gender: { type: String },
    birthdate: { type: Date },
    age: { type: Number },
    role: { type: String, enum: ['patient', 'doctor', 'staff', 'admin'], default: 'patient' },
    status: { type: Number, default: 1 },
}, { timestamps: true, collection: 'users_info' });
const UserInfo = mongoose.model('UserInfo', UserInfoSchema);

// Schema for the 'account_info' collection (Credentials)
const AccountInfoSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true, unique: true },
    phone: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    status: { type: Number, default: 1 },
    is_verified: { type: Number, default: 0 },
    verification_token: { type: String },
    token: { type: String }
}, { timestamps: true, collection: 'account_info' });
const AccountInfo = mongoose.model('AccountInfo', AccountInfoSchema);

// Schema for 'doctors_profile'
const DoctorProfileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true, unique: true },
    specialty: { type: String }, // Storing specialty ID from dropdown
    department: { type: String },
    years_of_experience: { type: Number },
    professional_board: { type: String },
    certificate: { type: String },
    status: { type: String, default: 'Active' },
}, { timestamps: true, collection: 'doctors_profile' });
const DoctorProfile = mongoose.model('DoctorProfile', DoctorProfileSchema);

// Schema for 'patient_info'
const PatientInfoSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo', required: true, unique: true },
    firstname: String, middlename: String, lastname: String, gender: String, birthdate: Date, age: Number,
    civil_status: String, mobile_number: String, email_address: String, home_address: String,
    emergency_name: String, emergency_relationship: String, emergency_mobile_number: String,
    bloodtype: String, allergies: String, current_medication: String, past_medical_condition: String, chronic_illness: String,
}, { timestamps: true, collection: 'patient_info' });
const PatientInfo = mongoose.model('PatientInfo', PatientInfoSchema);

// Schema for 'appointment_booking'
const AppointmentBookingSchema = new mongoose.Schema({
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientInfo', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' }, // References the doctor's profile in users_info
    consultation_type: String, booking_date: String, booking_time: String,
    status: { type: String, default: 'Pending' },
    queue_no: String,
}, { timestamps: true, collection: 'appointment_booking' });
const AppointmentBooking = mongoose.model('AppointmentBooking', AppointmentBookingSchema);

// Other schemas (Inventory, Recommendations, etc.)
const InventoryCategorySchema = new mongoose.Schema({ category: { type: String, required: true, unique: true } }, { collection: 'inventory_category' });
const InventoryCategory = mongoose.model('InventoryCategory', InventoryCategorySchema);
const InventorySchema = new mongoose.Schema({ item: { type: String, required: true }, category: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryCategory', required: true }, quantity: { type: Number, default: 0 }, average_quantity: { type: Number, default: 0 }, price: { type: Number, default: 0 }, status: { type: String, default: 'in stock' } }, { timestamps: true, collection: 'inventory' });
const Inventory = mongoose.model('Inventory', InventorySchema);
const DoctorRecommendationSchema = new mongoose.Schema({ appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentBooking', required: true }, recommendation: { type: String, required: true }, follow_up_required: { type: Boolean, default: false }, prescription_given: { type: Boolean, default: false }, prescription: String }, { timestamps: true, collection: 'doctor_recommendations' });
const DoctorRecommendation = mongoose.model('DoctorRecommendation', DoctorRecommendationSchema);

// --- Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "bernejojoshua@gmail.com",
        pass: "vzas gazb vjco czpv",
    },
});

// --- Routes ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "main.html")));
app.get("/landing", (req, res) => res.sendFile(path.join(__dirname, "landing_page", "landing.html")));

// =================================================================
// --- AUTHENTICATION & REGISTRATION API ENDPOINTS ---
// =================================================================

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    try {
        const account = await AccountInfo.findOne({ email: email.toLowerCase() });
        if (!account) return res.status(401).json({ message: "Invalid credentials" });
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
        if (account.status !== 1) return res.status(403).json({ message: "Your account is currently inactive." });
        if (account.is_verified !== 1) return res.status(403).json({ message: "Please verify your email before logging in" });
        const userProfile = await UserInfo.findById(account.user_id);
        if (!userProfile) {
            console.error(`Data integrity error: Account found for ${email} but no matching user profile.`);
            return res.status(500).json({ message: "Server error: Cannot find user profile." });
        }
        req.session.userId = userProfile._id;
        req.session.email = account.email;
        req.session.phone = account.phone;
        req.session.firstname = userProfile.firstname;
        req.session.lastname = userProfile.lastname;
        req.session.middlename = userProfile.middlename;
        req.session.gender = userProfile.gender;
        req.session.birthdate = userProfile.birthdate;
        req.session.age = userProfile.age;
        req.session.role = userProfile.role;
        res.status(200).json({ message: "Login successful", user: { id: userProfile._id, email: account.email, phone: account.phone, firstname: userProfile.firstname, lastname: userProfile.lastname, middlename: userProfile.middlename, gender: userProfile.gender, birthdate: userProfile.birthdate, age: userProfile.age, role: userProfile.role } });
    } catch (err) {
        console.error("Login server error:", err);
        res.status(500).json({ message: "A server error occurred during login" });
    }
});

app.post("/register", async (req, res) => {
    const { firstname, middlename, lastname, gender, birthdate, age, phone, email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!firstname || !lastname || !gender || !birthdate || !email || !password) return res.status(400).json({ message: "All required fields must be filled" });
    if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const existingAccount = await AccountInfo.findOne({ email: email.toLowerCase() }).session(session);
        if (existingAccount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ message: "Email is already in use" });
        }
        const newUserProfile = new UserInfo({ firstname, middlename: middlename || null, lastname, gender, birthdate: new Date(birthdate), age, role: 'patient', status: 1 });
        const savedUserProfile = await newUserProfile.save({ session });
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const newAccountInfo = new AccountInfo({ user_id: savedUserProfile._id, phone, email: email.toLowerCase(), password: hashedPassword, verification_token: verificationToken, is_verified: 0, status: 1 });
        await newAccountInfo.save({ session });
        await session.commitTransaction();
        session.endSession();
        const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
        const mailOptions = { from: '"ImmaCare+" <bernejojoshua@gmail.com>', to: email, subject: "Email Verification for ImmaCare+", html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Welcome to ImmaCare+</h2><p>Hi ${firstname},</p><p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p><a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify My Email</a><p>If the button doesn't work, copy and paste this link into your browser:</p><p>${verificationLink}</p><p>Best regards,<br>The ImmaCare+ Team</p></div>` };
        await transporter.sendMail(mailOptions);
        res.status(201).json({ message: "User registered successfully. Please check your email to verify.", userId: savedUserProfile._id });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Registration error:", err);
        res.status(500).json({ message: "Server error during registration" });
    }
});

app.get("/verify-email", async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send("<h3>Invalid verification link.</h3>");
        const account = await AccountInfo.findOneAndUpdate({ verification_token: token }, { $set: { is_verified: 1, verification_token: null } });
        if (!account) return res.status(400).send("<h3>Verification link is invalid or has already been used.</h3>");
        res.redirect("/login/login.html?verified=true");
    } catch (err) {
        console.error("Email verification error:", err);
        res.status(500).send("<h3>A server error occurred during email verification.</h3>");
    }
});

app.get("/homepage", (req, res) => {
    if (!req.session.userId) return res.status(401).send({ message: "Unauthorized: Please login" });
    res.send({ message: `Welcome ${req.session.email}`, email: req.session.email, phone: req.session.phone, firstname: req.session.firstname, lastname: req.session.lastname, user_id: req.session.userId, middlename: req.session.middlename, gender: req.session.gender, birthdate: req.session.birthdate, age: req.session.age, role: req.session.role, user_id_id: req.session.userId });
});

app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send({ message: "Logout failed" });
        res.clearCookie('connect.sid');
        res.send({ message: "Logged out successfully" });
    });
});

// =================================================================
// --- USER MANAGEMENT API ENDPOINTS (Admin) ---
// =================================================================

app.get("/users", async (req, res) => {
    const { role, fullname } = req.query;
    try {
        let userFilter = { role: { $ne: 'admin' } };
        if (role) userFilter.role = role;
        if (fullname) {
            const regex = new RegExp(fullname, 'i');
            userFilter.$or = [{ firstname: regex }, { lastname: regex }, { $expr: { $regexMatch: { input: { $concat: ["$firstname", " ", "$lastname"] }, regex: fullname, options: "i" } } }];
        }
        const users = await UserInfo.find(userFilter).sort({ createdAt: -1 });
        const accounts = await AccountInfo.find({ user_id: { $in: users.map(u => u._id) } });
        const accountsMap = new Map(accounts.map(acc => [acc.user_id.toString(), acc]));
        const formattedUsers = users.map(u => {
            const account = accountsMap.get(u._id.toString());
            return {
                user_id: u._id, role: u.role, fullname: `${u.firstname} ${u.lastname}`,
                status: account ? (account.status === 1 ? 'Active' : 'Inactive') : 'N/A',
                username: account ? account.email : 'N/A',
                updated_date: u.updatedAt ? u.updatedAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'
            };
        });
        res.json({ data: formattedUsers });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.get("/users_update/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid User ID" });
    try {
        const user = await UserInfo.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        const account = await AccountInfo.findOne({ user_id: req.params.id });
        const formattedUser = {
            user_id: user._id, fullname: `${user.firstname} ${user.lastname}`, firstname: user.firstname,
            middlename: user.middlename, lastname: user.lastname,
            birthdate: user.birthdate ? new Date(user.birthdate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
            gender: user.gender, role: user.role, username: account ? account.email : '', status: account ? (account.status === 1 ? 'Active' : 'Inactive') : ''
        };
        res.json({ data: [formattedUser] });
    } catch (err) {
        console.error("Error fetching user for update:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.post("/updateUserAccount", async (req, res) => {
    const { user_id, email, password, status } = req.body;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "Invalid User ID" });
    try {
        const updateData = { email: email.toLowerCase(), status: status === 'Active' ? 1 : 0 };
        if (password) updateData.password = await bcrypt.hash(password, 10);
        const updatedAccount = await AccountInfo.findOneAndUpdate({ user_id }, updateData, { new: true });
        if (!updatedAccount) return res.status(404).json({ message: "User account not found" });
        res.json({ message: "User account updated successfully" });
    } catch (err) {
        console.error("Update user error:", err);
        if (err.code === 11000) return res.status(409).json({ message: "Email is already in use by another account." });
        res.status(500).json({ message: "Update failed" });
    }
});

app.post("/createAccount", async (req, res) => {
    const { firstname, middlename, lastname, gender, birthdate, email, password, role, status } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const existingAccount = await AccountInfo.findOne({ email: email.toLowerCase() }).session(session);
        if (existingAccount) {
            await session.abortTransaction(); session.endSession();
            return res.status(409).send({ message: "Email already in use" });
        }
        const newUserInfo = new UserInfo({ firstname, middlename: middlename || null, lastname, gender, birthdate: new Date(birthdate), role, status: 1 });
        const savedUserInfo = await newUserInfo.save({ session });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAccount = new AccountInfo({ user_id: savedUserInfo._id, email: email.toLowerCase(), password: hashedPassword, status: status === 'Active' ? 1 : 0, is_verified: 1 });
        await newAccount.save({ session });
        if (role.toLowerCase() === 'doctor') {
            const newDoctorProfile = new DoctorProfile({ user_id: savedUserInfo._id });
            await newDoctorProfile.save({ session });
        }
        await session.commitTransaction();
        session.endSession();
        res.status(201).send({ message: "User created successfully", userId: savedUserInfo._id });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Create account error:", err);
        res.status(500).send({ message: "Error creating account" });
    }
});

// =================================================================
// --- APPOINTMENT & BOOKING API ENDPOINTS ---
// =================================================================

app.post("/book-appointment", async (req, res) => {
    const { user_id, doctor_id, consultation_type, booking_date, booking_time, status, ...patientData } = req.body;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).send({ message: "Invalid user ID" });
    if (doctor_id && !mongoose.isValidObjectId(doctor_id)) return res.status(400).send({ message: "Invalid doctor ID" });
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const patientDetails = { user_id, firstname: patientData.firstname, middlename: patientData.middlename, lastname: patientData.lastname, gender: patientData.gender, birthdate: new Date(patientData.birthdate), age: patientData.age, civil_status: patientData.civil_status, mobile_number: patientData.mobile_number, email_address: patientData.email_address, home_address: patientData.home_address, emergency_name: patientData.emergency_name, emergency_relationship: patientData.emergency_relationship, emergency_mobile_number: patientData.emergency_mobile_number, bloodtype: patientData.bloodtype, allergies: patientData.allergies, current_medication: patientData.current_medication, past_medical_condition: patientData.past_medical_condition, chronic_illness: patientData.chronic_illness };
        let patientInfo = await PatientInfo.findOneAndUpdate({ user_id }, { $set: patientDetails }, { new: true, upsert: true, session });
        const newBooking = new AppointmentBooking({ patient_id: patientInfo._id, consultation_type, booking_date, booking_time, status: status || "Booked", doctor_id: doctor_id || null });
        const savedBooking = await newBooking.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.send({ message: "Appointment booked successfully", appointment_id: savedBooking._id, patient_id: patientInfo._id });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error booking appointment:", err);
        res.status(500).send({ message: "Error saving booking" });
    }
});

app.get("/getBookingListSearch", async (req, res) => {
    const { booking_date, status, fullname, consultation_type, role, user_id } = req.query;
    try {
        let pipeline = [], matchStage = {}, postLookupMatch = {};
        if (booking_date) matchStage.booking_date = booking_date;
        if (status) matchStage.status = status;
        if (consultation_type) matchStage.consultation_type = consultation_type;
        if (role === 'doctor' && user_id && mongoose.isValidObjectId(user_id)) {
            matchStage.doctor_id = new ObjectId(user_id);
            matchStage.status = 'In Queue';
        }
        if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });
        pipeline.push({ $lookup: { from: 'patient_info', localField: 'patient_id', foreignField: '_id', as: 'patientDetails' } }, { $unwind: '$patientDetails' });
        if (fullname) {
            const regex = new RegExp(fullname, 'i');
            postLookupMatch.$or = [{ 'patientDetails.firstname': regex }, { 'patientDetails.lastname': regex }, { $expr: { $regexMatch: { input: { $concat: ["$patientDetails.firstname", " ", "$patientDetails.lastname"] }, regex: fullname, options: "i" } } }];
        }
        if (role === 'patient' && user_id && mongoose.isValidObjectId(user_id)) postLookupMatch['patientDetails.user_id'] = new ObjectId(user_id);
        if (Object.keys(postLookupMatch).length > 0) pipeline.push({ $match: postLookupMatch });
        pipeline.push({ $project: { _id: 0, id: '$_id', patient_id: '$patientDetails._id', consultation_type: 1, booking_date: 1, booking_time: 1, status: 1, queue_no: 1, fullname: { $concat: ['$patientDetails.firstname', ' ', '$patientDetails.lastname'] }, gender: '$patientDetails.gender', age: '$patientDetails.age', patient_user_id: '$patientDetails.user_id' } });
        const results = await AppointmentBooking.aggregate(pipeline);
        res.json({ data: results });
    } catch (err) {
        console.error("Error searching bookings:", err);
        res.status(500).json({ message: "Database error", error: err.toString() });
    }
});

app.get("/getBookingListById/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid Booking ID" });
    try {
        const booking = await AppointmentBooking.findById(req.params.id).populate({ path: 'patient_id', select: 'firstname lastname gender age' });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        const result = { id: booking._id, patient_id: booking.patient_id._id, consultation_type: booking.consultation_type, booking_date: booking.booking_date, booking_time: booking.booking_time, status: booking.status, queue_no: booking.queue_no, fullname: `${booking.patient_id.firstname} ${booking.patient_id.lastname}`, gender: booking.patient_id.gender, age: booking.patient_id.age };
        res.json({ data: [result] });
    } catch (err) {
        console.error("Error fetching booking by ID:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.post("/generateQueueNumber/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid Booking ID" });
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const latestBooking = await AppointmentBooking.findOne({ updatedAt: { $gte: today }, queue_no: { $ne: null } }).sort({ queue_no: -1 });
        let newQueueNo = "001";
        if (latestBooking && latestBooking.queue_no) newQueueNo = (parseInt(latestBooking.queue_no, 10) + 1).toString().padStart(3, "0");
        const updatedBooking = await AppointmentBooking.findByIdAndUpdate(req.params.id, { $set: { queue_no: newQueueNo, status: 'In Queue' } }, { new: true });
        if (!updatedBooking) return res.status(404).json({ message: "Booking not found" });
        res.json({ message: "Queue number generated successfully", queue_no: newQueueNo });
    } catch (err) {
        console.error("Queue generation error:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.post("/reschedBooking", async (req, res) => {
    const { booking_id, formattedDate, newBookingTime } = req.body;
    if (!mongoose.isValidObjectId(booking_id)) return res.status(400).json({ message: "Invalid Booking ID" });
    try {
        await AppointmentBooking.findByIdAndUpdate(booking_id, { booking_date: formattedDate, booking_time: newBookingTime });
        res.json({ message: "Booking updated successfully" });
    } catch (err) {
        console.error("Reschedule error:", err);
        res.status(500).json({ message: "Booking update failed" });
    }
});

app.post("/cancelBooking", async (req, res) => {
    const { booking_id, tag } = req.body;
    if (!mongoose.isValidObjectId(booking_id)) return res.status(400).json({ message: "Invalid Booking ID" });
    try {
        await AppointmentBooking.findByIdAndUpdate(booking_id, { status: tag });
        res.json({ message: `Booking tagged as ${tag}` });
    } catch (err) {
        console.error("Cancel/Tag error:", err);
        res.status(500).json({ message: "Booking update failed" });
    }
});

app.get("/validateAppointment", async (req, res) => {
    const { user_id, booking_date, booking_time, consultation_type } = req.query;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "Invalid User ID" });
    if (!booking_date || !booking_time || !consultation_type) return res.status(400).json({ message: "Missing required parameters" });
    try {
        const patient = await PatientInfo.findOne({ user_id });
        if (!patient) return res.json({ exists: false });
        const existingBookings = await AppointmentBooking.find({ patient_id: patient._id, booking_date, status: { $nin: ['Cancelled', 'Completed'] } });
        if (existingBookings.length === 0) return res.json({ exists: false });
        for (const booking of existingBookings) {
            if (booking.booking_time === booking_time) return res.json({ exists: true, message: "You already have another booking scheduled for this exact date and time." });
            if (booking.consultation_type === consultation_type) return res.json({ exists: true, message: `You have already booked a ${consultation_type} consultation on this date at a different time.` });
        }
        res.json({ exists: false });
    } catch (err) {
        console.error("Validation error:", err);
        res.status(500).json({ message: "Database error during validation" });
    }
});

// =================================================================
// --- DASHBOARD API ENDPOINTS ---
// =================================================================

app.get("/appointment-count", async (req, res) => { try { const count = await AppointmentBooking.countDocuments({ status: 'Booked' }); res.send({ total_booked: count }); } catch (err) { res.status(500).send({ message: "Database query failed" }); } });
app.get("/appointment-count-today", async (req, res) => { try { const today = new Date(); const dateString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`; const count = await AppointmentBooking.countDocuments({ status: 'Booked', booking_date: dateString }); res.send({ total_booked_today: count }); } catch (err) { console.error(err); res.status(500).send({ message: "Database query failed" }); } });
app.get("/overall_patients", async (req, res) => { try { const count = await PatientInfo.countDocuments(); res.send({ patient_count: count }); } catch (err) { res.status(500).send({ message: "Database query failed" }); } });
app.get("/item-inventory-count", async (req, res) => { try { const count = await Inventory.countDocuments(); res.send({ inventory_count: count }); } catch (err) { res.status(500).send({ message: "Database query failed" }); } });

// =================================================================
// --- INVENTORY API ENDPOINTS ---
// =================================================================

app.post("/saveInventoryItem", async (req, res) => { const { addItem, addCategory, addQuantity, addMinimum, addPrice } = req.body; try { const existing = await Inventory.findOne({ item: { $regex: new RegExp(`^${addItem}$`, 'i') } }); if (existing) return res.status(400).json({ message: "Item already listed" }); const status = addQuantity <= 0 ? 'out of stock' : (addQuantity < addMinimum ? 'for reorder' : 'in stock'); const newItem = new Inventory({ item: addItem, category: addCategory, quantity: addQuantity, average_quantity: addMinimum, price: addPrice, status }); await newItem.save(); res.json({ message: "Inventory item added successfully" }); } catch (err) { console.error("Save inventory error:", err); res.status(500).json({ message: "Insert failed" }); } });
app.get("/getInventory", async (req, res) => { try { const { item, status } = req.query; let filter = {}; if (status) filter.status = status; let results = await Inventory.find(filter).populate('category'); if (item) { const searchTerm = item.toLowerCase(); results = results.filter(d => d.item.toLowerCase().includes(searchTerm) || (d.category && d.category.category.toLowerCase().includes(searchTerm))); } const data = results.map(i => ({ id: i._id, item: i.item, category: i.category ? i.category.category : 'N/A', quantity: i.quantity, average_quantity: i.average_quantity, price: i.price, status: i.status })); res.json({ data }); } catch (err) { console.error("Get inventory error:", err); res.status(500).json({ message: "Database error" }); } });
app.get("/getItemInventoryByID/:id", async (req, res) => { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" }); try { const item = await Inventory.findById(req.params.id); if (!item) return res.status(404).json({ message: "Item not found" }); res.json({ data: [{ ...item.toObject(), id: item._id, category_id: item.category }] }); } catch (err) { console.error("Get item by ID error:", err); res.status(500).json({ message: "Database error" }); } });
app.post("/updateInventory", async (req, res) => { const { id, updateItemName, updateCategory, updateQuantity, updateMinimum, updatePrice } = req.body; if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" }); try { const status = updateQuantity <= 0 ? 'out of stock' : (updateQuantity < updateMinimum ? 'for reorder' : 'in stock'); await Inventory.findByIdAndUpdate(id, { item: updateItemName, category: updateCategory, quantity: updateQuantity, average_quantity: updateMinimum, price: updatePrice, status }); res.json({ message: "Inventory updated successfully" }); } catch (err) { console.error("Update inventory error:", err); res.status(500).json({ message: "Inventory update failed" }); } });
app.get("/getInventoryTotal", async (req, res) => { try { const items = await Inventory.find({}).populate('category'); const data = items.map(i => ({ id: i._id, item: i.item, category: i.category ? i.category.category : 'N/A', quantity: i.quantity, price: i.price, total: i.quantity * i.price })); res.json({ data }); } catch (err) { console.error("Get inventory total error:", err); res.status(500).json({ message: "Database error" }); } });

// =================================================================
// --- PATIENT API ENDPOINTS ---
// =================================================================

app.get("/getPatientsList", async (req, res) => { const { fullname, emailAddress, user_id, role } = req.query; try { let filter = {}; if (fullname) { const regex = new RegExp(fullname, 'i'); filter.$or = [{ firstname: regex }, { lastname: regex }]; } if (emailAddress) filter.email_address = { $regex: emailAddress, $options: 'i' }; if (role === "patient" && user_id) filter.user_id = user_id; const patients = await PatientInfo.find(filter); const data = patients.map(p => ({ id: p._id, fullname: `${p.firstname} ${p.lastname}`, gender: p.gender, age: p.age, mobile_number: p.mobile_number, email_address: p.email_address, user_id: p.user_id })); res.json({ data }); } catch (err) { console.error("Get patients list error:", err); res.status(500).json({ message: "Database error", error: err }); } });
app.get("/getPatientInfo", async (req, res) => { const { patient_user_id } = req.query; if (!mongoose.isValidObjectId(patient_user_id)) return res.status(400).json({ message: "Invalid User ID" }); try { const userProfile = await UserInfo.findById(patient_user_id); const accountInfo = await AccountInfo.findOne({ user_id: patient_user_id }); const patientData = await PatientInfo.findOne({ user_id: patient_user_id }); if (!userProfile) return res.status(404).json({ message: "User not found", data: [] }); const finalData = { ...(patientData ? patientData.toObject() : {}), firstname: userProfile.firstname, lastname: userProfile.lastname, gender: userProfile.gender, birthdate: userProfile.birthdate, age: userProfile.age, email: accountInfo ? accountInfo.email : (patientData ? patientData.email_address : ''), mobile_number: accountInfo ? accountInfo.phone : (patientData ? patientData.mobile_number : '') }; res.status(200).json({ data: [finalData] }); } catch (err) { console.error("Get patient info error:", err); res.status(500).json({ message: "Failed to retrieve patient details." }); } });
app.post("/updatePatientInfo", async (req, res) => { const { user_id, email, ...patientData } = req.body; if (!user_id || !mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "A valid User ID is required." }); const session = await mongoose.startSession(); session.startTransaction(); try { const patientUpdateData = { ...patientData, user_id, email_address: email }; if (patientData.birthdate && new Date(patientData.birthdate).toString() !== 'Invalid Date') patientUpdateData.birthdate = new Date(patientData.birthdate); else delete patientUpdateData.birthdate; await PatientInfo.findOneAndUpdate({ user_id: user_id }, { $set: patientUpdateData }, { upsert: true, new: true, session }); await UserInfo.updateOne({ _id: user_id }, { $set: { firstname: patientData.firstname, lastname: patientData.lastname, gender: patientData.gender, } }, { session }); await AccountInfo.updateOne({ user_id: user_id }, { $set: { email: email.toLowerCase(), phone: patientData.mobile_number, } }, { session }); await session.commitTransaction(); session.endSession(); res.status(200).json({ message: "Patient information updated successfully." }); } catch (err) { await session.abortTransaction(); session.endSession(); console.error("Error updating patient info:", err); if (err.code === 11000) return res.status(409).json({ message: "This email address is already in use by another account." }); res.status(500).json({ message: "An error occurred while updating patient information." }); } });

// =================================================================
// --- DOCTOR & CONSULTATION API ENDPOINTS ---
// =================================================================

app.post("/updateDoctorPassword", async (req, res) => {
    const { user_id, password } = req.body;
    if (!mongoose.isValidObjectId(user_id) || !password) return res.status(400).json({ message: "Invalid data provided." });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await AccountInfo.findOneAndUpdate({ user_id }, { password: hashedPassword }); // FIX: Update AccountInfo
        res.json({ message: "User password updated successfully" });
    } catch (err) {
        console.error("Update password error:", err);
        res.status(500).json({ message: "Update failed" });
    }
});

app.post("/updateDoctorInfo", async (req, res) => {
    const { user_id, firstname, middlename, lastname, gender, birthdate, age, contactNumber, emailAddress, specialty, department, yearsofexp, professionalBoard, certificate, status } = req.body;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "Invalid ID provided." });
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await UserInfo.findByIdAndUpdate(user_id, { firstname, middlename, lastname, gender, birthdate: new Date(birthdate), age }, { session });
        await AccountInfo.findOneAndUpdate({ user_id }, { phone: contactNumber, email: emailAddress }, { session });
        const professionalData = { specialty, department, years_of_experience: yearsofexp, professional_board: professionalBoard, certificate, status };
        await DoctorProfile.updateOne({ user_id }, { $set: professionalData }, { upsert: true, session });
        await session.commitTransaction();
        session.endSession();
        res.json({ message: "Doctor profile updated successfully" });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error updating doctor info:", err);
        res.status(500).json({ message: "Failed to update doctor profile" });
    }
});

app.get("/getProfessionalInfo/:user_id", async (req, res) => {
    const { user_id } = req.params;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "Invalid user ID" });
    try {
        const profile = await DoctorProfile.findOne({ user_id });
        if (!profile) return res.status(200).json({ data: [] });
        res.status(200).json({ data: [profile] });
    } catch (err) {
        console.error("Get professional info error:", err);
        res.status(500).json({ message: "Database error" });
    }
});

app.get("/getDoctorsList", async (req, res) => {
    const { doctorName, specialtyId } = req.query;
    try {
        let profileFilter = {};
        if (specialtyId) profileFilter.specialty = specialtyId;
        let userFilter = { role: 'doctor' };
        if (doctorName) {
            const regex = new RegExp(doctorName, 'i');
            userFilter.$or = [{ firstname: regex }, { lastname: regex }];
        }
        const profiles = await DoctorProfile.find(profileFilter).populate({ path: 'user_id', match: userFilter });
        const validProfiles = profiles.filter(p => p.user_id);
        const userIds = validProfiles.map(p => p.user_id._id);
        const accounts = await AccountInfo.find({ user_id: { $in: userIds } });
        const accountMap = new Map(accounts.map(acc => [acc.user_id.toString(), acc]));
        const data = validProfiles.map(p => ({
            id: p.user_id._id,
            fullname: `${p.user_id.firstname} ${p.user_id.lastname}`,
            specialty: p.specialty,
            email: accountMap.get(p.user_id._id.toString())?.email || 'N/A',
            status: p.status
        }));
        res.json({ data });
    } catch (err) {
        console.error("Get doctors list error:", err);
        res.status(500).json({ message: "Database error", error: err.toString() });
    }
});
app.get("/getDoctorsByConsultationType", async (req, res) => {
    const { consultationType } = req.query; // This will be a string, e.g., "12"
    if (!consultationType) {
        return res.status(400).json({ error: "Missing consultationType parameter" });
    }

    try {
        // Mongoose's `find` is type-sensitive. The string "12" will not match the number 12.
        // To fix this, we create a query that checks for either the string OR the number version.
        // This makes the query work for both your old migrated data (numbers)
        // and any new data you might create (which will be strings).
        const profiles = await DoctorProfile.find({ 
            $or: [
                { specialty: consultationType }, // Checks for a string match
                { specialty: parseInt(consultationType) } // Checks for a number match
            ]
        }).populate({
            path: 'user_id',
            match: { role: 'doctor', status: 1 }, // Ensure the user is an active doctor
            select: 'firstname lastname'
        });

        // The rest of the logic is correct and remains the same
        const doctors = profiles
            .filter(p => p.user_id) // Filter out any profiles where the populated user is null
            .map(p => ({
                id: p.user_id._id,
                name: `${p.user_id.firstname} ${p.user_id.lastname}`
            }));
            
        res.json(doctors);
    } catch (err) { 
        console.error("Get doctors by type error:", err); 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

app.get("/getDoctorsInfo", async (req, res) => {
    const { doctor_user_id } = req.query;
    if (!mongoose.isValidObjectId(doctor_user_id)) return res.status(400).json({ message: "Invalid doctor ID" });
    try {
        const doctor = await UserInfo.findById(doctor_user_id); // FIX: Use UserInfo
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });
        res.status(200).json({ data: [doctor] });
    } catch (err) {
        console.error("Get doctor info error:", err);
        res.status(500).json({ message: "Failed to retrieve doctor details." });
    }
});

app.post("/giveRecommendation", async (req, res) => { const { appointment_id, recommendation, follow_up, pres_tag, prescription } = req.body; if (!mongoose.isValidObjectId(appointment_id)) return res.status(400).json({ message: "Invalid appointment ID." }); if (!recommendation) return res.status(400).json({ message: "Recommendation is required." }); const session = await mongoose.startSession(); session.startTransaction(); try { const newRecommendation = new DoctorRecommendation({ appointment_id, recommendation, follow_up_required: follow_up === 'Yes', prescription_given: pres_tag === 'Yes', prescription: pres_tag === 'Yes' ? prescription : null }); await newRecommendation.save({ session }); await AppointmentBooking.updateOne({ _id: appointment_id }, { status: 'Consulted' }, { session }); await session.commitTransaction(); session.endSession(); res.status(200).json({ message: "Recommendation saved and status updated to Consulted." }); } catch (err) { await session.abortTransaction(); session.endSession(); console.error("Give recommendation error:", err); res.status(500).json({ message: "Failed to save recommendation." }); } });
app.get("/getConsultationDetails", async (req, res) => { const { user_id } = req.query; if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ message: "Invalid user ID" }); try { const patient = await PatientInfo.findOne({ user_id }); if (!patient) return res.status(200).json({ data: [] }); const bookings = await AppointmentBooking.find({ patient_id: patient._id, status: { $in: ["Consulted", "Emergency", "Completed"] } }).populate('doctor_id', 'firstname lastname').sort({ booking_date: -1 }); const recommendations = await DoctorRecommendation.find({ appointment_id: { $in: bookings.map(b => b._id) } }); const recMap = new Map(recommendations.map(r => [r.appointment_id.toString(), r])); const data = bookings.map(b => ({ consultation_date: b.booking_date, consultation_type: b.consultation_type, recommendation: recMap.get(b._id.toString())?.recommendation || 'N/A', follow_up: recMap.get(b._id.toString())?.follow_up_required ? 'Yes' : 'No', doctor_fullname: b.doctor_id ? `${b.doctor_id.firstname} ${b.doctor_id.lastname}` : 'N/A', consultation_status: b.status })); res.status(200).json({ data }); } catch (err) { console.error("Get consultation details error:", err); res.status(500).json({ message: "Failed to retrieve consultation details." }); } });

// --- Server Start ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/login/login.html`);
});