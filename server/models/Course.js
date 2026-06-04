const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  credits: { type: Number, required: true, min: 1, max: 6 },
  department: { type: String, required: true },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  maxStudents: { type: Number, default: 50 },
  enrolledCount: { type: Number, default: 0 },
  schedule: { type: String, default: '' },
  semester: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
