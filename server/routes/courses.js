const express = require('express');
const Course = require('../models/Course');
const CourseRegistration = require('../models/CourseRegistration');
const Student = require('../models/Student');
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
    const existing = await CourseRegistration.findOne({ student: req.user._id, course: courseId });
    if (existing) {
      if (existing.status === 'active') return res.status(400).json({ message: 'Already registered for this course' });
      existing.status = 'active';
      await existing.save();
      course.enrolledCount += 1;
      await course.save();
      return res.json({ message: 'Registration reactivated successfully' });
    }
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

router.get('/students/all', protect, authorize('lecturer'), async (req, res) => {
  try {
    const allStudents = await Student.find({}).select('-password').sort({ createdAt: -1 }).lean();
    const registrations = await CourseRegistration.find({})
      .populate('course', 'code title')
      .populate('student', 'firstName lastName email studentId department profilePicture')
      .lean();

    const regByStudent = {};
    for (const r of registrations) {
      const sid = r.student?._id?.toString() || r.student?.toString();
      if (!sid) continue;
      if (!regByStudent[sid]) regByStudent[sid] = [];
      regByStudent[sid].push(r);
    }

    const seen = new Set();
    const result = [];
    for (const s of allStudents) {
      const sid = s._id.toString();
      const regs = regByStudent[sid] || [];
      if (regs.length === 0) {
        result.push({
          registrationId: null,
          student: s,
          course: null,
          status: 'not registered',
          studentStatus: s.status,
          registeredAt: null
        });
      } else {
        for (const r of regs) {
          result.push({
            registrationId: r._id,
            student: r.student,
            course: r.course,
            status: r.status,
            studentStatus: s.status,
            registeredAt: r.registeredAt
          });
          seen.add(sid);
        }
      }
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:courseId/students/:studentId/suspend', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const registration = await CourseRegistration.findOne({ student: req.params.studentId, course: req.params.courseId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    registration.status = 'suspended';
    await registration.save();
    course.enrolledCount = Math.max(0, course.enrolledCount - 1);
    await course.save();
    res.json({ message: 'Student suspended successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:courseId/students/:studentId/approve', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const registration = await CourseRegistration.findOne({ student: req.params.studentId, course: req.params.courseId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    registration.status = 'active';
    await registration.save();
    course.enrolledCount += 1;
    await course.save();
    res.json({ message: 'Student approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:courseId/students/:studentId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const registration = await CourseRegistration.findOneAndDelete({ student: req.params.studentId, course: req.params.courseId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (registration.status === 'active') {
      course.enrolledCount = Math.max(0, course.enrolledCount - 1);
      await course.save();
    }
    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:studentId/suspend', protect, authorize('lecturer'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.status = 'suspended';
    await student.save();
    await CourseRegistration.updateMany({ student: req.params.studentId, status: 'active' }, { status: 'suspended' });
    res.json({ message: 'Student account suspended' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:studentId/approve', protect, authorize('lecturer'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.status = 'active';
    await student.save();
    res.json({ message: 'Student account approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/students/:studentId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const { firstName, lastName, email, phone, department, studentId } = req.body;
    if (firstName !== undefined) student.firstName = firstName;
    if (lastName !== undefined) student.lastName = lastName;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (department !== undefined) student.department = department;
    if (studentId !== undefined) student.studentId = studentId;
    await student.save();
    const { password, ...safe } = student.toObject();
    res.json({ message: 'Student updated successfully', student: safe });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/students/:studentId', protect, authorize('lecturer'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const Assignment = require('../models/Assignment');
    const Submission = require('../models/Submission');
    const Grade = require('../models/Grade');
    await Promise.all([
      CourseRegistration.deleteMany({ student: req.params.studentId }),
      Submission.deleteMany({ student: req.params.studentId }),
      Grade.deleteMany({ student: req.params.studentId })
    ]);
    await Student.findByIdAndDelete(req.params.studentId);
    res.json({ message: 'Student and all related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, lecturer: req.user._id });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const Assignment = require('../models/Assignment');
    const Submission = require('../models/Submission');
    const Grade = require('../models/Grade');
    await Promise.all([
      CourseRegistration.deleteMany({ course: course._id }),
      Assignment.deleteMany({ course: course._id }),
      Submission.deleteMany({ course: course._id }),
      Grade.deleteMany({ course: course._id })
    ]);
    await Course.findByIdAndDelete(course._id);
    res.json({ message: 'Course and all related data deleted successfully' });
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
    const totalRegisteredUsers = await Student.countDocuments({});
    res.json({ totalCourses, totalEnrolledStudents: totalStudents.length, activeCourses, totalRegisteredUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
