const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let connPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!connPromise) {
    mongoose.set('bufferCommands', false);
    connPromise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    }).catch(err => {
      connPromise = null;
      throw err;
    });
  }
  await connPromise;
}

app.use(async (req, res, next) => {
  if (req.path === '/api/health' || !req.path.startsWith('/api/')) return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable', error: err.message, mongoURI: mongoURI.substring(0, 30) + '...' });
  }
});

app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/courses', require('../server/routes/courses'));
app.use('/api/assignments', require('../server/routes/assignments'));
app.use('/api/submissions', require('../server/routes/submissions'));
app.use('/api/grades', require('../server/routes/grades'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Course Management API is running', dbState: mongoose.connection.readyState, mongoURI: (process.env.MONGODB_URI || 'using_fallback').substring(0, 40) + '...' });
});

app.post('/api/test-body', (req, res) => {
  res.json({ body: req.body, received: true });
});

module.exports = app;
