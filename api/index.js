const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 60000);
mongoose.set('heartbeatFrequencyMS', 10000);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('MONGODB_URI environment variable is not set');
}

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { promise: null };
}

mongoose.connection.on('error', err => {
  console.error('Mongoose connection error:', err.message);
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.error('Mongoose disconnected');
  cached.promise = null;
});

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping({ maxTimeMS: 5000 });
      return;
    } catch (e) {
      console.error('MongoDB ping failed, reconnecting...');
      cached.promise = null;
      await mongoose.connection.close().catch(() => {});
    }
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      bufferCommands: false
    });
  }
  await cached.promise;
}

app.use('/api', (req, res, next) => {
  ensureConnected().then(() => next()).catch(e => {
    cached.promise = null;
    res.status(503).json({ message: 'Database unavailable', error: e.message });
  });
});

const authRouter = require('../server/routes/auth');
const coursesRouter = require('../server/routes/courses');
const assignmentsRouter = require('../server/routes/assignments');
const submissionsRouter = require('../server/routes/submissions');
const gradesRouter = require('../server/routes/grades');
const notificationsRouter = require('../server/routes/notifications');

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(503).json({ message: 'Database unavailable', error: err.message });
});

module.exports = app;
