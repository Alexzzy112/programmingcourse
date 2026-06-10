import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const [stats, setStats] = useState({ courses: 0, assignments: 0, pendingSubmissions: 0, grades: 0 });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [submitState, setSubmitState] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, assignmentsRes, submissionsRes, gradesRes, notifRes] = await Promise.all([
          api.get('/courses/registered'),
          api.get('/assignments'),
          api.get('/submissions/my-submissions'),
          api.get('/grades/my-grades'),
          api.get('/notifications')
        ]);
        const courses = coursesRes.data;
        const allAssignments = assignmentsRes.data;
        const subs = submissionsRes.data;
        const grades = gradesRes.data;
        const notifications = notifRes.data;

        const registeredCourseIds = courses.map(c => c._id.toString());
        const courseAssignments = allAssignments.filter(a => registeredCourseIds.includes(a.course?._id?.toString()));

        const submittedIds = new Set(subs.map(s => s.assignment?._id?.toString()));
        const pending = courseAssignments.filter(a => !submittedIds.has(a._id.toString()) && new Date(a.dueDate) > new Date());
        const overdue = courseAssignments.filter(a => !submittedIds.has(a._id.toString()) && new Date(a.dueDate) <= new Date());

        setStats({
          courses: courses.length,
          assignments: courseAssignments.length,
          pendingSubmissions: pending.length + overdue.length,
          grades: grades.length
        });

        setSubmissions(subs);
        setPendingAssignments([...pending, ...overdue]);
        setNotifications(notifications.slice(0, 5));

        const sorted = [...courseAssignments].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)).slice(0, 5);
        setRecentAssignments(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileChange = (assignmentId, file) => {
    setSubmitState(prev => ({ ...prev, [assignmentId]: { ...prev[assignmentId], file } }));
    setSubmitError('');
    if (!file) {
      const input = document.getElementById(`file-${assignmentId}`);
      if (input) input.value = '';
    }
  };

  const handleSubmit = async (assignmentId) => {
    const state = submitState[assignmentId] || {};
    const file = state.file;

    if (!file) {
      setSubmitError('Please upload a file');
      return;
    }

    setSubmitting(assignmentId);
    setSubmitError('');
    setSubmitSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId);

    try {
      await api.post('/submissions/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitSuccess(`Assignment submitted successfully!`);
      setPendingAssignments(prev => prev.filter(a => a._id !== assignmentId));
      setSubmitState(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      setStats(prev => ({ ...prev, pendingSubmissions: prev.pendingSubmissions - 1 }));
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-500">Welcome to your academic portal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg sm:text-xl">📚</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.courses}</p>
              <p className="text-sm text-gray-500">Registered Courses</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg sm:text-xl">📋</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.assignments}</p>
              <p className="text-sm text-gray-500">Total Assignments</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 text-lg sm:text-xl">⏳</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.pendingSubmissions}</p>
              <p className="text-sm text-gray-500">Pending Submissions</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-lg sm:text-xl">⭐</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.grades}</p>
              <p className="text-sm text-gray-500">Graded Assignments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/student/courses" className="p-4 bg-primary-50 rounded-lg text-center hover:bg-primary-100 transition">
              <div className="text-2xl mb-1">📚</div>
              <p className="text-sm font-medium text-primary-700">My Courses</p>
            </Link>
            <Link to="/student/course-registration" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
              <div className="text-2xl mb-1">📝</div>
              <p className="text-sm font-medium text-green-700">Register Courses</p>
            </Link>
            <Link to="/student/assignments" className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition">
              <div className="text-2xl mb-1">📤</div>
              <p className="text-sm font-medium text-orange-700">Submit Assignments</p>
            </Link>
            <Link to="/student/grades" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
              <div className="text-2xl mb-1">⭐</div>
              <p className="text-sm font-medium text-purple-700">View Grades</p>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Assignments</h2>
          {recentAssignments.length === 0 ? (
            <p className="text-gray-500 text-sm">No assignments yet</p>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((a) => {
                const now = new Date();
                const due = new Date(a.dueDate);
                const diff = due - now;
                const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 2 && daysLeft > 0;
                const isOverdue = daysLeft <= 0;
                return (
                  <div key={a._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-gray-500">{a.course?.code} - {a.course?.title}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : isUrgent ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {isOverdue ? 'Overdue' : `${daysLeft}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
            <Link to="/student/notifications" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm flex-shrink-0">🔔</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.sender?.firstName} {n.sender?.lastName} · {new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingAssignments.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Submit Pending Assignments</h2>
          {submitError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{submitError}</div>}
          {submitSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{submitSuccess}</div>}
          <div className="space-y-4">
            {pendingAssignments.map((a) => {
              const state = submitState[a._id] || {};
              return (
                <div key={a._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{a.title}</p>
                        <p className="text-xs text-gray-500">{a.course?.code} - Due: {new Date(a.dueDate).toLocaleString()}</p>
                      </div>
                      {new Date(a.dueDate) <= new Date() ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Overdue</span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending</span>
                      )}
                    </div>
                  <label htmlFor={`file-${a._id}`} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-primary-400 transition cursor-pointer mb-2 block">
                    <p className="text-xs text-gray-500 mb-1">Tap to upload PDF/DOCX/TXT</p>
                    <p className="text-xs text-gray-400">Max 1MB</p>
                    <input id={`file-${a._id}`} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleFileChange(a._id, e.target.files[0])} />
                  </label>
                  {state.file && (
                    <div className="mb-3 p-2 bg-primary-50 rounded-lg flex items-center justify-between">
                      <span className="text-xs font-medium">{state.file.name}</span>
                      <button type="button" onClick={() => handleFileChange(a._id, null)} className="text-red-500 text-xs">Remove</button>
                    </div>
                  )}
                  <button
                    onClick={() => handleSubmit(a._id)}
                    disabled={submitting === a._id || !state.file}
                    className="w-full bg-primary-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submitting === a._id ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
