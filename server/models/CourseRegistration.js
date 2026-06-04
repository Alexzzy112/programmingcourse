const mongoose = require('mongoose');

const courseRegistrationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'dropped', 'completed'], default: 'active' }
}, { bufferCommands: false });

courseRegistrationSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CourseRegistration', courseRegistrationSchema);
