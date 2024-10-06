const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();
const app = express();
const PORT = 4200;

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());

// Nodemailer configuration
// https://medium.com/@y.mehnati_49486/how-to-send-an-email-from-your-gmail-account-with-nodemailer-837bf09a7628
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  maxMessages: Infinity,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});
transporter.verify().then(console.log).catch(console.error);
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Set up session middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Dummy user data for authentication
const users = []; // username password
app.get("/", (req, res) => {
  res.send("Welcome to the Api");
});

// Authentication route
app.post("/login", async (req, res) => {
  if (req.session.user) {
    return res.status(200).send("Already logged in");
  }
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && bcrypt.compareSync(password, u.password)
  );
  if (user) {
    req.session.user = user;
    res.status(200).send("Login successful " + JSON.stringify(req.session));
  } else {
    res.status(401).send("Invalid credentials");
  }
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).send("Unauthorized");
  }
}

const sendMail = async ({ username, password }) => {
  try {
    // Check if user already exists in mock database
    let user = users.find((user) => user === username);
    if (user) {
      return { status: 400, msg: "User already exists" };
    }

    // Create new user object
    user = {
      username,
      password: await bcrypt.hash(password, 10), // Hash password
    };

    // Store user in mock database
    users.push(user);

    // Send a signup confirmation email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: username,
      subject: "Welcome to Our App!",
      text: `Hi ${username},\n\nThank you for signing up!\n\nBest regards,\nOur Team`,
    };
    const info = await transporter.sendMail(mailOptions);
    return "Email sent"
  } catch (error) {
    console.error(error);
    return { status: 500, msg: "Server error" };
  }
};

// Route to send confirmation email after signup
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const response = await sendMail({ username, password });
  res.status(200);
  res.send(response);
});

// Protected route
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.send(`Welcome to the dashboard, ${req.session.user.username}`);
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out");
    }
    res.clearCookie("connect.sid");
    res.send("Logged out successfully");
  });
});

// Check if the user is authenticated
app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    return res
      .status(200)
      .json({ authenticated: true, user: req.session.user });
  } else {
    return res.status(200).json({ authenticated: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
