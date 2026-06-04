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

  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentActionMsg, setStudentActionMsg] = useState('');
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [submissionsCount, setSubmissionsCount] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, coursesRes, submissionsRes, studentsRes, assignRes] = await Promise.all([
          api.get('/courses/stats'),
          api.get('/courses'),
          api.get('/submissions/pending'),
          api.get('/courses/students/all'),
          api.get('/assignments')
        ]);
        setStats(statsRes.data);
        setRecentCourses(coursesRes.data.slice(0, 5));
        setPendingSubmissions(submissionsRes.data);
        setSubmissionsLoading(false);
        setAllStudents(studentsRes.data);
        setStudentsLoading(false);
        setAssignments(assignRes.data);

        const counts = {};
        for (const a of assignRes.data) {
          try {
            const subs = await api.get(`/submissions/assignment/${a._id}`);
            counts[a._id] = Array.isArray(subs.data) ? subs.data.length : 0;
          } catch { counts[a._id] = 0; }
        }
        setSubmissionsCount(counts);
      } catch (err) {
        console.error(err);
        setSubmissionsLoading(false);
        setStudentsLoading(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const handleStudentAction = async (studentId, courseId, action) => {
    setStudentActionMsg('');
    try {
      let res;
      if (action === 'suspend') {
        if (courseId) {
          res = await api.put(`/courses/${courseId}/students/${studentId}/suspend`);
        } else {
          res = await api.put(`/courses/students/${studentId}/suspend`);
        }
      } else if (action === 'approve') {
        if (courseId) {
          res = await api.put(`/courses/${courseId}/students/${studentId}/approve`);
        } else {
          res = await api.put(`/courses/students/${studentId}/approve`);
        }
      } else if (action === 'delete') {
        if (courseId) {
          res = await api.delete(`/courses/${courseId}/students/${studentId}`);
        } else {
          res = await api.delete(`/courses/students/${studentId}`);
        }
      }
      setStudentActionMsg(res.data.message);
      const updated = await api.get('/courses/students/all');
      setAllStudents(updated.data);
    } catch (err) {
      setStudentActionMsg(err.response?.data?.message || 'Action failed');
    }
  };

  const openView = (s) => setViewStudent(s);

  const openEdit = (s) => {
    setEditForm({
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      email: s.email || '',
      phone: s.phone || '',
      department: s.department || '',
      studentId: s.studentId || ''
    });
    setEditStudent(s);
  };

  const handleEditChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setStudentActionMsg('');
    try {
      const res = await api.put(`/courses/students/${editStudent._id}`, editForm);
      setStudentActionMsg(res.data.message);
      setEditStudent(null);
      const { data } = await api.get('/courses/students/all');
      setAllStudents(data);
    } catch (err) {
      setStudentActionMsg(err.response?.data?.message || 'Update failed');
    } finally {
      setEditLoading(false);
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
                          {s.fileUrl && <a href={`/api/submissions/download/${s.fileUrl}`} className="text-primary-600 underline text-xs" target="_blank">View File</a>}
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
                          <button
                            onClick={() => handleGradeSubmit(s._id, s.assignment?.totalMarks || 100)}
                            disabled={gradingId === s._id}
                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 transition"
                          >
                            {gradingId === s._id ? '...' : 'Grade'}
                          </button>
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

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Student Management</h2>
        {studentActionMsg && <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">{studentActionMsg}</div>}
        {studentsLoading ? (
          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div></div>
        ) : allStudents.length === 0 ? (
          <p className="text-gray-500 text-sm">No registered users</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Student</th>
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">ID</th>
                  <th className="pb-2 pr-3 font-medium">Course</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Account</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allStudents.map((item, idx) => {
                  const student = item.student;
                  const course = item.course;
                  const studentIsSuspended = item.studentStatus === 'suspended';
                  return (
                    <tr key={item.registrationId || `unreg-${student?._id}-${idx}`} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{student?.firstName} {student?.lastName}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{student?.email}</td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{student?.studentId}</td>
                      <td className="py-3 pr-3 text-xs">{course?.code || '—'}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${studentIsSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {studentIsSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 flex gap-1 flex-wrap">
                        <button onClick={() => openView(student)} className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition">View</button>
                        <button onClick={() => openEdit(student)} className="bg-indigo-500 text-white text-xs px-2 py-1 rounded hover:bg-indigo-600 transition">Edit</button>
                        {studentIsSuspended ? (
                          <button onClick={() => handleStudentAction(student._id, null, 'approve')} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition">Un-suspend</button>
                        ) : (
                          <button onClick={() => handleStudentAction(student._id, null, 'suspend')} className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600 transition">Suspend</button>
                        )}
                        <button onClick={() => handleStudentAction(student._id, null, 'delete')} className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition">Delete</button>
                        {course && item.status === 'suspended' && (
                          <button onClick={() => handleStudentAction(student._id, course._id, 'approve')} className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition">Approve Course</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewStudent(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewStudent(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            <h2 className="text-lg font-bold mb-4">Student Details</h2>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                {viewStudent.firstName?.[0]}{viewStudent.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold">{viewStudent.firstName} {viewStudent.lastName}</p>
                <p className="text-xs text-gray-500">{viewStudent.studentId}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{viewStudent.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{viewStudent.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span>{viewStudent.department || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Account Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${viewStudent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewStudent.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditStudent(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditStudent(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            <h2 className="text-lg font-bold mb-4">Edit Student</h2>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input type="text" name="firstName" value={editForm.firstName} onChange={handleEditChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input type="text" name="lastName" value={editForm.lastName} onChange={handleEditChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" name="email" value={editForm.email} onChange={handleEditChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Student ID</label>
                <input type="text" name="studentId" value={editForm.studentId} onChange={handleEditChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input type="text" name="phone" value={editForm.phone} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <input type="text" name="department" value={editForm.department} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditStudent(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 transition">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
