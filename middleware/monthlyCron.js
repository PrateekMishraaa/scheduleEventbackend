// 📁 backend/middleware/monthlyCron.js (CREATE THIS FILE)
const cron = require('node-cron');
const { sendMonthlyMessagesToAll } = require('./whatsappServices.js');
const User = require('../models/UserSchema.js');

// Function to check if today is the 1st of month
const isFirstOfMonth = () => {
  const date = new Date();
  return date.getDate() === 1;
};

// Function to get next run time
const getNextRunTime = () => {
  const now = new Date();
  let nextRun = new Date(now.getFullYear(), now.getMonth() + (now.getDate() === 1 ? 0 : 1), 1, 10, 0, 0);
  if (now > nextRun) {
    nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);
  }
  return nextRun;
};

const startMonthlyCron = async () => {
  console.log('📅 Initializing Monthly Message Cron Job...');
  
  // Check Twilio connection first
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio ready for monthly messages');
  } catch (error) {
    console.error('❌ Twilio connection failed for monthly messages:', error.message);
    console.log('⚠️ Monthly messages will not be sent until Twilio is configured');
  }

  // Schedule: Run at 10:00 AM on the 1st of every month
  // Cron expression: 0 10 1 * *
  cron.schedule('0 10 1 * *', async () => {
    console.log('📨 Starting MONTHLY message job...');
    console.log(`📅 Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    try {
      const result = await sendMonthlyMessagesToAll();
      
      if (result.success) {
        console.log(`✅ Monthly job completed successfully:`);
        console.log(`   📊 Total: ${result.total}`);
        console.log(`   ✅ Sent: ${result.sent}`);
        console.log(`   ❌ Failed: ${result.failed || 0}`);
      } else {
        console.log('⚠️ Monthly job completed with issues:', result.message);
      }
      
    } catch (error) {
      console.error('❌ Monthly cron job error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Also schedule a test run at startup (only once, for testing)
  if (process.env.NODE_ENV === 'development') {
    // Wait 1 minute after server start to send test message
    setTimeout(async () => {
      console.log('🧪 Running TEST monthly message (development mode)...');
      try {
        // Send to admin only in development
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
          const { testMonthlyMessage } = require('./whatsappServices.js');
          await testMonthlyMessage(admin.phone, admin.fullName);
          console.log('✅ Test monthly message sent to admin');
        }
      } catch (error) {
        console.error('❌ Test monthly message failed:', error);
      }
    }, 60000); // After 1 minute
  }

  // Calculate and show next run time
  const nextRun = getNextRunTime();
  console.log('\n📅 Monthly Message Schedule:');
  console.log(`   ⏰ Runs at: 10:00 AM IST on the 1st of every month`);
  console.log(`   📅 Next run: ${nextRun.toLocaleString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  })} IST`);
  console.log(`   ✅ Status: Active\n`);
};

module.exports = { startMonthlyCron };