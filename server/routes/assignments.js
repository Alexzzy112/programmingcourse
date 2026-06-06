const express = require('express');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const CourseRegistration = require('../models/CourseRegistration');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { courseId } = req.query;
    let query = {};
    if (courseId) query.course = courseId;
    if (req.userRole === 'lecturer') {
      const courses = await Course.find({ lecturer: req.user._id }).distinct('_id');
      query.course = courseId || { $in: courses };
    }
    if (req.userRole === 'student') {
      const registeredCourseIds = await CourseRegistration.find({
        student: req.user._id,
        status: 'active'
      }).distinct('course');
      query.course = courseId || { $in: registeredCourseIds };
    }
    const assignments = await Assignment.find(query)
      .populate('course', 'code title')
      .sort({ dueDate: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const assignments = await Assignment.find({ course: req.params.courseId, isActive: true })
      .populate('course', 'code title')
      .sort({ dueDate: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  try {
    const { title, description, courseId, dueDate, totalMarks, instructions, fileTypes, maxFileSize } = req.body;
    const course = await Course.findOne({ _id: courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found or not yours' });
    const assignment = await Assignment.create({
      title, description, course: courseId, lecturer: req.user._id,
      dueDate, totalMarks, instructions, fileTypes, maxFileSize
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, lecturer: req.user._id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const { title, description, dueDate, totalMarks, instructions, isActive } = req.body;
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;
    if (totalMarks) assignment.totalMarks = totalMarks;
    if (instructions !== undefined) assignment.instructions = instructions;
    if (isActive !== undefined) assignment.isActive = isActive;
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, lecturer: req.user._id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
