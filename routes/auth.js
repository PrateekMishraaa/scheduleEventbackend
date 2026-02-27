const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/UserSchema.js');
const Institution = require('../models/Institution.js');
const { protect } = require('../middleware/auth');
const { sendWelcomeMessage } = require('../middleware/whatsappServices.js');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/create-admin
// @desc    Create first admin (run once only)
// @access  Public - ONE TIME USE
router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists! Use login instead.'
      });
    }

    // Create or find a dummy institution for admin
    let adminInstitution = await Institution.findOne({ name: 'Admin HQ' });
    if (!adminInstitution) {
      adminInstitution = await Institution.create({
        name: 'Admin HQ',
        type: 'college',
        address: { city: 'Delhi', state: 'Delhi' },
        classesOffered: ['N/A']
      });
    }

    const admin = await User.create({
      fullName: 'Platform Admin',
      email: 'admin@platform.com',
      password: 'admin123',
      phone: '+919999999999',
      institution: adminInstitution._id,
      institutionName: adminInstitution.name,
      institutionType: 'college',
      joinCode: adminInstitution.joinCode,
      classYear: 'N/A',
      role: 'admin'
    });

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: '✅ Admin created successfully!',
      credentials: {
        email: 'admin@platform.com',
        password: 'admin123'
      },
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/register
// 📁 backend/routes/auth.js (UPDATED REGISTER API)

// @route   POST /api/auth/register
router.post('/register', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^\+[1-9]\d{9,14}$/).withMessage('Valid phone with country code required'),
  body('schoolName').trim().notEmpty().withMessage('School/College name is required'), // ✅ NEW
  body('className').trim().notEmpty().withMessage('Class/Year is required'), // ✅ NEW
  body('city').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, password, phone, schoolName, className, city } = req.body;

    // Duplicate check
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
      });
    }

    // ✅ Create user with schoolName and className
    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      schoolName,  // ✅ School name save
      className,   // ✅ Class name save
      city: city || '',
      role: 'student'
    });

    // Send WhatsApp welcome message
    try {
      await sendWelcomeMessage(user);
    } catch (whatsappError) {
      console.log('WhatsApp welcome message failed:', whatsappError.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `Welcome ${user.fullName}! Registration successful.`,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        schoolName: user.schoolName,  // ✅ Return school name
        className: user.className,     // ✅ Return class name
        city: user.city,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});
// @route   POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select('+password')
      .populate('institution', 'name type address joinCode board affiliatedTo');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
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
        lastMessageSent: user.lastMessageSent
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('institution', 'name type address joinCode board affiliatedTo');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/auth/update-profile
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { fullName, city, classYear, whatsappOptIn } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, city, classYear, whatsappOptIn },
      { new: true, runValidators: true }
    ).populate('institution', 'name type address joinCode');
    res.json({ success: true, message: 'Profile updated!', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;