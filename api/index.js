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
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set('bufferCommands', false);
    cached.promise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    }).then(m => m).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  try {
    console.log('Connecting to DB...');
    await connectDB();
    console.log('DB connected, state:', mongoose.connection.readyState);
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(503).json({ message: 'Database connection failed', error: err.message, stack: err.stack });
  }
});

app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/courses', require('../server/routes/courses'));
app.use('/api/assignments', require('../server/routes/assignments'));
app.use('/api/submissions', require('../server/routes/submissions'));
app.use('/api/grades', require('../server/routes/grades'));

app.get('/api/health', async (req, res) => {
  let dbStatus = mongoose.connection.readyState;
  let dbError = null;
  if (dbStatus !== 1) {
    try {
      await connectDB();
      dbStatus = mongoose.connection.readyState;
    } catch (e) {
      dbError = e.message;
    }
  }
  res.json({
    status: 'OK',
    message: 'Course Management API is running',
    dbState: ['disconnected','connected','connecting','disconnecting'][dbStatus] || dbStatus,
    dbError
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    await connectDB();
    const Lecturer = require('../server/models/Lecturer');
    const count = await Lecturer.countDocuments();
    res.json({ connected: true, state: mongoose.connection.readyState, host: mongoose.connection.host, lecturerCount: count });
  } catch (err) {
    res.json({ connected: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3).join('; ') });
  }
});

app.post('/api/test-error', async (req, res) => {
  try {
    const { email, password } = req.body;
    await connectDB();
    const Lecturer = require('../server/models/Lecturer');
    const lecturer = await Lecturer.findOne({ email });
    if (!lecturer) {
      return res.json({ found: false, email });
    }
    const match = await lecturer.matchPassword(password);
    res.json({ found: true, match, jwtSecret: process.env.JWT_SECRET ? 'set' : 'missing', jwtExpire: process.env.JWT_EXPIRE || '30d' });
  } catch (err) {
    res.json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3).join('; ') });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

module.exports = async (req, res) => {
  return app(req, res);
};
