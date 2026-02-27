const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Activity, MessageLog } = require('../models/ActivitySchema.js');

// @route   GET /api/activity/my-messages
// @desc    Get logged-in user's message history
// @access  Private
router.get('/my-messages', protect, async (req, res) => {
  try {
    const messages = await MessageLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/activity/stats
// @desc    Get user's message stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const user = req.user;
    const totalMessages = await MessageLog.countDocuments({ userId: user._id, status: 'sent' });

    res.json({
      success: true,
      stats: {
        weekly: user.messagesSent?.weekly || 0,
        monthly: user.messagesSent?.monthly || 0,
        yearly: user.messagesSent?.yearly || 0,
        total: totalMessages,
        lastMessageSent: user.lastMessageSent
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;