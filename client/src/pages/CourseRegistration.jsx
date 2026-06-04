import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function CourseRegistration() {
  const [courses, setCourses] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    Promise.all([
      api.get('/courses/available'),
      api.get('/courses/registered')
    ]).then(([availRes, regRes]) => {
      setCourses(availRes.data);
      setRegistered(regRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRegister = async (courseId) => {
    try {
      const { data } = await api.post('/courses/register', { courseId });
      setMessage({ type: 'success', text: data.message });
      const [availRes, regRes] = await Promise.all([
        api.get('/courses/available'),
        api.get('/courses/registered')
      ]);
      setCourses(availRes.data);
      setRegistered(regRes.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Registration failed' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDrop = async (courseId) => {
    if (!window.confirm('Are you sure you want to drop this course?')) return;
    try {
      const { data } = await api.post('/courses/drop', { courseId });
      setMessage({ type: 'success', text: data.message });
      const [availRes, regRes] = await Promise.all([
        api.get('/courses/available'),
        api.get('/courses/registered')
      ]);
      setCourses(availRes.data);
      setRegistered(regRes.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to drop course' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const filtered = courses.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Course Registration</h1>
        <p className="text-gray-500">Browse and register for available courses</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search courses by name or code..."
          className="input-field max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-gray-500">No available courses to register</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course._id} className={`card hover:shadow-md transition ${course.enrolledCount >= course.maxStudents ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-1 rounded">{course.code}</span>
                <span className="text-xs text-gray-500">{course.credits} credits</span>
              </div>
              <h3 className="font-semibold mb-1">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description || 'No description'}</p>
              <div className="text-xs text-gray-400 space-y-1 mb-4">
                <p>Lecturer: {course.lecturer?.firstName} {course.lecturer?.lastName}</p>
                <p>Schedule: {course.schedule || 'TBD'}</p>
                <p>Semester: {course.semester}</p>
                <p>Capacity: {course.enrolledCount}/{course.maxStudents}</p>
              </div>
              {course.enrolledCount >= course.maxStudents ? (
                <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">Full</button>
              ) : (
                <button onClick={() => handleRegister(course._id)} className="btn-primary w-full">
                  Register
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {registered.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Currently Registered Courses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registered.map((course) => (
              <div key={course._id} className="card border-l-4 border-l-green-500">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">{course.code}</span>
                  <span className="text-xs text-gray-500">{course.credits} credits</span>
                </div>
                <h3 className="font-semibold mb-1">{course.title}</h3>
                <p className="text-xs text-gray-400 mb-3">Lecturer: {course.lecturer?.firstName} {course.lecturer?.lastName}</p>
                <button onClick={() => handleDrop(course._id)} className="btn-danger w-full text-sm">
                  Drop Course
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
