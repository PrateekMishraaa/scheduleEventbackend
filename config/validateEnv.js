// 📁 config/validateEnv.js (CREATE NEW FILE)
const requiredEnv = [
  'MONGODB_URI',
  'JWT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'FRONTEND_URL'
];

const optionalEnv = [
  'PORT',
  'JWT_EXPIRE',
  'NODE_ENV'
];

const validateEnv = () => {
  const missing = [];
  
  requiredEnv.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Running in development mode with missing variables');
    }
  } else {
    console.log('✅ All required environment variables are set');
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is too short. Use at least 32 characters for better security');
  }

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    console.error('❌ MONGODB_URI should start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }
};

module.exports = validateEnv;