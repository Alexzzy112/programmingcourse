const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (mongoose.connection.readyState !== 1) {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://my_course:Alexzzy_11@cluster0.dcfjjzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 });
      }

      let user = null;
      if (decoded.role === 'student') {
        user = await Student.findById(decoded.id).select('-password').lean();
      } else {
        user = await Lecturer.findById(decoded.id).select('-password').lean();
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
