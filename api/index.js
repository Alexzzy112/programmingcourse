const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

mongoose.set('bufferCommands', true);
mongoose.set('bufferTimeoutMS', 60000);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let connPromise = null;

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!connPromise) {
    connPromise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000
    });
  }
  await connPromise;
}

const authRouter = require('../server/routes/auth');
const coursesRouter = require('../server/routes/courses');
const assignmentsRouter = require('../server/routes/assignments');
const submissionsRouter = require('../server/routes/submissions');
const gradesRouter = require('../server/routes/grades');

app.use('/api', async (req, res, next) => {
  try {
    await ensureConnected();
    next();
  } catch (e) {
    connPromise = null;
    next(e);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/grades', gradesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.post('/api/hard-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ error: 'missing fields' });

    const db = mongoose.connection.db;
    const lecturers = db.collection('lecturers');
    const lecturerDoc = await lecturers.findOne({ email });
    if (!lecturerDoc) return res.json({ error: 'not found', email });

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, lecturerDoc.password);
    if (!isMatch) return res.json({ error: 'wrong password' });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: lecturerDoc._id.toString(), role: 'lecturer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.json({ success: true, token });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') });
  }
});

app.post('/api/seed-admin', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const lecturers = db.collection('lecturers');
    const existing = await lecturers.findOne({ email: 'alexzzy@course.com' });
    if (existing) return res.json({ message: 'admin already exists' });

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Alexzzy11', salt);

    await lecturers.insertOne({
      firstName: 'Alexzzy',
      lastName: 'Admin',
      email: 'alexzzy@course.com',
      password: hashedPassword,
      staffId: 'ADMIN001',
      department: 'Computer Science',
      phone: '',
      profilePicture: '',
      createdAt: new Date()
    });
    res.json({ message: 'admin created' });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  res.status(503).json({ message: 'Database unavailable', error: err.message });
});

module.exports = app;
