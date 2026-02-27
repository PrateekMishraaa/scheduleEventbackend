// 📁 backend/middleware/testMessageService.js (FIXED)
const twilio = require('twilio');
const User = require('../models/UserSchema.js');
const { MessageLog } = require('../models/ActivitySchema.js');

let client;

// Initialize Twilio client with better error handling
const getTwilioClient = () => {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }
    
    if (!accountSid.startsWith('AC')) {
      throw new Error('TWILIO_ACCOUNT_SID must start with "AC". Current value: ' + accountSid);
    }
    
    console.log('✅ Twilio client initialized with SID:', accountSid.substring(0, 6) + '...');
    client = twilio(accountSid, authToken);
  }
  return client;
};

// Send WhatsApp message with better error handling
const sendWhatsAppMessage = async (toPhone, message) => {
  try {
    const twilioClient = getTwilioClient();
    const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    console.log(`📤 Sending WhatsApp to ${toPhone} from ${from}`);
    
    const response = await twilioClient.messages.create({
      from,
      to: `whatsapp:${toPhone}`,
      body: message
    });

    console.log(`✅ WhatsApp sent successfully. SID: ${response.sid}`);
    return response;
  } catch (error) {
    console.error('❌ Twilio error:', error.message);
    throw error;
  }
};

// Test messages array
const testMessages = [
  (name) => `🔄 *Test Message 1*\n\nHello ${name}! This is your automated test message. Time: ${new Date().toLocaleTimeString()}`,
  (name) => `⏰ *Test Message 2*\n\nHi ${name}! Your scheduled test is running. Current time: ${new Date().toLocaleTimeString()}`,
  (name) => `📱 *Test Message 3*\n\n${name}, this is an automated WhatsApp test. Timestamp: ${new Date().toLocaleTimeString()}`,
  (name) => `✅ *Test Message 4*\n\nWorking perfectly ${name}! System check at ${new Date().toLocaleTimeString()}`,
  (name) => `🔄 *Test Message 5*\n\nAnother test message for ${name}. Time: ${new Date().toLocaleTimeString()}`,
  (name) => `📊 *System Status*\n\nHello ${name}! Your registration is active. Next message in 10 seconds! Time: ${new Date().toLocaleTimeString()}`,
  (name) => `🎯 *Test Update*\n\n${name}, this is an automated update. System running smoothly at ${new Date().toLocaleTimeString()}`,
  (name) => `⚡ *Quick Test*\n\nHi ${name}! Quick test message. Time: ${new Date().toLocaleTimeString()}`,
  (name) => `📨 *Message Received*\n\n${name}, you're receiving test messages every 10 seconds. Current time: ${new Date().toLocaleTimeString()}`,
  (name) => `🔄 *Loop Test*\n\nTest message #10 for ${name}! Time: ${new Date().toLocaleTimeString()}`
];

// Send test message to a specific user
const sendTestMessage = async (user, messageIndex = null) => {
  try {
    // Random message if index not provided
    const index = messageIndex !== null ? messageIndex : Math.floor(Math.random() * testMessages.length);
    const message = testMessages[index](user.fullName);
    
    console.log(`📨 Preparing to send to ${user.phone} (${user.fullName})`);
    
    const response = await sendWhatsAppMessage(user.phone, message);
    
    // Log the message
    await MessageLog.create({
      userId: user._id,
      phone: user.phone,
      message,
      type: 'test',  // ✅ Now valid because we added 'test' in enum
      status: 'sent',
      twilioSid: response.sid
    });

    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { 
        'messagesSent.custom': 1,
        'totalMessages': 1 
      },
      lastMessageSent: new Date()
    });

    console.log(`✅ Test message sent to ${user.phone} (${user.fullName})`);
    return { success: true, message: 'Sent', user: user.fullName, sid: response.sid };
  } catch (error) {
    console.error(`❌ Failed to send to ${user.phone}:`, error.message);
    
    try {
      await MessageLog.create({
        userId: user._id,
        phone: user.phone,
        type: 'test',  // ✅ Now valid
        status: 'failed',
        errorMessage: error.message
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError.message);
    }
    
    return { success: false, error: error.message, user: user.fullName };
  }
};

// Send test message to all users
const sendTestMessagesToAll = async () => {
  try {
    const users = await User.find({ 
      isActive: true, 
      whatsappOptIn: true,
      role: 'student'
    });
    
    if (users.length === 0) {
      console.log('⚠️ No active users found');
      return { success: false, message: 'No users' };
    }

    console.log(`📨 Sending test messages to ${users.length} users...`);
    
    const results = [];
    for (const user of users) {
      const result = await sendTestMessage(user);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Sent to ${successCount}/${users.length} users`);
    
    return { success: true, total: users.length, sent: successCount };
  } catch (error) {
    console.error('❌ Error sending test messages:', error);
    return { success: false, error: error.message };
  }
};

// Send message to specific phone number
const sendMessageToPhone = async (phone, name = 'Student') => {
  try {
    const index = Math.floor(Math.random() * testMessages.length);
    const message = testMessages[index](name);
    
    const response = await sendWhatsAppMessage(phone, message);
    return response;
  } catch (error) {
    console.error('❌ Error sending to phone:', error);
    throw error;
  }
};

// Test Twilio connection
const testTwilioConnection = async () => {
  try {
    const client = getTwilioClient();
    // Try to fetch account info to test connection
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio connection successful. Account:', account.friendlyName);
    return true;
  } catch (error) {
    console.error('❌ Twilio connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendTestMessage,
  sendTestMessagesToAll,
  sendMessageToPhone,
  testMessages,
  testTwilioConnection
};