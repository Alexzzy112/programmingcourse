const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('MONGODB_URI environment variable is not set');
}

let connPromise = null;

async function ensureConnected() {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    connPromise = null;

    try {
      connPromise = mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000
      });
      await connPromise;
      connPromise = null;
      return;
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

let authRouter, coursesRouter, assignmentsRouter, submissionsRouter, gradesRouter, notificationsRouter;
try {
  authRouter = require('../server/routes/auth');
  coursesRouter = require('../server/routes/courses');
  assignmentsRouter = require('../server/routes/assignments');
  submissionsRouter = require('../server/routes/submissions');
  gradesRouter = require('../server/routes/grades');
  notificationsRouter = require('../server/routes/notifications');
} catch (e) {
  console.error('Failed to load route modules:', e);
  throw e;
}

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.post('/api/debug', express.json(), (req, res) => {
  try {
    res.json({ body: req.body, jwt: process.env.JWT_SECRET ? 'exists' : 'missing', mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/debug', (req, res) => {
  res.json({ message: 'debug get works', jwt: process.env.JWT_SECRET ? 'exists' : 'missing' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(503).json({ message: 'Database unavailable', error: err.message, stack: err.stack });
});

module.exports = app;
