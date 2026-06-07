import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function AssignmentSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/assignments/${id}`)
      .then(({ data }) => setAssignment(data))
      .catch(() => navigate('/student/assignments'));
  }, [id, navigate]);

  const canSubmit = (file || textContent.trim()) && !uploading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !textContent.trim()) return setError('Please upload a file or enter text content');
    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('assignmentId', id);
    formData.append('textContent', textContent);

    try {
      await api.post('/submissions/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      setSuccess('Assignment submitted successfully!');
      setTimeout(() => navigate('/student/assignments'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setUploading(false);
    }
  };

  if (!assignment) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  const isOverdue = new Date() > new Date(assignment.dueDate);

  return (
    <Layout>
      <button onClick={() => navigate('/student/assignments')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Assignments
      </button>

      <div className="max-w-2xl">
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{assignment.course?.code}</span>
            <span className="text-xs text-gray-400">{assignment.totalMarks} marks</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold mb-2">{assignment.title}</h1>
          <p className="text-gray-600 text-sm mb-4">{assignment.description}</p>
          {assignment.instructions && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
              <p className="text-sm text-gray-500">{assignment.instructions}</p>
            </div>
          )}
          <div className="text-sm text-gray-500 space-y-1">
            <p>Due: {new Date(assignment.dueDate).toLocaleString()}</p>
            <p>Allowed file types: {assignment.fileTypes?.join(', ') || 'PDF, DOCX, TXT'}</p>
            <p>Max file size: {assignment.maxFileSize || 1}MB</p>
            {isOverdue && <p className="text-red-600 font-medium">⚠ This assignment is overdue - submission will be marked as late</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Submit Assignment</h2>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-primary-400 transition cursor-pointer" onClick={() => document.getElementById('fileInput').click()}>
              <div className="text-3xl sm:text-4xl mb-3">📁</div>
              <p className="text-sm text-gray-500 mb-1">Drag and drop your file here or click to browse</p>
              <p className="text-xs text-gray-400">PDF, DOCX, TXT (Max 1MB)</p>
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setError('');
                }}
              />
            </div>
            {file && (
              <div className="mt-3 p-3 bg-primary-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-red-500 text-sm">Remove</button>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Or type your answer below</label>
              <textarea
                value={textContent}
                onChange={(e) => { setTextContent(e.target.value); setError(''); }}
                placeholder="Type your answer here..."
                rows={6}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y"
              />
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            <button type="submit" disabled={!canSubmit} className="btn-primary w-full mt-4 py-3">
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
