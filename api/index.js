const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return;
  cached.conn = null;
  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    }).then(m => {
      cached.conn = m;
      return m;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  await cached.promise;
}

app.get('/api/health', async (req, res) => {
  let dbStatus = mongoose.connection.readyState;
  let dbError = null;
  if (dbStatus !== 1) {
    try { await connectDB(); dbStatus = mongoose.connection.readyState; }
    catch (e) { dbError = e.message; }
  }
  res.json({ status: 'OK', dbState: ['disconnected','connected','connecting','disconnecting'][dbStatus] || 'unknown', dbError });
});

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable', error: err.message });
  }
});

app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/courses', require('../server/routes/courses'));
app.use('/api/assignments', require('../server/routes/assignments'));
app.use('/api/submissions', require('../server/routes/submissions'));
app.use('/api/grades', require('../server/routes/grades'));

app.post('/api/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    await connectDB();
    const jwt = require('jsonwebtoken');
    const Lecturer = require('../server/models/Lecturer');
    const step1 = 'models loaded';
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
  res.status(500).json({ message: 'Error', error: err.message });
});

module.exports = async (req, res) => {
  try {
    return app(req, res);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ message: 'Unhandled error', error: e.message });
  }
};
