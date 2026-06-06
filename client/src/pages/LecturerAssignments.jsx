import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function LecturerAssignments() {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [downloadError, setDownloadError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', courseId: '', dueDate: '', totalMarks: 100, instructions: '' });

  const fetchData = async () => {
    try {
      const [coursesRes, assignRes] = await Promise.all([
        api.get('/courses'),
        api.get('/assignments')
      ]);
      setCourses(coursesRes.data);
      setAssignments(assignRes.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assignments', form);
      setMessage({ type: 'success', text: 'Assignment created successfully' });
      setShowForm(false);
      setForm({ title: '', description: '', courseId: '', dueDate: '', totalMarks: 100, instructions: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create assignment' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadSubmissions = async (assignment) => {
    try {
      const { data } = await api.get(`/submissions/assignment/${assignment._id}`);
      setSubmissions(data);
      setSelectedAssignment(assignment);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = async (filename) => {
    try {
      setDownloadError('');
      if (!filename) { setDownloadError('No file uploaded for this submission'); return; }
      const response = await api.get(`/submissions/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      setDownloadError(err.response?.data?.message || 'Failed to download file');
    }
  };

  const handleDeleteAssignment = async (assignmentId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this assignment? All submissions and grades for this assignment will also be removed.')) return;
    try {
      await api.delete(`/assignments/${assignmentId}`);
      setMessage({ type: 'success', text: 'Assignment deleted successfully' });
      if (selectedAssignment?._id === assignmentId) { setSelectedAssignment(null); setSubmissions([]); }
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete assignment' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleGrade = async (submissionId) => {
    const marks = prompt('Enter marks obtained:');
    if (!marks) return;
    const feedback = prompt('Enter feedback (optional):');
    try {
      await api.post('/grades', { submissionId, marksObtained: Number(marks), feedback: feedback || '' });
      setMessage({ type: 'success', text: 'Grade saved successfully' });
      loadSubmissions(selectedAssignment);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to grade' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assignment Management</h1>
          <p className="text-sm sm:text-base text-gray-500">Create and manage assignments, view submissions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm sm:text-base whitespace-nowrap">
          {showForm ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Assignment</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select className="input-field" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.code} - {c.title}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input type="datetime-local" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
              <input type="number" className="input-field" min={1} value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: parseInt(e.target.value) })} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea className="input-field" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Create Assignment</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">All Assignments</h2>
          {assignments.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500">No assignments yet</p>
            </div>
          ) : assignments.map((a) => (
            <div key={a._id} className={`card cursor-pointer hover:shadow-md transition ${selectedAssignment?._id === a._id ? 'ring-2 ring-primary-500' : ''}`} onClick={() => loadSubmissions(a)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{a.course?.code}</span>
                    <span className="text-xs text-gray-500">{a.totalMarks} marks</span>
                  </div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={(e) => handleDeleteAssignment(a._id, e)} className="text-red-500 hover:text-red-700 text-lg leading-none" title="Delete assignment">&times;</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {selectedAssignment ? `Submissions: ${selectedAssignment.title}` : 'Select an assignment'}
          </h2>
          {downloadError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{downloadError}</div>}
          {!selectedAssignment ? (
            <p className="text-gray-500 text-sm">Click on an assignment to view submissions</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-500 text-sm">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{s.student?.firstName} {s.student?.lastName}</p>
                      <p className="text-xs text-gray-500">{s.student?.studentId}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'graded' ? 'bg-green-100 text-green-700' : s.status === 'late' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">📄 {s.originalName || 'No file'}</span>
                    {s.fileSize != null && <span className="text-xs text-gray-400">({(s.fileSize / 1024 / 1024).toFixed(2)} MB)</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadFile(s.fileUrl)} className="text-xs btn-secondary">Download</button>
                    {s.status !== 'graded' && (
                      <button onClick={() => handleGrade(s._id)} className="text-xs btn-primary">Grade</button>
                    )}
                  </div>
                  {s.status === 'graded' && (
                    <p className="text-xs text-green-600 mt-1">✓ Graded</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
