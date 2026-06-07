const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

// Disable buffering globally and on the default connection immediately
mongoose.set('bufferCommands', false);

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
  if (mongoose.connection.readyState === 1) {
    // Verify connection is alive with a quick operation
    try {
      await mongoose.connection.db.admin().ping({ maxTimeMS: 5000 });
    } catch (e) {
      console.error('Ping failed, reconnecting');
      cached.promise = null;
      await mongoose.connection.close().catch(() => {});
    }
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      bufferCommands: false
    });
    // After connect, ensure all models have buffer=false
    cached.promise = cached.promise.then(() => {
      mongoose.connection.config.bufferCommands = false;
      return mongoose.connection;
    });
  }
  await cached.promise;
}

app.use('/api', (req, res, next) => {
  ensureConnected().then(() => {
    // Force buffer=false on every request for every collection
    mongoose.connection.config.bufferCommands = false;
    for (const key in mongoose.connection.collections) {
      const c = mongoose.connection.collections[key];
      if (c) {
        c.buffer = false;
      }
    }
    next();
  }).catch(e => {
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

app.get('/api/debug/collections', (req, res) => {
  // Check collections before any model access
  const before = Object.keys(mongoose.connection.collections);
  
  // Force models to be loaded
  try { require('../server/models/Student'); } catch(e) {}
  try { require('../server/models/Lecturer'); } catch(e) {}
  
  // Check collections after
  const after = Object.keys(mongoose.connection.collections);
  
  const s = mongoose.connection.collections['students'];
  const l = mongoose.connection.collections['lecturers'];
  
  // Check if connection object used by models is the same
  const Student = require('../server/models/Student');
  
  res.json({
    before_collections: before,
    after_collections: after,
    hasStudentsCollection: !!s,
    hasLecturersCollection: !!l,
    s_buf: s ? s.buffer : 'N/A',
    s_bufCmd: s ? s._shouldBufferCommands() : 'N/A',
    s_opts: s ? JSON.stringify(s.opts) : 'N/A',
    l_buf: l ? l.buffer : 'N/A',
    l_bufCmd: l ? l._shouldBufferCommands() : 'N/A',
    l_opts: l ? JSON.stringify(l.opts) : 'N/A',
    connection_is_connected: mongoose.connection.readyState === 1,
    student_db_name: Student.db ? Student.db.name : 'N/A',
    student_collection_name: Student.collection ? Student.collection.name : 'N/A'
  });
});
  const colls = Object.keys(mongoose.connection.collections);
  const config = JSON.stringify(mongoose.connection.config);
  const globalBuffer = mongoose.get('bufferCommands');
  res.json({
    status: 'OK',
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    config,
    globalBuffer,
    collectionNames: colls,
    hasStudents: 'students' in mongoose.connection.collections,
    hasLecturers: 'lecturers' in mongoose.connection.collections
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

module.exports = app;
