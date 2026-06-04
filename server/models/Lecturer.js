const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const lecturerSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  staffId: { type: String, required: true, unique: true },
  department: { type: String, default: '' },
  phone: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

lecturerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

lecturerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Lecturer', lecturerSchema);
