const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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

app.get('/api/health', async (req, res) => {
  try {
    await ensureConnected();
    res.json({ status: 'OK', dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
  } catch (e) {
    connPromise = null;
    res.json({ status: 'OK', dbState: 'disconnected', error: e.message });
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

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Error', error: err.message });
});

module.exports = async (req, res) => {
  try {
    await ensureConnected();
    return app(req, res);
  } catch (e) {
    connPromise = null;
    if (!res.headersSent) res.status(503).json({ message: 'Unable to connect to database', error: e.message });
  }
};
