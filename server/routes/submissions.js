const express = require('express');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const CourseRegistration = require('../models/CourseRegistration');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', protect, authorize('student'), upload.single('file'), async (req, res) => {
  try {
    const { assignmentId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (!assignment.isActive) return res.status(400).json({ message: 'Assignment is no longer accepting submissions' });
    const registered = await CourseRegistration.findOne({ student: req.user._id, course: assignment.course, status: 'active' });
    if (!registered) return res.status(403).json({ message: 'You are not registered for this course' });
    const existing = await Submission.findOne({ assignment: assignmentId, student: req.user._id });
    if (existing) return res.status(400).json({ message: 'You have already submitted this assignment' });
    const isLate = new Date() > new Date(assignment.dueDate);
    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user._id,
      course: assignment.course,
      fileUrl: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      status: isLate ? 'late' : 'submitted'
    });
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-submissions', protect, authorize('student'), async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
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
        .populate({ path: 'assignment', populate: { path: 'course', select: 'code title' } });
      return res.json(submission || null);
    }
    if (req.userRole === 'lecturer' && course.lecturer.toString() === req.user._id.toString()) {
      const submissions = await Submission.find({ assignment: req.params.assignmentId })
        .populate('student', 'firstName lastName email studentId')
        .sort({ submittedAt: -1 });
      return res.json(submissions);
    }
    res.status(403).json({ message: 'Not authorized' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/course/:courseId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const submissions = await Submission.find({ course: req.params.courseId })
      .populate('student', 'firstName lastName email studentId')
      .populate('assignment', 'title')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/download/:filename', protect, (req, res) => {
  const filePath = require('path').join(__dirname, '../uploads', req.params.filename);
  res.download(filePath);
});

module.exports = router;
