const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors"); // ✅ Fix for CORS
const mysql = require("mysql"); // ✅ Fix added
const app = express();
const crypto = require("crypto");
const util = require("util");



app.use(cors()); // Enable CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "web_immacare")));
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist"))
);
app.use(
  "/bootstrap-icons",
  express.static(__dirname + "/node_modules/bootstrap-icons")
);
app.use(
  "/datatables.net",
  express.static(__dirname + "/node_modules/datatables.net")
);
app.use(
  "/datatables.net-dt",
  express.static(__dirname + "/node_modules/datatables.net-dt")
);
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist"));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "web_immacare", "main.html"));
});
//bermejoadd
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landing_page", "landing.html"));
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/login/login.html`);
});


// Middleware
app.use(bodyParser.json());
app.use(cors()); // Allow all origins for simplicity; configure for production
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

// Create MySQL connection november 5
// const connection = mysql.createConnection({
//   host: "localhost", // or your DB host
//   user: "root", // your MySQL username
//   password: "", // your MySQL password
//   database: "immacare_db", // your database name
// });
const connection = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});


// Connect to database
connection.connect((err) => {
  if (err) {
    console.error("DB connection failed: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Login API endpoint

const bcrypt = require("bcryptjs");
const session = require("express-session");

app.use(
  session({
    secret: "your-secret-key", // use a strong secret in production, store safely
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day (in milliseconds)
  })
);

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  

  if (!email || !password) {
    return res.status(400).send({ message: "email and password are required" });
  }
  // First, check account_info
  const query = "SELECT * FROM account_info WHERE email = ? and status = 1";
  connection.query(query, [email], (err, results) => {
    if (err) return res.status(500).send({ message: "Database error" });
    if (results.length === 0) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err)
        return res.status(500).send({ message: "Error checking password" });

      if (!isMatch) {
        return res.status(401).send({ message: "Invalid credentials" });
      } 
      //bermejo
      if (user.is_verified === 0) {
    return res.status(403).send({ message: "Please verify your email before logging in" });
  }

      // Now fetch personal info from users_info
      const userInfoQuery =
        "SELECT * FROM users_info WHERE id = ? and status = 1";
      connection.query(
        userInfoQuery,
        [user.user_id],
        (err, userInfoResults) => {
          if (err)
            return res
              .status(500)
              .send({ message: "Error fetching user info" });

          const userInfo = userInfoResults[0];

          req.session.userId = user.id;
          req.session.email = user.email;
          req.session.phone = user.phone;
          req.session.user_id_id = userInfo.id;
          req.session.firstname = userInfo.firstname;
          req.session.lastname = userInfo.lastname;
          req.session.middlename = userInfo.middlename;
          req.session.gender = userInfo.gender;
          req.session.birthdate = userInfo.birthdate;
          req.session.age = userInfo.age;
          req.session.role = userInfo.role;

          res.send({
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              firstname: userInfo.firstname,
              lastname: userInfo.lastname,
              middlename: userInfo.middlename,
              gender: userInfo.gender,
              birthdate: userInfo.birthdate,
              age: userInfo.age,
              role: userInfo.role,
              phone: user.phone,
              user_id_id: userInfo.id
            },
          });
        }
      );
    });
  });
});

//verification
const saltRounds = 10;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign up/Register
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bernejojoshua@gmail.com",
    pass: "vzas gazb vjco czpv", // Use App Password for Gmail
  },
});
const query = util.promisify(connection.query).bind(connection);
app.post("/register", (req, res) => {
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

  const checkEmailQuery = "SELECT * FROM account_info WHERE email = ?";
  connection.query(checkEmailQuery, [email], (err, results) => {
    if (err) return res.status(500).send({ message: "Database error" });
    if (results.length > 0)
      return res.status(409).send({ message: "Email already in use" });

    connection.beginTransaction((err) => {
      if (err) return res.status(500).send({ message: "Transaction start failed" });

      const userInsertQuery = `
        INSERT INTO users_info (firstname, middlename, lastname, gender, birthdate, age, role, status)
        VALUES (?, ?, ?, ?, ?, ?, 'patient', 1)
      `;
      const userValues = [firstname, middlename || null, lastname, gender, birthdate, age];

      connection.query(userInsertQuery, userValues, (err, userResult) => {
        if (err) return connection.rollback(() => res.status(500).send({ message: "Error inserting user info" }));

        const userId = userResult.insertId;

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) return connection.rollback(() => res.status(500).send({ message: "Error hashing password" }));

          // Generate verification token
          const verificationToken = crypto.randomBytes(32).toString("hex");

          const accountInsertQuery = `
            INSERT INTO account_info (user_id, phone, email, password, status, verification_token, is_verified)
            VALUES (?, ?, ?, ?, 1, ?, 0)
          `;
          const accountValues = [userId, phone, email, hashedPassword, verificationToken];

          connection.query(accountInsertQuery, accountValues, (err, accountResult) => {
            if (err) return connection.rollback(() => res.status(500).send({ message: "Error inserting account info" }));

            connection.commit(async (err) => {
              if (err) return connection.rollback(() => res.status(500).send({ message: "Commit failed" }));

              const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}&id=${userId}`;
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
            <p>Thank you for registering with <strong>ImmaCare+</strong>. Before you can start using your account, we need to verify your email address to ensure your account’s security.</p>
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

              transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                  console.error("Email send error:", err);
                  return res.status(500).send({ message: "Failed to send verification email" });
                }

                res.send({
                  message: "User registered successfully. Please check your email to verify your account.",
                  userId,
                  accountId: accountResult.insertId,
                });
              });
            });
          });
        });
      });
    });
  });
});


