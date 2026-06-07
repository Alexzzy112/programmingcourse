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

app.use('/api', (req, res, next) => {
  ensureConnected().then(() => next()).catch(e => {
    connPromise = null;
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
