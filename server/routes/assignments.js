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
    if (req.userRole === 'lecturer') {
      const myCourses = await Course.find({ lecturer: req.user._id }).distinct('_id');
      if (courseId) {
        if (!myCourses.some(id => id.toString() === courseId)) {
          return res.status(403).json({ message: 'Not authorized to access this course' });
        }
        query.course = courseId;
      } else {
        query.course = { $in: myCourses };
      }
    }
    if (req.userRole === 'student') {
      const registeredCourseIds = await CourseRegistration.find({
        student: req.user._id,
        status: 'active'
      }).distinct('course');
      if (registeredCourseIds.length === 0) {
        return res.json([]);
      }
      if (courseId) {
        if (!registeredCourseIds.some(id => id.toString() === courseId)) {
          return res.status(403).json({ message: 'Not registered for this course' });
        }
        query.course = courseId;
      } else {
        query.course = { $in: registeredCourseIds };
      }
      query.isActive = true;
    }
    const assignments = await Assignment.find(query)
      .populate('course', 'code title')
      .sort({ dueDate: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('course', 'code title');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (req.userRole === 'lecturer') {
      const course = await Course.findById(assignment.course);
      if (!course || course.lecturer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    if (req.userRole === 'student') {
      const registered = await CourseRegistration.findOne({ student: req.user._id, course: assignment.course, status: 'active' });
      if (!registered) return res.status(403).json({ message: 'Not registered for this course' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/course/:courseId', protect, async (req, res) => {
  try {
    if (req.userRole === 'student') {
      const registered = await CourseRegistration.findOne({
        student: req.user._id,
        course: req.params.courseId,
        status: 'active'
      });
      if (!registered) return res.status(403).json({ message: 'Not registered for this course' });
    }
    if (req.userRole === 'lecturer') {
      const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
      if (!course) return res.status(403).json({ message: 'Not authorized to access this course' });
    }
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
