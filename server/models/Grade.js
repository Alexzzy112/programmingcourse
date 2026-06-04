const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  marksObtained: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  feedback: { type: String, default: '' },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  gradedAt: { type: Date, default: Date.now }
}, { bufferCommands: false });

module.exports = mongoose.model('Grade', gradeSchema);
