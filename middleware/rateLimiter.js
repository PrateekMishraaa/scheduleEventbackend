// // 📁 middleware/rateLimiter.js (FIXED VERSION)
// const rateLimit = require('express-rate-limit');

// // General API limiter
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many requests from this IP, please try again after 15 minutes'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // FIX: Don't use custom keyGenerator, let it use default IP
// });

// // Auth routes limiter (stricter)
// const authLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 10, // 10 attempts per hour
//   message: {
//     success: false,
//     message: 'Too many login/registration attempts, please try again after an hour'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // WhatsApp messages limiter (very strict)
// const whatsappLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 10, // 10 messages per minute
//   message: {
//     success: false,
//     message: 'Too many WhatsApp messages, please slow down'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // FIX: Remove custom keyGenerator, use default
// });

// module.exports = {
//   apiLimiter,
//   authLimiter,
//   whatsappLimiter
// };