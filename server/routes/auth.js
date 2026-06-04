const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

router.post('/student/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, studentId, phone, department } = req.body;
    const exists = await Student.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Student with this email already exists' });
    const sid = studentId || 'STU' + Date.now().toString(36).toUpperCase();
    if (studentId) {
      const idExists = await Student.findOne({ studentId });
      if (idExists) return res.status(400).json({ message: 'Student ID already exists' });
    }
    const student = await Student.create({ firstName, lastName, email, password, studentId: sid, phone, department });
    const token = generateToken(student._id, 'student');
    res.status(201).json({ token, user: { id: student._id, firstName, lastName, email, studentId: sid, role: 'student' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student || !(await student.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = generateToken(student._id, 'student');
    res.json({ token, user: { id: student._id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, role: 'student' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/lecturer/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, staffId, department, phone } = req.body;
    const exists = await Lecturer.findOne({ $or: [{ email }, { staffId }] });
    if (exists) return res.status(400).json({ message: 'Lecturer with this email or staff ID already exists' });
    const lecturer = await Lecturer.create({ firstName, lastName, email, password, staffId, department, phone });
    const token = generateToken(lecturer._id, 'lecturer');
    res.status(201).json({ token, user: { id: lecturer._id, firstName, lastName, email, staffId, role: 'lecturer' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/lecturer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const lecturer = await Lecturer.findOne({ email });
    if (!lecturer) return res.status(401).json({ message: 'Invalid email or password' });
    const isMatch = await lecturer.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });
    const token = generateToken(lecturer._id, 'lecturer');
    res.json({ token, user: { id: lecturer._id, firstName: lecturer.firstName, lastName: lecturer.lastName, email: lecturer.email, staffId: lecturer.staffId, role: 'lecturer' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/profile', protect, async (req, res) => {
  const user = req.user;
  res.json({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    ...(req.userRole === 'student' ? { studentId: user.studentId } : { staffId: user.staffId }),
    phone: user.phone || '',
    department: user.department || '',
    profilePicture: user.profilePicture || '',
    role: req.userRole
  });
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, department } = req.body;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const collectionName = req.userRole === 'student' ? 'students' : 'lecturers';
    const update = {};
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;
    if (phone !== undefined) update.phone = phone;
    if (department !== undefined) update.department = department;
    const result = await db.collection(collectionName).updateOne(
      { _id: new mongoose.Types.ObjectId(req.user._id) },
      { $set: update }
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
