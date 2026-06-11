const express = require('express');
const path = require('path');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const CourseRegistration = require('../models/CourseRegistration');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', protect, authorize('student'), (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { assignmentId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (!assignment.isActive) return res.status(400).json({ message: 'Assignment is no longer accepting submissions' });
    const registered = await CourseRegistration.findOne({ student: req.user._id, course: assignment.course, status: 'active' });
    if (!registered) return res.status(403).json({ message: 'You are not registered for this course' });
    const existing = await Submission.findOne({ assignment: assignmentId, student: req.user._id });
    if (existing) return res.status(400).json({ message: 'You have already submitted this assignment' });
    const isLate = new Date() > new Date(assignment.dueDate);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname);
    const submissionData = {
      assignment: assignmentId,
      student: req.user._id,
      course: assignment.course,
      fileUrl: uniqueSuffix + ext,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer,
      fileMimeType: req.file.mimetype,
      textContent: '',
      status: isLate ? 'late' : 'submitted'
    };
    const submission = await Submission.create(submissionData);
    const { fileData, ...safeSubmission } = submission.toObject();
    res.status(201).json(safeSubmission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-submissions', protect, authorize('student'), async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .select('-fileData')
      .populate({ path: 'assignment', populate: { path: 'course', select: 'code title' } })
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assignment/:assignmentId', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const course = await Course.findById(assignment.course);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.userRole === 'student') {
      const submission = await Submission.findOne({ assignment: req.params.assignmentId, student: req.user._id })
        .select('-fileData')
        .populate({ path: 'assignment', populate: { path: 'course', select: 'code title' } });
      return res.json(submission || null);
    }
    if (req.userRole === 'lecturer' && course.lecturer.toString() === req.user._id.toString()) {
      const submissions = await Submission.find({ assignment: req.params.assignmentId })
        .select('-fileData')
        .populate('student', 'firstName lastName email studentId')
        .sort({ submittedAt: -1 });
      return res.json(submissions);
    }
    res.status(403).json({ message: 'Not authorized' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', protect, authorize('lecturer'), async (req, res) => {
  try {
    const courseIds = await Course.find({ lecturer: req.user._id }).distinct('_id');
    const submissions = await Submission.find({ course: { $in: courseIds }, status: { $in: ['submitted', 'late'] } })
      .select('-fileData')
      .populate('student', 'firstName lastName email studentId')
      .populate({ path: 'assignment', select: 'title totalMarks dueDate', populate: { path: 'course', select: 'code title' } })
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/course/:courseId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const submissions = await Submission.find({ course: req.params.courseId })
      .select('-fileData')
      .populate('student', 'firstName lastName email studentId')
      .populate('assignment', 'title')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/download/:filename', protect, async (req, res) => {
  try {
    const submission = await Submission.findOne({ fileUrl: req.params.filename }).populate('course');
    if (!submission || !submission.fileData) return res.status(404).json({ message: 'File not found' });

    if (req.userRole === 'student' && submission.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to download this file' });
    }

    if (req.userRole === 'lecturer') {
      const course = await Course.findById(submission.course._id || submission.course);
      if (!course || course.lecturer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to download this file' });
      }
    }

    const originalName = submission.originalName || req.params.filename;
    const fileBuffer = Buffer.isBuffer(submission.fileData) ? submission.fileData : Buffer.from(submission.fileData);
    res.set('Content-Disposition', `attachment; filename="${originalName}"`);
    res.set('Content-Type', submission.fileMimeType || 'application/octet-stream');
    res.set('Content-Length', fileBuffer.length.toString());
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
});

router.delete('/:submissionId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('course');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const course = submission.course;
    if (!course || course.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this submission' });
    }

    const Grade = require('../models/Grade');
    await Grade.deleteMany({ submission: req.params.submissionId });
    await Submission.findByIdAndDelete(req.params.submissionId);

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
