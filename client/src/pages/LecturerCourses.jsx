import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function LecturerCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', title: '', description: '', credits: 3, department: '', maxStudents: 50, schedule: '', semester: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);

  const fetchCourses = () => {
    api.get('/courses').then(({ data }) => {
      setCourses(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', form);
      setMessage({ type: 'success', text: 'Course created successfully' });
      setShowForm(false);
      setForm({ code: '', title: '', description: '', credits: 3, department: '', maxStudents: 50, schedule: '', semester: '' });
      fetchCourses();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create course' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadStudents = async (courseId) => {
    try {
      const { data } = await api.get(`/courses/${courseId}/students`);
      setStudents(data);
      setSelectedCourse(courses.find(c => c._id === courseId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-sm sm:text-base text-gray-500">Manage your courses and view enrolled students</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm sm:text-base whitespace-nowrap">
          {showForm ? 'Cancel' : '+ New Course'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Course</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Code *</label>
              <input type="text" className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
              <input type="text" className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
              <input type="number" className="input-field" min={1} max={6} value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <input type="text" className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
              <input type="number" className="input-field" min={1} value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
              <input type="text" className="input-field" placeholder="e.g. Mon/Wed 10:00-11:30" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <input type="text" className="input-field" placeholder="e.g. Fall 2024" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Create Course</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {courses.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-500">No courses yet</p>
            </div>
          ) : courses.map((course) => (
            <div key={course._id} className={`card cursor-pointer hover:shadow-md transition ${selectedCourse?._id === course._id ? 'ring-2 ring-primary-500' : ''}`} onClick={() => loadStudents(course._id)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{course.code}</span>
                    <span className="text-xs text-gray-500">{course.credits} credits</span>
                  </div>
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{course.department} - {course.semester}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>👥 {course.enrolledCount}/{course.maxStudents}</span>
                    <span>{course.schedule || 'No schedule'}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${course.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {selectedCourse ? `Students - ${selectedCourse.code}` : 'Select a course'}
          </h2>
          {!selectedCourse ? (
            <p className="text-gray-500 text-sm">Click on a course to view enrolled students</p>
          ) : students.length === 0 ? (
            <p className="text-gray-500 text-sm">No students enrolled yet</p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                    {s.firstName?.[0]}{s.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-500">{s.studentId} - {s.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
