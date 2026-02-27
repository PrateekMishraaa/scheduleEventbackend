// 📁 middleware/whatsappServices.js (COMPLETE FIXED VERSION)
const twilio = require('twilio');
const { MessageLog } = require('../models/ActivitySchema.js');
const User = require('../models/UserSchema.js');

let client;

// Initialize Twilio client
const getTwilioClient = () => {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

// Send a WhatsApp message
const sendWhatsAppMessage = async (toPhone, message) => {
  const twilioClient = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  const response = await twilioClient.messages.create({
    from,
    to: `whatsapp:${toPhone}`,
    body: message
  });

  return response;
};

// Welcome message on registration
const sendWelcomeMessage = async (user) => {
  const message = `🎉 *Welcome to Student Activity Platform!*

Hello *${user.fullName}*! 👋

You have successfully registered. Here's your profile:
🏫 *Institution:* ${user.institutionName}
📚 *Class/Year:* ${user.classYear}
📱 *WhatsApp:* ${user.phone}

You will receive:
✅ *Weekly* activity updates every Monday
✅ *Monthly* goal reminders on 1st of each month
✅ *Yearly* special messages on New Year

Stay motivated and keep learning! 🚀

_Reply STOP to unsubscribe_`;

  const response = await sendWhatsAppMessage(user.phone, message);
  
  // Log welcome message
  await MessageLog.create({
    userId: user._id,
    phone: user.phone,
    message,
    type: 'welcome',
    status: 'sent',
    twilioSid: response.sid
  });

  return response;
};

// Weekly messages templates
const weeklyMessages = [
  (name) => `📚 *Weekly Study Tip - ${new Date().toLocaleDateString('en-IN')}*

Hey *${name}*! 👋

This week's challenge for you:
✨ Spend at least *30 minutes daily* reading
✨ Solve *5 practice problems* per subject
✨ Review your *previous week's notes*

Remember: *Consistency beats intensity!* 💪

Keep going, you're doing great! 🌟`,

  (name) => `🎯 *Weekly Goals Reminder*

Hi *${name}*! 

Have you completed this week's targets?
📖 Reading: ___/7 days
📝 Assignments: ___/all done
🧠 New concept learned: Yes/No

*Set your goals for next week now!*
Small steps lead to big achievements. 🏆

All the best! 🌈`,

  (name) => `💡 *Weekly Motivation - Monday Boost!*

Good Morning *${name}*! ☀️

_"Success is the sum of small efforts repeated day in and day out."_

This week, focus on:
🔹 Time management
🔹 One topic you find difficult
🔹 Helping a classmate understand something

You've got this! 💪🚀`,

  (name) => `📊 *Weekly Progress Check*

Hey *${name}*! 

Take 5 minutes to reflect:
✅ What did you learn this week?
✅ What was challenging?
✅ How can next week be better?

Journaling your progress helps you grow faster! 📓

Keep up the amazing work! 🌟`
];

// Monthly messages templates
const monthlyMessages = [
  (name, month) => `🗓️ *New Month, New Opportunities!*

Hello *${name}*! 

Welcome to *${month}*! 🎊

This month, challenge yourself to:
🎯 Set 3 clear academic goals
📚 Read 1 book or complete 1 online course
💪 Maintain a study schedule
🤝 Participate in 1 school/college activity

*Review your goals at month end!*

Wishing you a productive month ahead! 🚀`,

  (name, month) => `🌟 *Monthly Achievement Review - ${month}*

Hi *${name}*!

As we step into a new month, reflect on:
📈 What skills did you improve last month?
🏆 What was your biggest achievement?
📝 What will you do differently this month?

*Growth mindset = Unlimited potential!* 💡

You're making us proud! ❤️`,
];

// Yearly message
const yearlyMessage = (name, year) => `🎊 *Happy New Year ${year}!*

Dear *${name}*,

As we step into *${year}*, we celebrate your journey with us! 🌟

Last year you were part of something amazing. This year, we wish you:
📚 Greater knowledge and wisdom
🏆 Academic achievements beyond your expectations
💪 Health, happiness, and success
🌈 Beautiful friendships and memories

*Your potential is limitless. This is YOUR year!*

Keep learning, keep growing, keep shining! ✨

With love,
_Student Activity Platform Team_ 🎓`;

// Send weekly messages to all students
const sendWeeklyMessages = async (users, activityId = null) => {
  const results = { success: 0, failed: 0 };
  const msgIndex = Math.floor(Math.random() * weeklyMessages.length);

  for (const user of users) {
    if (!user.whatsappOptIn || !user.isActive) continue;
    
    try {
      const message = weeklyMessages[msgIndex](user.fullName);
      const response = await sendWhatsAppMessage(user.phone, message);
      
      // FIXED: Added activityId
      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        message,
        type: 'weekly',
        status: 'sent',
        twilioSid: response.sid
      });

      // FIXED: Correct increment syntax
      await User.findByIdAndUpdate(user._id, {
        $inc: { 
          'messagesSent.weekly': 1,
          'totalMessages': 1 
        },
        lastMessageSent: new Date()
      });

      results.success++;
    } catch (error) {
      console.error(`Failed to send to ${user.phone}:`, error.message);
      
      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        type: 'weekly',
        status: 'failed',
        errorMessage: error.message
      });

      results.failed++;
    }
  }

  return results;
};

