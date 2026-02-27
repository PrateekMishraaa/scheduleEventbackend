// 📁 backend/routes/testRoutes.js (CREATE THIS FILE)
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/UserSchema.js');

// Simple test route without Twilio
router.get('/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Check Twilio configuration
router.get('/check-twilio', async (req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    res.json({
      success: true,
      message: 'Twilio configuration status',
      config: {
        hasSid: !!accountSid,
        sidStartsWithAC: accountSid ? accountSid.startsWith('AC') : false,
        sidLength: accountSid ? accountSid.length : 0,
        hasToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        fromNumber: whatsappNumber || 'not set',
        isSandbox: whatsappNumber?.includes('+14155238886') || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test database connection
router.get('/db-test', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      message: 'Database connected',
      stats: {
        totalUsers: userCount,
        database: process.env.MONGODB_URI?.split('@')[1]?.split('/')[0] || 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// Send test message (protected)
router.post('/send-test', protect, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      message: `Test message would be sent to ${user.phone}`,
      note: 'Twilio not fully configured yet'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;