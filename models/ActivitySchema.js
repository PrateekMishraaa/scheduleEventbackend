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
    enum: ['weekly', 'monthly', 'yearly', 'custom'],
    required: true
  },
  category: {
    type: String,
    enum: ['homework', 'quiz', 'motivational', 'event', 'general'],
    default: 'general'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'school', 'college'],
    default: 'all'
  },
  scheduledFor: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
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
  }
}, {
  timestamps: true
});

const messageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  phone: String,
  message: String,
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly', 'custom']
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    default: 'sent'
  },
  twilioSid: String,
  errorMessage: String
}, {
  timestamps: true
});

const Activity = mongoose.model('Activity', activitySchema);
const MessageLog = mongoose.model('MessageLog', messageLogSchema);

module.exports = { Activity, MessageLog };