app.get("/verify-email", async (req, res) => {
  try {
    const { token, id } = req.query;
    if (!token || !id) return res.send("<h3>Invalid verification link.</h3>");

    const results = await query(
      "SELECT * FROM account_info WHERE user_id = ? AND verification_token = ?",
      [id, token]
    );

    if (results.length === 0) return res.send("<h3>Invalid token or user.</h3>");

    // Mark user as verified
    await query(
      "UPDATE account_info SET is_verified = 1, verification_token = NULL WHERE user_id = ?",
      [id]
    );

    // ✅ Redirect to login folder
    res.redirect("/login/login.html?verified=true");
  } catch (err) {
    console.error(err);
    res.send("<h3>Server error during email verification.</h3>");
  }
});

//end of bermejo code

// To create a session
app.get("/homepage", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send({ message: "Unauthorized: Please login" });
  }

  // User is authenticated
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

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: "Logout failed" });
    }
    res.send({ message: "Logged out successfully" });
  });
});

// GET ALL USERS TABLE- in User Access Management
app.get("/users", (req, res) => {
  const { role, fullname } = req.query;

  let query = `
    SELECT 
      u.id as user_id, 
      u.role,
      CONCAT(u.firstname, ' ', u.lastname) as fullname,
      CASE WHEN a.status = 1 THEN 'Active' ELSE 'Inactive' END as status,
      a.email as username,
      DATE_FORMAT(a.updated_date, '%m-%d-%Y') AS updated_date
    FROM account_info a 
    JOIN users_info u ON a.user_id = u.id
    WHERE u.role != 'admin'
  `;

  const params = [];

  if (role) {
    query += ` AND u.role = ?`;
    params.push(role);
  }

  if (fullname) {
    query += ` AND CONCAT(u.firstname, ' ' , u.lastname) LIKE ?`;
    params.push(`%${fullname}%`);
  }
  connection.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results }); // DataTables expects data inside "data" key
  });
});

