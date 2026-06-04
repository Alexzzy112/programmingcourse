const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  cached.conn = null;
  if (!cached.promise) {
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

app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/courses', require('../server/routes/courses'));
app.use('/api/assignments', require('../server/routes/assignments'));
app.use('/api/submissions', require('../server/routes/submissions'));
app.use('/api/grades', require('../server/routes/grades'));

app.get('/api/health', async (req, res) => {
  let dbStatus = mongoose.connection.readyState;
  let dbError = null;
  if (dbStatus !== 1) {
    try { await connectDB(); dbStatus = mongoose.connection.readyState; }
    catch (e) { dbError = e.message; }
  }
  res.json({ status: 'OK', dbState: ['disconnected','connected','connecting','disconnecting'][dbStatus], dbError });
});

app.get('/api/test-db', async (req, res) => {
  try {
    await connectDB();
    const db = mongoose.connection;
    const adminDb = db.db.admin();
    const pingResult = await adminDb.ping();
    res.json({ connected: true, readyState: db.readyState, ping: pingResult });
  } catch (err) {
    res.json({ connected: false, error: err.message, stack: err.stack?.split('\n').slice(0, 2).join('; ') });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Error', error: err.message });
});

module.exports = async (req, res) => {
  try {
    return app(req, res);
  } catch (e) {
    res.status(500).json({ message: 'Unhandled error', error: e.message });
  }
};
