import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function LecturerDashboard() {
  const [stats, setStats] = useState({ totalCourses: 0, totalEnrolledStudents: 0, activeCourses: 0, totalRegisteredUsers: 0 });
  const [recentCourses, setRecentCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [gradeInputs, setGradeInputs] = useState({});
  const [gradeError, setGradeError] = useState('');
  const [gradeSuccess, setGradeSuccess] = useState('');
  const [gradingId, setGradingId] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [submissionsCount, setSubmissionsCount] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, coursesRes, submissionsRes, assignRes] = await Promise.all([
          api.get('/courses/stats'),
          api.get('/courses'),
          api.get('/submissions/pending'),
          api.get('/assignments')
        ]);
        setStats(statsRes.data);
        setRecentCourses(coursesRes.data.slice(0, 5));
        setPendingSubmissions(submissionsRes.data);
        setSubmissionsLoading(false);
        setAssignments(assignRes.data);

        const counts = {};
        const subsResults = await Promise.allSettled(
          assignRes.data.map(a =>
            api.get(`/submissions/assignment/${a._id}`).then(res => ({ id: a._id, data: res.data }))
          )
        );
        for (const r of subsResults) {
          if (r.status === 'fulfilled') {
            counts[r.value.id] = Array.isArray(r.value.data) ? r.value.data.length : 0;
          }
        }
        setSubmissionsCount(counts);
      } catch (err) {
        console.error(err);
        setSubmissionsLoading(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const downloadFile = async (filename) => {
    try {
      const res = await api.get(`/submissions/download/${filename}`, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'];
      let name = filename;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) name = match[1].replace(/['"]/g, '');
      }
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Delete this submission? This action cannot be undone.')) return;
    try {
      await api.delete(`/submissions/${submissionId}`);
      setPendingSubmissions(prev => prev.filter(s => s._id !== submissionId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleGradeSubmit = async (submissionId, totalMarks) => {
    const input = gradeInputs[submissionId] || {};
    const marksObtained = parseFloat(input.marks);
    const feedback = input.feedback || '';

    if (isNaN(marksObtained) || marksObtained < 0) {
      setGradeError('Please enter valid marks');
      return;
    }
    if (marksObtained > totalMarks) {
      setGradeError(`Marks cannot exceed ${totalMarks}`);
      return;
    }

    setGradingId(submissionId);
    setGradeError('');
    setGradeSuccess('');

    try {
      await api.post('/grades', { submissionId, marksObtained, feedback });
      setGradeSuccess('Grade submitted successfully!');
      setPendingSubmissions(prev => prev.filter(s => s._id !== submissionId));
      setGradeInputs(prev => { const n = { ...prev }; delete n[submissionId]; return n; });
    } catch (err) {
      setGradeError(err.response?.data?.message || 'Grading failed');
    } finally {
      setGradingId(null);
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lecturer Dashboard</h1>
        <p className="text-gray-500">Manage your courses and track progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg sm:text-xl">📚</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalCourses}</p>
              <p className="text-sm text-gray-500">Total Courses</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg sm:text-xl">👥</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalEnrolledStudents}</p>
              <p className="text-sm text-gray-500">Enrolled Students</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-lg sm:text-xl">✅</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.activeCourses}</p>
              <p className="text-sm text-gray-500">Active Courses</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-lg sm:text-xl">📋</div>
            <div>
              <p className="text-xl sm:text-2xl font-bold">{stats.totalRegisteredUsers}</p>
              <p className="text-sm text-gray-500">Registered Users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">All Assignments</h2>
          <Link to="/lecturer/assignments" className="text-sm text-primary-600 hover:underline">Manage</Link>
        </div>
        {assignments.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Title</th>
                  <th className="pb-2 pr-3 font-medium">Course</th>
                  <th className="pb-2 pr-3 font-medium">Due Date</th>
                  <th className="pb-2 pr-3 font-medium">Marks</th>
                  <th className="pb-2 pr-3 font-medium">Submissions</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const due = new Date(a.dueDate);
                  const isOverdue = due < new Date();
                  return (
                    <tr key={a._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium">{a.title}</td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{a.course?.code}</td>
                      <td className={`py-3 pr-3 text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {due.toLocaleDateString()} {isOverdue && '⚠'}
                      </td>
                      <td className="py-3 pr-3 text-xs">{a.totalMarks}</td>
                      <td className="py-3 pr-3 text-xs">{submissionsCount[a._id] || 0}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/lecturer/courses" className="p-4 bg-primary-50 rounded-lg text-center hover:bg-primary-100 transition">
              <div className="text-2xl mb-1">📚</div>
              <p className="text-sm font-medium text-primary-700">Manage Courses</p>
            </Link>
            <Link to="/lecturer/assignments" className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition">
              <div className="text-2xl mb-1">📋</div>
              <p className="text-sm font-medium text-orange-700">Assignments</p>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Your Courses</h2>
          {recentCourses.length === 0 ? (
            <p className="text-gray-500 text-sm">No courses yet. Create your first course!</p>
          ) : (
            <div className="space-y-2">
              {recentCourses.map((c) => (
                <Link key={c._id} to={`/lecturer/courses`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div>
                    <p className="font-medium text-sm">{c.code} - {c.title}</p>
                    <p className="text-xs text-gray-500">{c.enrolledCount}/{c.maxStudents} students</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Pending Submissions for Grading</h2>
        {submissionsLoading ? (
          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div></div>
        ) : pendingSubmissions.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending submissions</p>
        ) : (
          <>
            {gradeError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{gradeError}</div>}
            {gradeSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{gradeSuccess}</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-3 font-medium">Student</th>
                    <th className="pb-2 pr-3 font-medium">Assignment</th>
                    <th className="pb-2 pr-3 font-medium">Course</th>
                    <th className="pb-2 pr-3 font-medium">Submitted</th>
                    <th className="pb-2 pr-3 font-medium">Content</th>
                    <th className="pb-2 pr-3 font-medium">Marks / Total</th>
                    <th className="pb-2 font-medium">Feedback</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubmissions.map((s) => {
                    const input = gradeInputs[s._id] || {};
                    return (
                      <tr key={s._id} className="border-b last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium">{s.student?.firstName} {s.student?.lastName}</p>
                          <p className="text-xs text-gray-400">{s.student?.studentId}</p>
                        </td>
                        <td className="py-3 pr-3">{s.assignment?.title}</td>
                        <td className="py-3 pr-3 text-xs">{s.assignment?.course?.code || s.course?.code || '-'}</td>
                        <td className="py-3 pr-3 text-xs">{new Date(s.submittedAt).toLocaleDateString()}</td>
                        <td className="py-3 pr-3">
                          {s.fileUrl && <button onClick={() => downloadFile(s.fileUrl)} className="text-primary-600 underline text-xs">View File</button>}
                          {s.fileUrl && s.textContent && <span className="mx-1 text-gray-300">|</span>}
                          {s.textContent && <span className="text-xs text-gray-600 line-clamp-2" title={s.textContent}>{s.textContent.substring(0, 60)}{s.textContent.length > 60 ? '...' : ''}</span>}
                          {!s.fileUrl && !s.textContent && <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min="0"
                            max={s.assignment?.totalMarks || 100}
                            placeholder={`0/${s.assignment?.totalMarks || 100}`}
                            value={input.marks || ''}
                            onChange={(e) => setGradeInputs(prev => ({ ...prev, [s._id]: { ...prev[s._id], marks: e.target.value } }))}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="text"
                            placeholder="Feedback..."
                            value={input.feedback || ''}
                            onChange={(e) => setGradeInputs(prev => ({ ...prev, [s._id]: { ...prev[s._id], feedback: e.target.value } }))}
                            className="w-28 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleGradeSubmit(s._id, s.assignment?.totalMarks || 100)}
                              disabled={gradingId === s._id}
                              className="bg-green-600 text-white text-xs px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition min-h-[36px]"
                            >
                              {gradingId === s._id ? '...' : 'Grade'}
                            </button>
                            <button onClick={() => handleDeleteSubmission(s._id)} className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition min-h-[36px]">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </Layout>
  );
}
