const express = require('express');
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
    const submissionData = {
      assignment: assignmentId,
      student: req.user._id,
      course: assignment.course,
      textContent: '',
      status: isLate ? 'late' : 'submitted'
    };
    if (req.file) {
      submissionData.fileUrl = req.file.originalname;
      submissionData.originalName = req.file.originalname;
      submissionData.fileType = req.file.mimetype;
      submissionData.fileSize = req.file.size;
      submissionData.fileData = req.file.buffer;
    }
    const submission = await Submission.create(submissionData);
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

router.get('/pending', protect, authorize('lecturer'), async (req, res) => {
  try {
    const courseIds = await require('../models/Course').find({ lecturer: req.user._id }).distinct('_id');
    const submissions = await Submission.find({ course: { $in: courseIds }, status: { $in: ['submitted', 'late'] } })
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
      .populate('student', 'firstName lastName email studentId')
      .populate('assignment', 'title')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('assignment');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    const course = await Course.findById(submission.course);
    if (!course || course.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Submission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/download/:submissionId', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (!submission.fileData) return res.status(404).json({ message: 'File not found' });
    res.set('Content-Type', submission.fileType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${submission.originalName || 'file'}"`);
    res.send(submission.fileData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
