const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

mongoose.set('bufferTimeoutMS', 30000);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let connPromise = null;

function ensureConnected() {
  if (!connPromise) {
    connPromise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
  }
  return connPromise;
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

app.post('/api/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const jwt = require('jsonwebtoken');
    const Lecturer = require('../server/models/Lecturer');
    const lecturer = await Lecturer.findOne({ email });
    if (!lecturer) return res.json({ step: 'findOne', found: false, email, jwtSecret: process.env.JWT_SECRET ? 'set' : 'MISSING' });
    const isMatch = await lecturer.matchPassword(password);
    if (!isMatch) return res.json({ step: 'matchPassword', match: false });
    const token = jwt.sign({ id: lecturer._id, role: 'lecturer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
    res.json({ step: 'success', token: token?.substring(0, 20) + '...' });
  } catch (err) {
    res.json({ step: 'error', message: err.message, stack: err.stack?.split('\n').slice(0, 4).join(' | ') });
  }
});

app.use((err, req, res, next) => {
  res.status(503).json({ message: 'Database unavailable', error: err.message });
});

module.exports = app;