app.get("/users_update/:id", (req, res) => {
  const userId = req.params.id;

  const query = `
    SELECT 
      u.id AS user_id, 
      CONCAT(u.firstname, ' ', u.lastname) AS fullname,
      u.firstname,
      u.middlename,
      u.lastname,
      DATE_FORMAT(u.birthdate, '%m-%d-%Y') AS birthdate,
      u.gender,
      u.role,
      a.email AS username,
      CASE WHEN a.status = 1 THEN 'Active' ELSE 'Inactive' END AS status,
      DATE_FORMAT(a.updated_date, '%m-%d-%Y') AS updated_date
    FROM account_info a 
    JOIN users_info u ON a.user_id = u.id
    WHERE u.role != 'admin' AND u.id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results });
  });
});

// POST - Update account_info by user ID
app.post("/updateUserAccount", (req, res) => {
  const { user_id, email, password, status } = req.body;

  const query = `
    UPDATE account_info
    SET email = ?, password = ?, status = ?, updated_date = NOW()
    WHERE id = ?
  `;

  bcrypt.hash(password, saltRounds, (err, password) => {
    if (err) {
      return connection.rollback(() => {
        res.status(500).send({ message: "Error hashing password" });
      });
    }

    connection.query(
      query,
      [email, password, status, user_id],
      (err, result) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ message: "Update failed" });
        }

        res.json({ message: "User account updated successfully" });
      }
    );
  });
});

// BOOKING APPOINTMENT - INSERT BOOKING

app.post("/book-appointment", (req, res) => {
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

  if (
    !firstname ||
    !lastname ||
    !gender ||
    !birthdate ||
    !age ||
    !civil_status
  ) {
    return res.status(400).send({ message: "Missing required patient info" });
  }

  // Step 1: Check if user_id already exists
  const checkUserQuery = "SELECT id FROM patient_info WHERE user_id = ?";
  connection.query(checkUserQuery, [user_id], (err, results) => {
    if (err) {
      console.error("Error checking user_id:", err);
      return res.status(500).send({ message: "Database error" });
    }

    const isExisting = results.length > 0;

    const patientValues = [
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
    ];

    const proceedWithBooking = (patientId) => {
      const insertBookingQuery = `
        INSERT INTO appointment_booking (
          patient_id, consultation_type, booking_date, booking_time, status, doctor_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      const bookingValues = [
        patientId,
        consultation_type,
        booking_date,
        booking_time,
        status || "Pending",
        doctor_id,
      ];

      connection.query(
        insertBookingQuery,
        bookingValues,
        (err, bookingResult) => {
          if (err) {
            console.error("Error inserting booking:", err);
            return res.status(500).send({ message: "Error saving booking" });
          }

          return res.send({
            message: "Appointment booked successfully",
            appointment_id: bookingResult.insertId,
            patient_id: patientId,
          });
        }
      );
    };

    if (isExisting) {
      const patientId = results[0].id;

      const updateQuery = `
        UPDATE patient_info SET
          firstname = ?, middlename = ?, lastname = ?, gender = ?, birthdate = ?, age = ?, civil_status = ?,
          mobile_number = ?, email_address = ?, home_address = ?,
          emergency_name = ?, emergency_relationship = ?, emergency_mobile_number = ?,
          bloodtype = ?, allergies = ?, current_medication = ?, past_medical_condition = ?, chronic_illness = ?
        WHERE user_id = ?
      `;

      connection.query(updateQuery, [...patientValues, user_id], (err) => {
        if (err) {
          console.error("Error updating patient:", err);
          return res
            .status(500)
            .send({ message: "Error updating patient info" });
        }

        proceedWithBooking(patientId);
      });
    } else {
      const insertPatientQuery = `
        INSERT INTO patient_info (
          user_id, firstname, middlename, lastname, gender, birthdate, age, civil_status,
          mobile_number, email_address, home_address,
          emergency_name, emergency_relationship, emergency_mobile_number,
          bloodtype, allergies, current_medication, past_medical_condition, chronic_illness
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      connection.query(
        insertPatientQuery,
        [user_id, ...patientValues],
        (err, result) => {
          if (err) {
            console.error("Error inserting patient:", err);
            return res
              .status(500)
              .send({ message: "Error saving patient info" });
          }

          proceedWithBooking(result.insertId);
        }
      );
    }
  });
});

// DASHBOARD - NO. OF BOOKED
app.get("/appointment-count", (req, res) => {
  const query =
    "SELECT COUNT(*) AS total_booked FROM appointment_booking WHERE status = 'booked'";

  connection.query(query, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send({ message: "Database query failed" });
    }

    const count = result[0].total_booked;
    res.send({
      message: "Count fetched successfully",
      total_booked: count,
    });
  });
});

// DASHBOARD - NO. OF PATIENTS TODAY
app.get("/appointment-count-today", (req, res) => {
  const query =
    "SELECT COUNT(*) AS total_booked_today FROM appointment_booking WHERE status = 'booked' AND DATE(booking_date) = CURDATE()";

  connection.query(query, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send({ message: "Database query failed" });
    }

    const count = result[0].total_booked_today;
    res.send({
      message: "Count fetched successfully",
      total_booked_today: count,
    });
  });
});

// DASHBOARD - NO. OF OVERALL PATIENTS
app.get("/overall_patients", (req, res) => {
  const query = "SELECT COUNT(*) as patient_count FROM `patient_info` ";

  connection.query(query, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send({ message: "Database query failed" });
    }

    const count = result[0].patient_count;
    res.send({
      message: "Count fetched successfully",
      patient_count: count,
    });
  });
});

// DASHBOARD - NO. OF ITEMS in INVENTORY
app.get("/item-inventory-count", (req, res) => {
  const query = "SELECT COUNT(*) as patient_count FROM `inventory` ";

  connection.query(query, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send({ message: "Database query failed" });
    }

    const count = result[0].patient_count;
    res.send({
      message: "Count fetched successfully",
      inventory_count: count,
    });
  });
});

// GET LIST OF BOOKING
app.get("/getBookingList", (req, res) => {
  const query = `
    SELECT 
        a.patient_id, 
        a.id, 
        a.consultation_type, 
        a.booking_date,
        a.booking_time,
        a.status,
        a.queue_no,
        CONCAT(b.firstname, ' ', b.lastname) AS fullname,
        b.gender,
        b.age FROM appointment_booking a 
        INNER JOIN patient_info b on a.patient_id = b.id
  `;

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results });
  });
});

// GET BOOKING DETAILS / VIEW BOOKING
app.get("/getBookingListById/:id", (req, res) => {
  const id = req.params.id;

  const query = `
    SELECT 
        a.patient_id, 
        a.id, 
        a.consultation_type, 
        a.booking_date,
        a.booking_time,
        a.status,
        a.queue_no,
        CONCAT(b.firstname, ' ', b.lastname) AS fullname,
        b.gender,
        b.age FROM appointment_booking a 
        INNER JOIN patient_info b on a.patient_id = b.id
        WHERE a.id = ?
  `;

  connection.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results });
  });
});

// CREATING QUEUE NUMBER
app.post("/generateQueueNumber/:id", (req, res) => {
  const bookingId = req.params.id;

  const today = new Date().toISOString().slice(0, 10);
  // Select latest queue_no for today only
  const getLatestQueueQuery = `
    SELECT queue_no FROM appointment_booking
    WHERE DATE(updated_date) = ?
    AND queue_no REGEXP '^[0-9]+$'
    ORDER BY CAST(queue_no AS UNSIGNED) DESC
    LIMIT 1
  `;

  connection.query(getLatestQueueQuery, [today], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error (select)" });
    }

    let newQueueNo;

    if (results.length === 0) {
      // No queue numbers for today yet — start at 001
      newQueueNo = "001";
    } else {
      // Get latest number and increment
      const raw = results[0].queue_no?.toString().trim();
      const latest = Number(raw);

      if (isNaN(latest)) {
        return res
          .status(400)
          .json({ message: "Invalid latest queue number in DB" });
      }

      newQueueNo = (latest + 1).toString().padStart(3, "0");
    }

    const updateQuery = `
      UPDATE appointment_booking
      SET queue_no = ?, status = 'In Queue', updated_date = NOW()
      WHERE id = ?
    `;

    connection.query(
      updateQuery,
      [newQueueNo, bookingId],
      (err, updateResult) => {
        if (err) {
          return res.status(500).json({ message: "Database error (update)" });
        }

        res.json({
          message: "Queue number generated successfully",
          queue_no: newQueueNo,
        });
      }
    );
  });
});

function toMySQLDateFormat(dateStr) {
  const [mm, dd, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

// GET LIST OF BOOKING WITH SEARCH CRITERIA
app.get("/getBookingListSearch", (req, res) => {
  const { booking_date, status, fullname, consultation_type, role, user_id } =
    req.query;
  let query = `
    SELECT 
      a.patient_id, 
      a.id, 
      a.consultation_type, 
      a.booking_date,
      a.booking_time,
      a.status,
      a.queue_no,
      CONCAT(b.firstname,' ', b.lastname) AS fullname,
      b.gender,
      b.age,
      b.user_id as patient_user_id
    FROM appointment_booking a 
    INNER JOIN patient_info b ON a.patient_id = b.id
    WHERE 1=1
  `;

  const params = [];

  if (booking_date) {
    query += ` AND a.booking_date = ?`;
    params.push(booking_date);
  }
  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  if (fullname) {
    query += ` AND CONCAT(b.firstname,' ', b.lastname) LIKE ?`;
    params.push(`%${fullname}%`);
  }

  if (consultation_type) {
    query += ` AND a.consultation_type = ?`;
    params.push(consultation_type);
  }

  // Add role-based filter
  if (role === "patient" && user_id) {
    query += ` AND b.user_id = ?`;
    params.push(user_id);
  }

  if (role === "doctor" && user_id) {
    query += ` AND a.doctor_id = ? AND a.status = ?`;
    params.push(user_id, "In Queue");
  }

  connection.query(query, params, (err, results) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });

    res.json({ data: results });
  });
});

// SAVE INVENTORY
app.post("/saveInventoryItem", (req, res) => {
  const { addItem, addCategory, addQuantity, addMinimum, addPrice } = req.body;

  // Step 1: Check if item already exists (case-insensitive)
  const checkQuery = `
    SELECT * FROM inventory WHERE LOWER(item) = LOWER(?)
  `;

  connection.query(checkQuery, [addItem], (checkErr, results) => {
    if (checkErr) {
      console.error("Check error:", checkErr);
      return res.status(500).json({ message: "Error checking item" });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "Item already listed" });
    }

    // Step 2: Insert new item
    const insertQuery = `
      INSERT INTO inventory (item, category, quantity, average_quantity, price, status)
      VALUES (?, ?, ?, ?, ?, 
        CASE 
          WHEN ? = 0 THEN 'out of stock'
          WHEN ? < ? THEN 'for reorder'
          ELSE 'in stock'
        END
      )
    `;

    connection.query(
      insertQuery,
      [
        addItem,
        addCategory,
        addQuantity,
        addMinimum,
        addPrice,
        addQuantity,
        addQuantity,
        addMinimum,
      ],
      (insertErr, result) => {
        if (insertErr) {
          console.error("Insert error:", insertErr);
          return res.status(500).json({ message: "Insert failed" });
        }

        res.json({ message: "Inventory item added successfully" });
      }
    );
  });
});

// GET LIST OF INVENTORY WITH CRITERIA
app.get("/getInventory", (req, res) => {
  const { item, status } = req.query;
  let query = `
    SELECT 
      a.id, a.item, b.category, a.quantity, a.average_quantity, a.price, a.status 
    FROM inventory a 
    INNER JOIN inventory_category b ON b.id = a.category
    WHERE 1 = 1
  `;

  const params = [];

  if (item) {
    query += ` AND (a.item LIKE ? OR b.category LIKE ?)`;
    params.push(`%${item}%`, `%${item}%`);
  }

  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  connection.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results }); // DataTables expects data inside "data" key
  });
});

app.get("/getItemInventoryByID/:id", (req, res) => {
  const id = req.params.id;

  const query = `
   SELECT 
      a.id, a.item, b.category, a.category as category_id, a.quantity, a.average_quantity, a.price, a.status 
    FROM inventory a 
    INNER JOIN inventory_category b ON b.id = a.category
    WHERE a.id = ?
  `;

  connection.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results });
  });
});

app.post("/updateInventory", (req, res) => {
  const {
    id,
    updateItemName,
    updateCategory,
    updateQuantity,
    updateMinimum,
    updatePrice,
  } = req.body;

  const query = `
    UPDATE inventory
    SET 
      item = ?, 
      category = ?, 
      quantity = ?, 
      average_quantity = ?, 
      price = ?, 
      status = CASE 
                 WHEN ? = 0 THEN 'out of stock'
                 WHEN ? < ? THEN 'for reorder'
                 ELSE 'in stock'
               END
    WHERE id = ?
  `;

  connection.query(
    query,
    [
      updateItemName,
      updateCategory,
      updateQuantity,
      updateMinimum,
      updatePrice,
      updateQuantity,
      updateQuantity,
      updateMinimum, // for CASE logic
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ message: "Inventory update failed" });
      }

      res.json({ message: "Inventory updated successfully" });
    }
  );
});
//signup
app.post("/createAccount", (req, res) => {
  const {
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    email,
    password,
    role,
    status,
  } = req.body;

  const checkEmailQuery = "SELECT * FROM account_info WHERE email = ?";

  connection.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Database error during email check" });
    }

    if (results.length > 0) {
      return res.status(409).send({ message: "Email already in use" });
    }

    connection.beginTransaction((err) => {
      if (err) {
        return res.status(500).send({ message: "Transaction start failed" });
      }

      const userInsertQuery = `
        INSERT INTO users_info (firstname, middlename, lastname, gender, birthdate, status, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const userValues = [
        firstname,
        middlename || null,
        lastname,
        gender,
        birthdate,
        status,
        role,
      ];

      connection.query(userInsertQuery, userValues, (err, userResult) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).send({ message: "Error inserting user info" });
          });
        }

        const userId = userResult.insertId;

        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).send({ message: "Error hashing password" });
            });
          }

          const accountInsertQuery = `
            INSERT INTO account_info (user_id, email, password, status)
            VALUES (?, ?, ?, ?)
          `;
          const accountValues = [userId, email, hashedPassword, status];

          connection.query(
            accountInsertQuery,
            accountValues,
            (err, accountResult) => {
              if (err) {
                return connection.rollback(() => {
                  res
                    .status(500)
                    .send({ message: "Error inserting account info" });
                });
              }

              const accountId = accountResult.insertId;

              // If doctor, insert into doctors_profile first
              if (role.toLowerCase() === "doctor") {
                const doctorInsertQuery = `
                INSERT INTO doctors_profile (user_id)
                VALUES (?)
              `;
                connection.query(
                  doctorInsertQuery,
                  [userId],
                  (err, doctorResult) => {
                    if (err) {
                      return connection.rollback(() => {
                        res
                          .status(500)
                          .send({ message: "Error inserting doctor profile" });
                      });
                    }

                    const doctorProfileId = doctorResult.insertId;

                    connection.commit((err) => {
                      if (err) {
                        return connection.rollback(() => {
                          res.status(500).send({ message: "Commit failed" });
                        });
                      }

                      res.send({
                        message: "Doctor account created successfully",
                        userId,
                        accountId,
                        doctorProfileId,
                      });
                    });
                  }
                );
              } else {
                // If not doctor, just commit and send response
                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => {
                      res.status(500).send({ message: "Commit failed" });
                    });
                  }

                  res.send({
                    message: "User created successfully",
                    userId,
                    accountId,
                  });
                });
              }
            }
          );
        });
      });
    });
  });
});

