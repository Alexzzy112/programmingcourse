const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

function getDB() {
  const client = mongoose.connection.getClient();
  return client ? client.db() : null;
}

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDB();
      if (!db) return res.status(503).json({ message: 'Database not available' });

      let user = null;
      if (decoded.role === 'student') {
        const doc = await db.collection('students').findOne({ _id: new mongoose.Types.ObjectId(decoded.id) }, { projection: { password: 0 } });
        if (doc) { user = { ...doc, _id: doc._id.toString() }; }
      } else {
        const doc = await db.collection('lecturers').findOne({ _id: new mongoose.Types.ObjectId(decoded.id) }, { projection: { password: 0 } });
        if (doc) { user = { ...doc, _id: doc._id.toString() }; }
      }

      req.user = user;
      req.userRole = decoded.role;
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: `Role '${req.userRole}' is not authorized` });
    }
    next();
  };
};

module.exports = { protect, authorize };
