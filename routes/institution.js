// 📁 routes/institution.js (CREATE NEW FILE)
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Institution = require('../models/Institution.js');
const User = require('../models/UserSchema.js');

// @route   POST /api/institutions
// @desc    Create new institution (Admin only)
// @access  Private/Admin
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { 
      name, type, address, contact, board, 
      affiliatedTo, classesOffered, principalName 
    } = req.body;

    // Check if institution already exists
    const existingInst = await Institution.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: req.body.code }
      ]
    });

    if (existingInst) {
      return res.status(400).json({ 
        success: false, 
        message: 'Institution with this name or code already exists' 
      });
    }

    const institution = await Institution.create({
      name,
      type,
      code: req.body.code || undefined,
      address,
      contact,
      board: board || 'N/A',
      affiliatedTo,
      classesOffered: classesOffered || [],
      principalName,
      joinCode: req.body.joinCode || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Institution created successfully',
      institution
    });
  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/institutions
// @desc    Get all institutions (with filters)
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { type, city, state, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');

    const institutions = await Institution.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Institution.countDocuments(filter);

    // Get student counts for each institution
    const institutionsWithStats = await Promise.all(
      institutions.map(async (inst) => {
        const studentCount = await User.countDocuments({ 
          institution: inst._id,
          role: 'student'
        });
        return {
          ...inst.toObject(),
          studentCount
        };
      })
    );

    res.json({
      success: true,
      institutions: institutionsWithStats,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/institutions/:id
// @desc    Get single institution details
// @access  Private/Admin
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    
    if (!institution) {
      return res.status(404).json({ 
        success: false, 
        message: 'Institution not found' 
      });
    }

    // Get students list
    const students = await User.find({ 
      institution: institution._id,
      role: 'student'
    }).select('-password').sort({ createdAt: -1 }).limit(50);

    // Get stats
    const totalStudents = await User.countDocuments({ 
      institution: institution._id,
      role: 'student'
    });
    
    const activeStudents = await User.countDocuments({ 
      institution: institution._id,
      role: 'student',
      isActive: true
    });

    const messagesSent = await User.aggregate([
      { $match: { institution: institution._id, role: 'student' } },
      { $group: { 
        _id: null,
        totalMessages: { $sum: '$totalMessages' },
        weekly: { $sum: '$messagesSent.weekly' },
        monthly: { $sum: '$messagesSent.monthly' },
        yearly: { $sum: '$messagesSent.yearly' }
      }}
    ]);

    res.json({
      success: true,
      institution,
      stats: {
        totalStudents,
        activeStudents,
        inactiveStudents: totalStudents - activeStudents,
        messages: messagesSent[0] || { totalMessages: 0, weekly: 0, monthly: 0, yearly: 0 }
      },
      recentStudents: students
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/institutions/:id
// @desc    Update institution
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!institution) {
      return res.status(404).json({ 
        success: false, 
        message: 'Institution not found' 
      });
    }

    res.json({
      success: true,
      message: 'Institution updated successfully',
      institution
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/institutions/:id
// @desc    Delete institution (Admin only - careful!)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    // Check if institution has students
    const studentCount = await User.countDocuments({ 
      institution: req.params.id 
    });

    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete institution with ${studentCount} students. Transfer or delete students first.`
      });
    }

    const institution = await Institution.findByIdAndDelete(req.params.id);

    if (!institution) {
      return res.status(404).json({ 
        success: false, 
        message: 'Institution not found' 
      });
    }

    res.json({
      success: true,
      message: 'Institution deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/institutions/join-code/:code
// @desc    Validate join code (public for registration)
// @access  Public
router.get('/join-code/:code', async (req, res) => {
  try {
    const institution = await Institution.findOne({ 
      joinCode: req.params.code.toUpperCase(),
      isActive: true
    }).select('name type address classesOffered');

    if (!institution) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid join code' 
      });
    }

    res.json({
      success: true,
      institution: {
        id: institution._id,
        name: institution.name,
        type: institution.type,
        city: institution.address?.city,
        classesOffered: institution.classesOffered
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/institutions/:id/regenerate-code
// @desc    Regenerate join code
// @access  Private/Admin
router.post('/:id/regenerate-code', protect, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    
    if (!institution) {
      return res.status(404).json({ 
        success: false, 
        message: 'Institution not found' 
      });
    }

    // Generate new code
    const prefix = institution.type === 'school' ? 'SCH' : 'CLG';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    institution.joinCode = `${prefix}-${random}`;
    
    await institution.save();

    res.json({
      success: true,
      message: 'Join code regenerated successfully',
      joinCode: institution.joinCode
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;