const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  targetAudience: { type: String, enum: ['all', 'course', 'student'], default: 'all' },
  targetCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
