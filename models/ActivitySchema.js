// 📁 backend/models/ActivitySchema.js (FIXED)
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'custom', 'test'], // ✅ 'test' ADDED
    required: true
  },
  category: {
    type: String,
    enum: ['homework', 'quiz', 'motivational', 'event', 'general', 'exam', 'holiday', 'test'],
    default: 'general'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'school', 'college', 'specific_institution'],
    default: 'all'
  },
  targetInstitution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  scheduledFor: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'partial'],
    default: 'pending'
  },
  recipientCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

const messageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    index: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  phone: String,
  message: String,
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'custom', 'welcome', 'test'], // ✅ 'test' ADDED
    default: 'sent'
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'sent'
  },
  twilioSid: String,
  errorMessage: String,
  deliveredAt: Date,
  readAt: Date
}, {
  timestamps: true
});

// Indexes for faster queries
messageLogSchema.index({ createdAt: -1 });
messageLogSchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
const MessageLog = mongoose.model('MessageLog', messageLogSchema);

module.exports = { Activity, MessageLog };