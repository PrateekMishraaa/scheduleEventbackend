// 📁 backend/middleware/cronjob.js (FIXED)
const cron = require('node-cron');
const User = require('../models/UserSchema.js');
const { sendTestMessagesToAll, testTwilioConnection } = require('./testMessage.js');

const startCronJobs = async () => {
  console.log('⏰ Starting Cron Jobs - TEST MODE (Every 10 seconds)...');

  // Test Twilio connection first
  const twilioOk = await testTwilioConnection();
  if (!twilioOk) {
    console.log('⚠️ Twilio connection failed. Messages will not be sent until fixed.');
    console.log('⚠️ Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  } else {
    console.log('✅ Twilio ready to send messages');
  }

  // ============================================
  // TEST MODE - Har 10 seconds mein message bhejo
  // Cron: */10 * * * * *  (every 10 seconds)
  // ============================================
  cron.schedule('*/10 * * * * *', async () => {
    console.log('📨 Running TEST message job...', new Date().toLocaleTimeString());
    
    try {
      if (!twilioOk) {
        console.log('⚠️ Skipping messages - Twilio not configured');
        return;
      }
      
      const result = await sendTestMessagesToAll();
      
      if (result.success) {
        console.log(`✅ Test job completed: ${result.sent}/${result.total} messages sent`);
      } else {
        console.log('⚠️ Test job completed with issues');
      }
    } catch (error) {
      console.error('❌ Test cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // OPTIONAL: Har 30 seconds mein log
  // ============================================
  cron.schedule('*/30 * * * * *', () => {
    console.log('⏱️  System heartbeat...', new Date().toLocaleTimeString());
  });

  console.log('✅ Test Cron Jobs Scheduled:');
  console.log('   📱 Test Message Job → Every 10 seconds');
  console.log('   💓 Heartbeat → Every 30 seconds');
  console.log('   📝 Current Time:', new Date().toLocaleTimeString());
};

module.exports = { startCronJobs };