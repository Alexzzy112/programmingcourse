const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const student = await Student.findById(decoded.id).select('-password');
      const lecturer = await Lecturer.findById(decoded.id).select('-password');
      req.user = student || lecturer;
      req.userRole = decoded.role;
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
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
