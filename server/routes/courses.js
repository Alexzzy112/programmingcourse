const express = require('express');
const Course = require('../models/Course');
const CourseRegistration = require('../models/CourseRegistration');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { search, department, semester } = req.query;
    let query = { isActive: true };
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
    if (department) query.department = department;
    if (semester) query.semester = semester;
    if (req.userRole === 'lecturer') {
      query.lecturer = req.user._id;
    }
    const courses = await Course.find(query).populate('lecturer', 'firstName lastName staffId');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/available', protect, authorize('student'), async (req, res) => {
  try {
    const registered = await CourseRegistration.find({ student: req.user._id, status: 'active' }).distinct('course');
    const courses = await Course.find({ _id: { $nin: registered }, isActive: true })
      .populate('lecturer', 'firstName lastName staffId')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/registered', protect, authorize('student'), async (req, res) => {
  try {
    const registrations = await CourseRegistration.find({ student: req.user._id, status: 'active' }).populate({
      path: 'course',
      populate: { path: 'lecturer', select: 'firstName lastName staffId' }
    });
    res.json(registrations.map(r => r.course));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!course.isActive) return res.status(400).json({ message: 'Course is not active' });
    if (course.enrolledCount >= course.maxStudents) {
      return res.status(400).json({ message: 'Course is full' });
    }
    const existing = await CourseRegistration.findOne({ student: req.user._id, course: courseId, status: 'active' });
    if (existing) return res.status(400).json({ message: 'Already registered for this course' });
    await CourseRegistration.create({ student: req.user._id, course: courseId });
    course.enrolledCount += 1;
    await course.save();
    res.status(201).json({ message: 'Successfully registered for course' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/drop', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId } = req.body;
    const registration = await CourseRegistration.findOne({ student: req.user._id, course: courseId, status: 'active' });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    registration.status = 'dropped';
    await registration.save();
    const course = await Course.findById(courseId);
    if (course && course.enrolledCount > 0) {
      course.enrolledCount -= 1;
      await course.save();
    }
    res.json({ message: 'Course dropped successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  try {
    const { code, title, description, credits, department, maxStudents, schedule, semester } = req.body;
    const existing = await Course.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'Course code already exists' });
    const course = await Course.create({
      code, title, description, credits, department, lecturer: req.user._id,
      maxStudents, schedule, semester
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const { title, description, credits, maxStudents, schedule, isActive } = req.body;
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (credits) course.credits = credits;
    if (maxStudents) course.maxStudents = maxStudents;
    if (schedule !== undefined) course.schedule = schedule;
    if (isActive !== undefined) course.isActive = isActive;
    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/students', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const registrations = await CourseRegistration.find({ course: req.params.id, status: 'active' })
      .populate('student', 'firstName lastName email studentId department profilePicture');
    res.json(registrations.map(r => r.student));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats', protect, authorize('lecturer'), async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ lecturer: req.user._id });
    const totalStudents = await CourseRegistration.distinct('student', {
      course: { $in: await Course.find({ lecturer: req.user._id }).distinct('_id') },
      status: 'active'
    });
    const activeCourses = await Course.countDocuments({ lecturer: req.user._id, isActive: true });
    res.json({ totalCourses, totalEnrolledStudents: totalStudents.length, activeCourses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
