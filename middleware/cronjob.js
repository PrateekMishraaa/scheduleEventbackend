// 📁 backend/middleware/cronjob.js (EVERY 1 MINUTE)
const cron = require('node-cron');
const User = require('../models/UserSchema.js');
const { sendTestMessagesToAll, testTwilioConnection } = require('./testMessage.js');

const startCronJobs = async () => {
  console.log('⏰ Starting Cron Jobs - EVERY 1 MINUTE...');

  // Test Twilio connection first
  const twilioOk = await testTwilioConnection();
  if (!twilioOk) {
    console.log('⚠️ Twilio connection failed. Messages will not be sent until fixed.');
    console.log('⚠️ Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  } else {
    console.log('✅ Twilio ready to send messages');
  }

  // ============================================
  // EVERY 1 MINUTE - Message bhejo
  // Cron: * * * * *  (every minute)
  // ============================================
  cron.schedule('* * * * *', async () => {
    console.log('📨 Running MINUTE-LY message job...', new Date().toLocaleTimeString());
    
    try {
      if (!twilioOk) {
        console.log('⚠️ Skipping messages - Twilio not configured');
        return;
      }
      
      const result = await sendTestMessagesToAll();
      
      if (result.success) {
        console.log(`✅ Minute job completed: ${result.sent}/${result.total} messages sent at ${new Date().toLocaleTimeString()}`);
      } else {
        console.log('⚠️ Minute job completed with issues');
      }
    } catch (error) {
      console.error('❌ Minute cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // OPTIONAL: Har 30 seconds mein heartbeat (for monitoring)
  // ============================================
  cron.schedule('*/30 * * * * *', () => {
    console.log('⏱️  System heartbeat...', new Date().toLocaleTimeString());
  });

  console.log('✅ Cron Jobs Scheduled:');
  console.log('   📱 Message Job → Every 1 minute (at 0 seconds)');
  console.log('   💓 Heartbeat → Every 30 seconds');
  console.log('   📝 Current Time:', new Date().toLocaleTimeString());
  console.log('   📅 Next message job will run at:', new Date(Date.now() + 60000).toLocaleTimeString());
};

module.exports = { startCronJobs };