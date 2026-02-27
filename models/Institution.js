const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Institution name is required'],
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['school', 'college'],
    required: [true, 'Institution type is required']
  },
  code: {
    // Unique short code like "DPS-001", "IIT-DEL"
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },

  // Location
  address: {
    street: { type: String, trim: true },
    city:   { type: String, trim: true, required: true },
    state:  { type: String, trim: true, required: true },
    pincode:{ type: String, trim: true },
    country:{ type: String, default: 'India' }
  },

  // Contact
  contact: {
    email:   { type: String, lowercase: true, trim: true },
    phone:   { type: String, trim: true },
    website: { type: String, trim: true }
  },

  // Board / Affiliation (for schools)
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board', 'IB', 'Other', 'N/A'],
    default: 'N/A'
  },

  // University / Affiliation (for colleges)
  affiliatedTo: {
    type: String,
    trim: true   // e.g. "Delhi University", "AKTU"
  },

  // Classes offered
  classesOffered: [{
    type: String  // e.g. "Class 6", "Class 10", "1st Year", "2nd Year"
  }],

  // Admin/Principal details
  principalName: {
    type: String,
    trim: true
  },

  // Unique join code students use during registration
  joinCode: {
    type: String,
    unique: true,
    uppercase: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Logo URL (optional)
  logoUrl: {
    type: String
  },

  // Stats (auto-updated)
  totalStudents: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-generate unique joinCode before saving
institutionSchema.pre('save', function(next) {
  if (!this.joinCode) {
    // e.g. "SCH-A3F9" or "CLG-B2D8"
    const prefix = this.type === 'school' ? 'SCH' : 'CLG';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.joinCode = `${prefix}-${random}`;
  }
  next();
});

// Virtual: get all students of this institution
institutionSchema.virtual('students', {
  ref: 'User',
  localField: '_id',
  foreignField: 'institution'
});

institutionSchema.set('toJSON', { virtuals: true });
institutionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Institution', institutionSchema);