app.post("/updateDoctorPassword", (req, res) => {
  const { user_id, password } = req.body;

  // Step 1: Hash the new password
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error("Error hashing password:", err);
      return res.status(500).send({ message: "Error hashing password" });
    }

    // Step 2: Run the UPDATE query with the hashed password
    const query = `
      UPDATE account_info
      SET password = ?, updated_date = NOW()
      WHERE id = ?
    `;

    connection.query(query, [hashedPassword, user_id], (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ message: "Update failed" });
      }

      res.json({ message: "User password updated successfully" });
    });
  });
});

app.post("/updateDoctorInfo", (req, res) => {
  const {
    user_id,
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    age,
    contactNumber,
    emailAddress,
    specialty,
    department,
    yearsofexp,
    professionalBoard,
    certificate,
    status,
  } = req.body;

  connection.beginTransaction((err) => {
    if (err) {
      console.error("Transaction start error:", err);
      return res.status(500).json({ message: "Failed to start transaction" });
    }

    const updateUsersQuery = `
      UPDATE users_info
      SET firstname = ?, middlename = ?, lastname = ?, gender = ?, birthdate = ?, age = ?
      WHERE id = ?
    `;

    connection.query(
      updateUsersQuery,
      [firstname, middlename, lastname, gender, birthdate, age, user_id],
      (err, usersResult) => {
        if (err) {
          return connection.rollback(() => {
            console.error("users_info update error:", err);
            res.status(500).json({ message: "Failed to update users_info" });
          });
        }

        const updateAccountQuery = `
          UPDATE account_info
          SET phone = ?, email = ?, updated_date = NOW()
          WHERE id = ?
        `;

        connection.query(
          updateAccountQuery,
          [contactNumber, emailAddress, user_id],
          (err, accountResult) => {
            if (err) {
              return connection.rollback(() => {
                console.error("account_info update error:", err);
                res
                  .status(500)
                  .json({ message: "Failed to update account_info" });
              });
            }

            const updateDoctorQuery = `
              UPDATE doctors_profile
              SET specialty = ?, department = ?, years_of_experience = ?, professional_board = ?, certificate = ?, status = ?
              WHERE user_id = ?
            `;

            connection.query(
              updateDoctorQuery,
              [
                specialty,
                department,
                yearsofexp,
                professionalBoard,
                certificate,
                status,
                user_id,
              ],
              (err, doctorResult) => {
                if (err) {
                  return connection.rollback(() => {
                    console.error("doctors_info update error:", err);
                    res
                      .status(500)
                      .json({ message: "Failed to update doctors_info" });
                  });
                }

                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => {
                      console.error("Commit error:", err);
                      res
                        .status(500)
                        .json({ message: "Failed to commit transaction" });
                    });
                  }

                  res.json({ message: "Doctor profile updated successfully" });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.get("/getProfessionalInfo/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  const query = `
      SELECT 
        specialty AS specialty,
        department AS department,
        years_of_experience AS yearsofexp,
        professional_board AS professionalBoard,
        certificate AS certificate,
        status AS status
      FROM doctors_profile
      WHERE user_id = ?
  `;

  connection.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ data: results });
  });
});

app.get("/getPatientsList", (req, res) => {
  const { fullname, emailAddress, user_id, role } = req.query;

  let query = `
    SELECT 
      id, 
      CONCAT(firstname, ' ', lastname) AS fullname,
      gender,
      age,
      mobile_number,
      email_address,
      user_id
    FROM patient_info 
    WHERE 1=1
  `;

  const params = [];

  if (fullname) {
    query += ` AND (
    CONCAT(firstname, ' ', lastname) LIKE ? OR
    CONCAT(firstname, ' ', middlename, ' ', lastname) LIKE ? OR
    firstname LIKE ? OR 
    middlename LIKE ? OR 
    lastname LIKE ?
  )`;
    const likeName = `%${fullname}%`;
    params.push(likeName, likeName, likeName, likeName, likeName);
  }
  if (fullname) {
    query += ` AND (
    TRIM(CONCAT_WS(' ', firstname, middlename, lastname)) LIKE ? OR
    TRIM(CONCAT(firstname, ' ', lastname)) LIKE ? OR
    firstname LIKE ? OR 
    middlename LIKE ? OR 
    lastname LIKE ?
  )`;
    const likeName = `%${fullname}%`;
    params.push(likeName, likeName, likeName, likeName, likeName);
  }

  if (emailAddress) {
    query += ` AND email_address LIKE ?`;
    params.push(`%${emailAddress}%`);
  }

  if (role === "patient" && user_id) {
    query += ` AND user_id = ?`;
    params.push(user_id);
  }

  connection.query(query, params, (err, results) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });

    res.json({ data: results });
  });
});

app.get("/getDoctorsList", (req, res) => {
  const { doctorName, specialtyId } = req.query;
  let query = `
    SELECT 
      CONCAT(u.firstname,' ', u.lastname) AS fullname,
      d.specialty,
      a.email,
      d.status,
      u.id
    FROM doctors_profile d
    JOIN users_info u ON d.user_id = u.id
    JOIN account_info a ON d.user_id = a.user_id
    WHERE 1=1
  `;

  const params = [];

  if (doctorName) {
    query += `
      AND (
        u.firstname LIKE ? OR 
        u.middlename LIKE ? OR 
        u.lastname LIKE ?
      )
    `;
    const likeName = `%${doctorName}%`;
    params.push(likeName, likeName, likeName);
  }

  if (specialtyId) {
    query += ` AND d.specialty = ?`;
    params.push(specialtyId);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json({ data: results });
  });
});

app.post("/reschedBooking", (req, res) => {
  const { booking_id, formattedDate, newBookingTime } = req.body;

  const query = `
    UPDATE appointment_booking
    SET 
      booking_date = ?, 
      booking_time = ?
    WHERE id = ?
  `;

  connection.query(
    query,
    [formattedDate, newBookingTime, booking_id],
    (err, result) => {
      if (err) {
        console.error("Booking update error:", err);
        return res.status(500).json({ message: "Booking update failed" });
      }

      res.json({ message: "Booking updated successfully" });
    }
  );
});

app.post("/cancelBooking", (req, res) => {
  const { booking_id, tag } = req.body;

  const query = `UPDATE appointment_booking
    SET 
    status = ?
    WHERE id = ?`;

  connection.query(query, [tag, booking_id], (err, result) => {
    if (err) {
      console.error("Booking cancellation error:", err);
      return res.status(500).json({ message: "Booking cancellation failed" });
    }

    res.json({ message: "Booking cancelled" });
  });
});

app.get("/validateAppointment", (req, res) => {
  const { booking_date, booking_time, user_id, consultation_type } = req.query;

  if (!booking_date || !booking_time || !user_id || !consultation_type) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  const query = `
    SELECT a.consultation_type, a.booking_time
    FROM appointment_booking a
    INNER JOIN patient_info p ON p.id = a.patient_id
    WHERE a.booking_date = ?
      AND p.user_id = ?
  `;

  const params = [booking_date, user_id];

  connection.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    const normalizedType = consultation_type.trim().toLowerCase();
    const normalizedTime = booking_time.trim();

    for (const row of results) {
      const rowType = row.consultation_type?.trim().toLowerCase();
      const rowTime = row.booking_time?.trim();

      if (rowType === normalizedType && rowTime === normalizedTime) {
        return res.json({
          exists: true,
          message:
            "You have already booked this consultation type at the same date and time.",
        });
      }

      if (rowType === normalizedType && rowTime !== normalizedTime) {
        return res.json({
          exists: true,
          message:
            "You have already booked this consultation type at the same date with a different time.",
        });
      }

      if (rowType !== normalizedType && rowTime === normalizedTime) {
        return res.json({
          exists: true,
          message:
            "You have already booked a different consultation type at the same date and time.",
        });
      }
    }

    // No match found
    return res.json({ exists: false });
  });
});

app.get("/getDoctorsByConsultationType", (req, res) => {
  const consultationType = req.query.consultationType;

  if (!consultationType) {
    return res
      .status(400)
      .json({ error: "Missing consultationType parameter" });
  }

  const query = `
    SELECT CONCAT(u.firstname, ' ', u.lastname) AS name, u.id AS id
    FROM users_info u
    JOIN doctors_profile d ON d.user_id = u.id
    WHERE u.role = 'doctor' AND d.specialty = ?
  `;

  connection.query(query, [consultationType], (err, results) => {
    if (err) {
      console.error("Error fetching doctors:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(results);
  });
});

app.post("/giveRecommendation", (req, res) => {
  const { appointment_id, recommendation, follow_up, pres_tag, prescription } =
    req.body;

  const follow_up_required = follow_up === "Yes" ? 1 : 0;
  const prescription_given = pres_tag === "Yes" ? 1 : 0;

  // 🔒 Validate recommendation
  if (!recommendation || recommendation.trim() === "") {
    return res.status(400).json({ message: "Recommendation is required." });
  }

  // 🔒 Validate prescription if required
  if (prescription_given && (!prescription || prescription.trim() === "")) {
    return res.status(400).json({
      message: "Prescription is required when 'Prescription Given' is Yes.",
    });
  }

  const sql = `
    INSERT INTO doctor_recommendations 
      (appointment_id, recommendation, follow_up_required, prescription_given, prescription, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    appointment_id,
    recommendation,
    follow_up_required,
    prescription_given,
    prescription,
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database insert error:", err);
      return res
        .status(500)
        .json({ message: "Failed to save recommendation." });
    }

    // ✅ Update appointment_booking status to "Consulted"
    const updateStatusQuery = `
      UPDATE appointment_booking 
      SET status = 'Consulted' 
      WHERE id = ?
    `;

    connection.query(updateStatusQuery, [appointment_id], (updateErr) => {
      if (updateErr) {
        console.error("Status update error:", updateErr);
        return res.status(500).json({
          message: "Recommendation saved, but failed to update status.",
        });
      }

      res.status(200).json({
        message: "Recommendation saved and status updated to Consulted.",
      });
    });
  });
});

app.get("/getConsultationDetails", (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: user_id" });
  }

  const sql = `
    SELECT 
      ab.booking_date AS consultation_date,
      ab.consultation_type,
      dr.recommendation,
      dr.follow_up_required AS follow_up,
      CONCAT(ui.firstname, ' ', ui.lastname) AS doctor_fullname,
      ab.status AS consultation_status
    FROM appointment_booking ab
    LEFT JOIN doctor_recommendations dr ON ab.id = dr.appointment_id
    LEFT JOIN doctors_profile dp ON ab.doctor_id = dp.id
    LEFT JOIN users_info ui ON ab.doctor_id = ui.id
    INNER JOIN patient_info pi ON ab.patient_id = pi.id
    WHERE 
    ab.status in ("Emergency", "Completed") 
    AND pi.user_id = ?
    ORDER BY ab.booking_date DESC
  `;

  connection.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error("Error fetching consultation details:", err);
      return res
        .status(500)
        .json({ message: "Failed to retrieve consultation details." });
    }
    res.status(200).json({ data: results });
  });
});

app.get("/getPatientInfo", (req, res) => {
  const { patient_user_id } = req.query;

  if (!patient_user_id) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: patient_user_id" });
  }

  const sql = `
    SELECT b.email, a.* 
    FROM patient_info a 
    INNER JOIN account_info b on b.user_id = a.user_id 
    WHERE a.user_id = ?
  `;

  connection.query(sql, [patient_user_id], (err, results) => {
    if (err) {
      console.error("Error fetching patient details:", err);
      return res
        .status(500)
        .json({ message: "Failed to retrieve patient details." });
    }
    res.status(200).json({ data: results });
  });
});