// Send monthly messages to all students
const sendMonthlyMessages = async (users, activityId = null) => {
  const results = { success: 0, failed: 0 };
  const month = new Date().toLocaleString('default', { month: 'long' });
  const msgIndex = Math.floor(Math.random() * monthlyMessages.length);

  for (const user of users) {
    if (!user.whatsappOptIn || !user.isActive) continue;

    try {
      const message = monthlyMessages[msgIndex](user.fullName, month);
      const response = await sendWhatsAppMessage(user.phone, message);

      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        message,
        type: 'monthly',
        status: 'sent',
        twilioSid: response.sid
      });

      await User.findByIdAndUpdate(user._id, {
        $inc: { 
          'messagesSent.monthly': 1,
          'totalMessages': 1 
        },
        lastMessageSent: new Date()
      });

      results.success++;
    } catch (error) {
      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        type: 'monthly',
        status: 'failed',
        errorMessage: error.message
      });
      results.failed++;
    }
  }

  return results;
};

// Send yearly message to all students
const sendYearlyMessages = async (users, activityId = null) => {
  const results = { success: 0, failed: 0 };
  const year = new Date().getFullYear();

  for (const user of users) {
    if (!user.whatsappOptIn || !user.isActive) continue;

    try {
      const message = yearlyMessage(user.fullName, year);
      const response = await sendWhatsAppMessage(user.phone, message);

      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        message,
        type: 'yearly',
        status: 'sent',
        twilioSid: response.sid
      });

      await User.findByIdAndUpdate(user._id, {
        $inc: { 
          'messagesSent.yearly': 1,
          'totalMessages': 1 
        },
        lastMessageSent: new Date()
      });

      results.success++;
    } catch (error) {
      await MessageLog.create({
        userId: user._id,
        activityId, // NOW INCLUDED
        phone: user.phone,
        type: 'yearly',
        status: 'failed',
        errorMessage: error.message
      });
      results.failed++;
    }
  }

  return results;
};

// Send custom message to specific users
const sendCustomMessage = async (users, message, activityId = null) => {
  const results = { success: 0, failed: 0 };

  for (const user of users) {
    try {
      const personalizedMsg = message.replace(/{name}/g, user.fullName);
      const response = await sendWhatsAppMessage(user.phone, personalizedMsg);

      await MessageLog.create({
        userId: user._id,
        activityId,
        phone: user.phone,
        message: personalizedMsg,
        type: 'custom',
        status: 'sent',
        twilioSid: response.sid
      });

      await User.findByIdAndUpdate(user._id, {
        $inc: { 
          'messagesSent.custom': 1,
          'totalMessages': 1 
        },
        lastMessageSent: new Date()
      });

      results.success++;
    } catch (error) {
      await MessageLog.create({
        userId: user._id,
        activityId,
        phone: user.phone,
        type: 'custom',
        status: 'failed',
        errorMessage: error.message
      });
      results.failed++;
    }
  }

  return results;
};

// Verify phone number with OTP
const sendPhoneOTP = async (phone, otp) => {
  const message = `🔐 *Your Student Activity Platform verification code is: ${otp}*\n\nThis code will expire in 10 minutes. Do not share this with anyone.`;
  
  const response = await sendWhatsAppMessage(phone, message);
  return response;
};

module.exports = {
  sendWelcomeMessage,
  sendWeeklyMessages,
  sendMonthlyMessages,
  sendYearlyMessages,
  sendCustomMessage,
  sendWhatsAppMessage,
  sendPhoneOTP
};