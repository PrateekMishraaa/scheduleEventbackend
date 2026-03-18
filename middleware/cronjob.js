// 📁 backend/middleware/cronjob.js (FIXED)
const cron = require('node-cron');
const User = require('../models/UserSchema.js');
const { Activity } = require('../models/ActivitySchema.js');
const { sendWeeklyMessages, sendMonthlyMessages, sendYearlyMessages } = require('./whatsappServices.js');
const { testTwilioConnection } = require('./testMessage.js');

const startCronJobs = async () => {
  console.log('⏰ Starting Cron Jobs...');

  // Test Twilio connection
  const twilioOk = await testTwilioConnection();

  if (!twilioOk) {
    console.log('⚠️ Twilio connection failed. Messages will not be sent.');
    console.log('⚠️ Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  } else {
    console.log('✅ Twilio ready to send messages');
  }

  // ============================================
  // WEEKLY MESSAGE JOB
  // Every Monday at 9:00 AM
  // Cron: 0 9 * * 1
  // ============================================
  cron.schedule('0 9 * * 1', async () => {
    console.log('📨 Running WEEKLY message job...', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    try {
      if (!twilioOk) {
        console.log('⚠️ Skipping messages - Twilio not configured');
        return;
      }

      // Get all active students
      const users = await User.find({ 
        isActive: true, 
        whatsappOptIn: true,
        role: 'student'
      });

      if (users.length === 0) {
        console.log('⚠️ No active students found');
        return;
      }

      // Create activity record
      const activity = await Activity.create({
        title: `Weekly Motivation - ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}`,
        type: 'weekly',
        category: 'motivational',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length,
        scheduledFor: new Date()
      });

      // Send messages
      const results = await sendWeeklyMessages(users, activity._id);

      // Update activity
      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Weekly job completed: ${results.success}/${users.length} messages sent`);
    } catch (error) {
      console.error('❌ Weekly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // MONTHLY MESSAGE JOB
  // 1st of every month at 10:00 AM
  // Cron: 0 10 1 * *
  // ============================================
  cron.schedule('0 10 1 * *', async () => {
    console.log('📨 Running MONTHLY message job...', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    try {
      if (!twilioOk) {
        console.log('⚠️ Skipping messages - Twilio not configured');
        return;
      }

      const users = await User.find({ 
        isActive: true, 
        whatsappOptIn: true,
        role: 'student'
      });

      if (users.length === 0) {
        console.log('⚠️ No active students found');
        return;
      }

      const activity = await Activity.create({
        title: `Monthly Goals - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        type: 'monthly',
        category: 'motivational',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length,
        scheduledFor: new Date()
      });

      const results = await sendMonthlyMessages(users, activity._id);

      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Monthly job completed: ${results.success}/${users.length} messages sent`);
    } catch (error) {
      console.error('❌ Monthly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // YEARLY MESSAGE JOB
  // January 1st at 12:00 PM
  // Cron: 0 12 1 1 *
  // ============================================
  cron.schedule('0 12 1 1 *', async () => {
    console.log('📨 Running YEARLY message job...', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    try {
      if (!twilioOk) {
        console.log('⚠️ Skipping messages - Twilio not configured');
        return;
      }

      const users = await User.find({ 
        isActive: true, 
        whatsappOptIn: true,
        role: 'student'
      });

      if (users.length === 0) {
        console.log('⚠️ No active students found');
        return;
      }

      const activity = await Activity.create({
        title: `New Year ${new Date().getFullYear()} Wishes`,
        type: 'yearly',
        category: 'motivational',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length,
        scheduledFor: new Date()
      });

      const results = await sendYearlyMessages(users, activity._id);

      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Yearly job completed: ${results.success}/${users.length} messages sent`);
    } catch (error) {
      console.error('❌ Yearly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // HEARTBEAT (Optional monitoring)
  // Every minute
  // ============================================
  cron.schedule('*/1 * * * *', () => {
    console.log('⏱️ System heartbeat...', new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
  });

  console.log('✅ Cron Jobs Scheduled:');
  console.log('   📱 Weekly Message → Every Monday at 9:00 AM IST');
  console.log('   📱 Monthly Message → 1st of every month at 10:00 AM IST');
  console.log('   📱 Yearly Message → January 1st at 12:00 PM IST');
  console.log('   💓 Heartbeat → Every minute');
  console.log('   📝 Current Time (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
};

module.exports = { startCronJobs };