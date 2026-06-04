const express = require('express');
const Grade = require('../models/Grade');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  try {
    const { submissionId, marksObtained, feedback } = req.body;
    const submission = await Submission.findById(submissionId).populate('assignment');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    const course = await Course.findOne({ _id: submission.course, lecturer: req.user._id });
    if (!course) return res.status(403).json({ message: 'Not authorized to grade this submission' });
    const totalMarks = submission.assignment.totalMarks;
    if (marksObtained > totalMarks) {
      return res.status(400).json({ message: `Marks cannot exceed ${totalMarks}` });
    }
    const existing = await Grade.findOne({ submission: submissionId });
    if (existing) {
      existing.marksObtained = marksObtained;
      existing.feedback = feedback !== undefined ? feedback : existing.feedback;
      existing.percentage = (marksObtained / totalMarks) * 100;
      existing.gradedBy = req.user._id;
      existing.gradedAt = Date.now();
      await existing.save();
      submission.status = 'graded';
      await submission.save();
      return res.json(existing);
    }
    const grade = await Grade.create({
      student: submission.student,
      assignment: submission.assignment._id,
      course: submission.course,
      submission: submissionId,
      marksObtained,
      totalMarks,
      percentage: (marksObtained / totalMarks) * 100,
      feedback,
      gradedBy: req.user._id
    });
    submission.status = 'graded';
    await submission.save();
    res.status(201).json(grade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-grades', protect, authorize('student'), async (req, res) => {
  try {
    const grades = await Grade.find({ student: req.user._id })
      .populate({ path: 'assignment', select: 'title totalMarks' })
      .populate({ path: 'course', select: 'code title' })
      .sort({ gradedAt: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assignment/:assignmentId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const grades = await Grade.find({ assignment: req.params.assignmentId })
      .populate('student', 'firstName lastName email studentId')
      .populate('assignment', 'title totalMarks')
      .sort({ gradedAt: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/course/:courseId/stats', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const grades = await Grade.find({ course: req.params.courseId });
    const totalAssignments = await Assignment.countDocuments({ course: req.params.courseId });
    const gradedCount = grades.length;
    const avgPercentage = grades.length > 0
      ? grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length
      : 0;
    res.json({ totalAssignments, gradedCount, averagePercentage: Math.round(avgPercentage * 100) / 100 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
