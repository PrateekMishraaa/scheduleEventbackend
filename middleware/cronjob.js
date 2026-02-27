const cron = require('node-cron');
const User = require('../models/UserSchema.js');
const { Activity } = require('../models/ActivitySchema.js');
const {
  sendWeeklyMessages,
  sendMonthlyMessages,
  sendYearlyMessages
} = require('../middleware/whatsappServices.js');

const startCronJobs = () => {
  console.log('⏰ Starting Cron Jobs...');

  // ============================================
  // WEEKLY - Every Monday at 9:00 AM
  // Cron: 0 9 * * 1  (minute hour day month weekday)
  // ============================================
  cron.schedule('0 9 * * 1', async () => {
    console.log('📨 Running WEEKLY WhatsApp message job...');
    
    try {
      const users = await User.find({ isActive: true, whatsappOptIn: true, role: 'student' });
      
      if (users.length === 0) {
        console.log('No active students found for weekly message');
        return;
      }

      const activity = await Activity.create({
        title: `Weekly Message - ${new Date().toLocaleDateString('en-IN')}`,
        message: 'Weekly activity message',
        type: 'weekly',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length
      });

      const results = await sendWeeklyMessages(users);
      
      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Weekly messages sent: ${results.success} success, ${results.failed} failed`);
    } catch (error) {
      console.error('❌ Weekly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // MONTHLY - 1st of every month at 10:00 AM
  // Cron: 0 10 1 * *
  // ============================================
  cron.schedule('0 10 1 * *', async () => {
    console.log('📨 Running MONTHLY WhatsApp message job...');
    
    try {
      const users = await User.find({ isActive: true, whatsappOptIn: true, role: 'student' });

      if (users.length === 0) {
        console.log('No active students found for monthly message');
        return;
      }

      const month = new Date().toLocaleString('default', { month: 'long' });

      const activity = await Activity.create({
        title: `Monthly Message - ${month} ${new Date().getFullYear()}`,
        message: 'Monthly activity message',
        type: 'monthly',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length
      });

      const results = await sendMonthlyMessages(users);

      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Monthly messages sent: ${results.success} success, ${results.failed} failed`);
    } catch (error) {
      console.error('❌ Monthly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ============================================
  // YEARLY - January 1st at 12:00 AM (midnight)
  // Cron: 0 0 1 1 *
  // ============================================
  cron.schedule('0 0 1 1 *', async () => {
    console.log('🎊 Running YEARLY New Year WhatsApp message job...');
    
    try {
      const users = await User.find({ isActive: true, whatsappOptIn: true, role: 'student' });

      if (users.length === 0) {
        console.log('No active students found for yearly message');
        return;
      }

      const year = new Date().getFullYear();

      const activity = await Activity.create({
        title: `New Year Message - ${year}`,
        message: 'Yearly New Year message',
        type: 'yearly',
        targetAudience: 'all',
        status: 'pending',
        recipientCount: users.length
      });

      const results = await sendYearlyMessages(users);

      await Activity.findByIdAndUpdate(activity._id, {
        status: 'sent',
        sentAt: new Date(),
        successCount: results.success,
        failedCount: results.failed
      });

      console.log(`✅ Yearly New Year messages sent: ${results.success} success, ${results.failed} failed`);
    } catch (error) {
      console.error('❌ Yearly cron job error:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Cron Jobs Scheduled:');
  console.log('   📅 Weekly  → Every Monday 9:00 AM IST');
  console.log('   📅 Monthly → 1st of every month 10:00 AM IST');
  console.log('   📅 Yearly  → January 1st 12:00 AM IST');
};

module.exports = { startCronJobs };