const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/UserSchema.js');
const { Activity, MessageLog } = require('../models/ActivitySchema.js');
const { sendCustomMessage } = require('../middleware/whatsappServices.js');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// @route   GET /api/admin/students
// @desc    Get all registered students
// @access  Admin
router.get('/students', async (req, res) => {
  try {
    const { institution, type, page = 1, limit = 20 } = req.query;
    const filter = { role: 'student' };
    
    if (institution) filter.institutionName = new RegExp(institution, 'i');
    if (type) filter.institutionType = type;

    const students = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      students,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard stats
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    const schoolStudents = await User.countDocuments({ role: 'student', institutionType: 'school' });
    const collegeStudents = await User.countDocuments({ role: 'student', institutionType: 'college' });
    const totalMessages = await MessageLog.countDocuments({ status: 'sent' });
    const thisMonthMessages = await MessageLog.countDocuments({
      status: 'sent',
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });
    const failedMessages = await MessageLog.countDocuments({ status: 'failed' });
    
    // Recent registrations (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentRegistrations = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: lastWeek }
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        schoolStudents,
        collegeStudents,
        totalMessages,
        thisMonthMessages,
        failedMessages,
        recentRegistrations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/send-custom
// @desc    Send custom WhatsApp message to students
// @access  Admin
router.post('/send-custom', async (req, res) => {
  try {
    const { message, targetAudience = 'all', institutionType } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const filter = { role: 'student', isActive: true, whatsappOptIn: true };
    if (institutionType) filter.institutionType = institutionType;

    const users = await User.find(filter);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No active students found' });
    }

    // Create activity log
    const activity = await Activity.create({
      title: `Custom Message - ${new Date().toLocaleDateString('en-IN')}`,
      message,
      type: 'custom',
      targetAudience,
      status: 'pending',
      recipientCount: users.length,
      createdBy: req.user._id
    });

    // Send messages
    const results = await sendCustomMessage(users, message);

    await Activity.findByIdAndUpdate(activity._id, {
      status: 'sent',
      sentAt: new Date(),
      successCount: results.success,
      failedCount: results.failed
    });

    res.json({
      success: true,
      message: `Message sent to ${results.success} students`,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/message-logs
// @desc    Get all message logs
// @access  Admin
router.get('/message-logs', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const logs = await MessageLog.find(filter)
      .populate('userId', 'fullName institutionName institutionType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MessageLog.countDocuments(filter);

    res.json({ success: true, logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/activities
// @desc    Get all scheduled/sent activities
// @access  Admin
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/toggle-student/:id
// @desc    Activate/Deactivate a student
// @access  Admin
router.put('/toggle-student/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    student.isActive = !student.isActive;
    await student.save();

    res.json({
      success: true,
      message: `Student ${student.isActive ? 'activated' : 'deactivated'}`,
      isActive: student.isActive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;