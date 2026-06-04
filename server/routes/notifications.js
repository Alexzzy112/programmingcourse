const express = require('express');
const Notification = require('../models/Notification');
const CourseRegistration = require('../models/CourseRegistration');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  try {
    const { title, message, targetAudience, targetCourse, targetStudent } = req.body;
    const notification = await Notification.create({
      title, message,
      sender: req.user._id,
      targetAudience: targetAudience || 'all',
      targetCourse: targetCourse || null,
      targetStudent: targetStudent || null
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    let notifications;
    if (req.userRole === 'lecturer') {
      notifications = await Notification.find({ sender: req.user._id })
        .populate('sender', 'firstName lastName')
        .sort({ createdAt: -1 });
    } else {
      const courseIds = await CourseRegistration.find({ student: req.user._id, status: 'active' }).distinct('course');
      notifications = await Notification.find({
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'course', targetCourse: { $in: courseIds } },
          { targetAudience: 'student', targetStudent: req.user._id }
        ]
      })
        .populate('sender', 'firstName lastName')
        .populate('targetCourse', 'code title')
        .sort({ createdAt: -1 });
    }
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('lecturer'), async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, sender: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
