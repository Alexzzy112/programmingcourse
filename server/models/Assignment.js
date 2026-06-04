const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  dueDate: { type: Date, required: true },
  totalMarks: { type: Number, required: true, default: 100 },
  fileTypes: { type: [String], default: ['pdf', 'docx', 'zip', 'png', 'jpg', 'jpeg'] },
  maxFileSize: { type: Number, default: 10 },
  instructions: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
