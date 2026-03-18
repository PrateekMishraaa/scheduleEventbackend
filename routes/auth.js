const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/UserSchema.js");
const Institution = require("../models/Institution.js");
const { protect } = require("../middleware/auth");
const { sendWelcomeMessage } = require("../middleware/whatsappServices.js");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @route   POST /api/auth/create-admin
// @desc    Create first admin (run once only)
// @access  Public - ONE TIME USE

// @route   POST /api/auth/register
// 📁 backend/routes/auth.js (UPDATED REGISTER API)

// @route   POST /api/auth/register

// 📁 backend/routes/auth.js (UPDATED REGISTER WITH WHATSAPP WELCOME MESSAGE)

router.post("/register", async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    isPhoneVerified = false,
    schoolName,
    className,
    institution,
    joinCode,
    city = "",
    isActive = true,
    whatsappOptIn = true,
  } = req.body;

  // Validate only required fields
  if (!fullName || !email || !password || !phone || !schoolName || !className) {
    return res.status(400).json({ 
      message: "Missing required fields. Please provide: fullName, email, password, phone, schoolName, className" 
    });
  }

  // Phone number format validation
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ 
      message: "Phone number must include country code (e.g., +919876543210)" 
    });
  }

  // Email format validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: "Please provide a valid email address" 
    });
  }

  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ 
      message: "Password must be at least 6 characters long" 
    });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    // Check if phone is already registered
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone number already registered" });
    }

    // Create new user
    console.log("Creating new user...");
    const newUser = await User.create({
      fullName,
      email,
      password,
      phone,
      isPhoneVerified,
      schoolName,
      className,
      institution: institution || undefined,
      joinCode: joinCode ? joinCode.toUpperCase() : undefined,
      city,
      isActive,
      whatsappOptIn,
      messagesSent: {
        weekly: 0,
        monthly: 0,
        yearly: 0,
        custom: 0
      },
      totalMessages: 0,
      lastMessageSent: null,
      lastLogin: null,
      loginCount: 0
    });

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    console.log('✅ User created successfully:', userResponse.email);

    // ================ SEND WELCOME WHATSAPP MESSAGE ================
  // In your auth.js registration route, add this after user creation:

// Send welcome WhatsApp message
if (whatsappOptIn) {
  try {
    // Import the function
    const { sendRegistrationWelcomeMessage } = require('../middleware/whatsappServices.js');
    
    // Send welcome message asynchronously (don't await)
    sendRegistrationWelcomeMessage(newUser).catch(err => {
      console.error('Background welcome message failed:', err.message);
    });
    
    console.log(`📨 Welcome message queued for ${phone}`);
  } catch (msgError) {
    console.error('Failed to queue welcome message:', msgError.message);
    // Don't fail registration
  }
} else {
      console.log(`📱 WhatsApp opt-out - no welcome message sent to ${phone}`);
    }
    // ================ END WHATSAPP MESSAGE ================

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userResponse,
      whatsappStatus: whatsappOptIn ? "Welcome message queued" : "WhatsApp messages disabled"
    });

  } catch (error) {
    console.error("❌ Registration error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: "Validation error", 
        errors: errors 
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        success: false,
        message: `${field} already exists` 
      });
    }

    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});
// @route   POST /api/auth/login


router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email })
        .select("+password")
        .populate(
          "institution",
          "name type address joinCode board affiliatedTo",
        );

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res
          .status(401)
          .json({ success: false, message: "Account has been deactivated" });
      }

      const token = generateToken(user._id);

      res.json({
        success: true,
        message: "Login successful!",
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          institution: user.institution,
          institutionName: user.institutionName,
          institutionType: user.institutionType,
          classYear: user.classYear,
          city: user.city,
          role: user.role,
          messagesSent: user.messagesSent,
          lastMessageSent: user.lastMessageSent,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error during login" });
    }
  },
);
router.get("/all-users", async (req, res) => {
  try {
    const allusers = await User.find();
    console.log("this is all users", allusers);
    return res
      .status(200)
      .json({ message: "All users fetch from db", allusers });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "institution",
      "name type address joinCode board affiliatedTo",
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT /api/auth/update-profile
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { fullName, city, classYear, whatsappOptIn } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, city, classYear, whatsappOptIn },
      { new: true, runValidators: true },
    ).populate("institution", "name type address joinCode");
    res.json({ success: true, message: "Profile updated!", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