app.post("/updatePatientInfo", (req, res) => {
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
    home_address,
    emergency_name,
    emergency_relationship,
    emergency_mobile_number,
    bloodtype,
    allergies,
    current_medication,
    past_medical_condition,
    chronic_illness,
    email, // from account_info
  } = req.body;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: user_id" });
  }

  // Update patient_info
  const sqlPatient = `
    UPDATE patient_info SET
      firstname = ?,
      middlename = ?,
      lastname = ?,
      gender = ?,
      birthdate = ?,
      age = ?,
      civil_status = ?,
      mobile_number = ?,
      home_address = ?,
      emergency_name = ?,
      emergency_relationship = ?,
      emergency_mobile_number = ?,
      bloodtype = ?,
      allergies = ?,
      current_medication = ?,
      past_medical_condition = ?,
      chronic_illness = ?,
      email_address = ?
    WHERE user_id = ?
  `;

  const patientValues = [
    firstname,
    middlename,
    lastname,
    gender,
    birthdate,
    age,
    civil_status,
    mobile_number,
    home_address,
    emergency_name,
    emergency_relationship,
    emergency_mobile_number,
    bloodtype,
    allergies,
    current_medication,
    past_medical_condition,
    chronic_illness,
    email,
    user_id,
  ];

  connection.query(sqlPatient, patientValues, (err, result) => {
    if (err) {
      console.error("Error updating patient_info:", err);
      return res
        .status(500)
        .json({ message: "Failed to update patient info." });
    }

    // Update account_info email if needed
    const sqlAccount = `UPDATE account_info SET email = ? WHERE user_id = ?`;
    connection.query(sqlAccount, [email, user_id], (err2, result2) => {
      if (err2) {
        console.error("Error updating account_info email:", err2);
        return res.status(500).json({
          message: "Patient info updated, but failed to update email.",
        });
      }

      res
        .status(200)
        .json({ message: "Patient information updated successfully." });
    });
  });
});

app.get("/getInventoryTotal", (req, res) => {
  const query = `
    SELECT 
      a.id, 
      a.item, 
      b.category, 
      a.quantity, 
      a.average_quantity, 
      a.price, 
      a.status,
      (a.quantity * a.price) AS total
    FROM inventory a 
    INNER JOIN inventory_category b ON b.id = a.category;
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err); // good to log actual error on the server side
      return res.status(500).json({ message: "Database error" });
    }

    res.json({ data: results });
  });
});

app.get("/getDoctorsInfo", (req, res) => {
  const { doctor_user_id } = req.query;
  if (!doctor_user_id) {
    return res
      .status(400)
      .json({ message: "Missing required parameter: doctors_id" });
  }

  const sql = `
    SELECT b.email, a.* 
    FROM users_info a 
    INNER JOIN account_info b on b.user_id = a.id 
    WHERE a.id = ?
  `;

  connection.query(sql, [doctor_user_id], (err, results) => {
    if (err) {
      console.error("Error fetching doctor details:", err);
      return res
        .status(500)
        .json({ message: "Failed to retrieve doctor details." });
    }
    res.status(200).json({ data: results });
  });
});




