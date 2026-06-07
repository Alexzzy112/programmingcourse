const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

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

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000
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

app.get('/api/debug/check-db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    let pingResult = 'not attempted';
    let dbInfo = {};
    
    if (state === 1) {
      try {
        const db = mongoose.connection.db;
        pingResult = await db.admin().ping();
      } catch (e) {
        pingResult = `PING FAILED: ${e.message}`;
      }
      
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        dbInfo.collections = collections.map(c => c.name);
      } catch (e) {
        dbInfo.collectionsError = e.message;
      }
    }
    
    res.json({
      uri: mongoURI ? (mongoURI.substring(0, 25) + '...') : 'NOT SET',
      dbState: states[state] || state,
      pingResult,
      dbInfo
    });
  } catch (e) {
    res.json({ error: e.message });
  }
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
  res.status(500).json({ message: 'Server error', error: err.message });
});

module.exports = app;
