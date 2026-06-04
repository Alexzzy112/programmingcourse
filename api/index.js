const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let connPromise = null;

function getDB() {
  if (mongoose.connection.db) return mongoose.connection.db;
  const client = mongoose.connection.getClient();
  return client ? client.db() : null;
}

async function ensureConnected() {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (mongoose.connection.readyState === 1) {
      if (getDB()) return;
      await mongoose.disconnect().catch(() => {});
      connPromise = null;
    } else {
      connPromise = null;
    }

    try {
      connPromise = mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000
      });
      await connPromise;
      connPromise = null;

      if (getDB()) return;

      await mongoose.disconnect().catch(() => {});
    } catch (e) {
      connPromise = null;
      if (attempt === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error('Failed to establish database connection');
}

app.use('/api', async (req, res, next) => {
  try {
    await ensureConnected();
    next();
  } catch (e) {
    connPromise = null;
    next(e);
  }
});

app.post('/api/auth/lecturer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const db = getDB();
    if (!db) return res.status(503).json({ message: 'Server error' });
    const lecturers = db.collection('lecturers');
    const doc = await lecturers.findOne({ email });
    if (!doc) return res.status(401).json({ message: 'Invalid email or password' });
    const bcrypt = require('bcryptjs');
    if (!(await bcrypt.compare(password, doc.password))) return res.status(401).json({ message: 'Invalid email or password' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: doc._id.toString(), role: 'lecturer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.json({ token, user: { id: doc._id.toString(), firstName: doc.firstName, lastName: doc.lastName, email: doc.email, staffId: doc.staffId, role: 'lecturer' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const db = getDB();
    if (!db) return res.status(503).json({ message: 'Server error' });
    const students = db.collection('students');
    const doc = await students.findOne({ email });
    if (!doc) return res.status(401).json({ message: 'Invalid email or password' });
    const bcrypt = require('bcryptjs');
    if (!(await bcrypt.compare(password, doc.password))) return res.status(401).json({ message: 'Invalid email or password' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: doc._id.toString(), role: 'student' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.json({ token, user: { id: doc._id.toString(), firstName: doc.firstName, lastName: doc.lastName, email: doc.email, studentId: doc.studentId, role: 'student' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/lecturer/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, staffId, department, phone } = req.body;
    if (!firstName || !lastName || !email || !password || !staffId) return res.status(400).json({ message: 'All fields required' });
    const db = getDB();
    if (!db) return res.status(503).json({ message: 'Server error' });
    const lecturers = db.collection('lecturers');
    const exists = await lecturers.findOne({ $or: [{ email }, { staffId }] });
    if (exists) return res.status(400).json({ message: 'Lecturer with this email or staff ID already exists' });
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await lecturers.insertOne({ firstName, lastName, email, password: hashedPassword, staffId, department: department || '', phone: phone || '', profilePicture: '', createdAt: new Date() });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: result.insertedId.toString(), role: 'lecturer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.status(201).json({ token, user: { id: result.insertedId.toString(), firstName, lastName, email, staffId, role: 'lecturer' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/student/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, department } = req.body;
    if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const db = getDB();
    if (!db) return res.status(503).json({ message: 'Server error' });
    const students = db.collection('students');
    const exists = await students.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Student with this email already exists' });
    const sid = 'STU' + Date.now().toString(36).toUpperCase();
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await students.insertOne({ firstName, lastName, email, password: hashedPassword, studentId: sid, phone: phone || '', department: department || '', profilePicture: '', createdAt: new Date() });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: result.insertedId.toString(), role: 'student' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.status(201).json({ token, user: { id: result.insertedId.toString(), firstName, lastName, email, studentId: sid, role: 'student' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const authRouter = require('../server/routes/auth');
const coursesRouter = require('../server/routes/courses');
const assignmentsRouter = require('../server/routes/assignments');
const submissionsRouter = require('../server/routes/submissions');
const gradesRouter = require('../server/routes/grades');

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/grades', gradesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.use((err, req, res, next) => {
  res.status(503).json({ message: 'Database unavailable', error: err.message });
});

module.exports = app;
