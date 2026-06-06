import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/assignments'),
      api.get('/submissions/my-submissions')
    ]).then(([assignRes, subRes]) => {
      setAssignments(assignRes.data);
      setSubmissions(subRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getSubmissionStatus = (assignmentId) => {
    const sub = submissions.find(s => s.assignment?._id?.toString() === assignmentId.toString());
    if (!sub) return null;
    return sub;
  };

  const filtered = assignments.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.course?.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-500">View and submit your course assignments</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search assignments..."
          className="input-field max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment) => {
            const submission = getSubmissionStatus(assignment._id);
            const now = new Date();
            const due = new Date(assignment.dueDate);
            const diff = due - now;
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.ceil(diff / (1000 * 60 * 60));
            const isOverdue = diff <= 0;

            return (
              <div key={assignment._id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{assignment.course?.code}</span>
                      <span className="text-xs text-gray-400">{assignment.totalMarks} marks</span>
                    </div>
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{assignment.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                      {isOverdue ? (
                        <span className="text-red-600 font-medium">Overdue</span>
                      ) : (
                        <span className={daysLeft <= 2 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                          {daysLeft > 0 ? `${daysLeft}d ${hoursLeft - daysLeft * 24}h left` : `${hoursLeft}h left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {submission ? (
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${submission.status === 'graded' ? 'bg-green-100 text-green-700' : submission.status === 'late' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">Submitted</p>
                      </div>
                    ) : (
                      <Link to={`/student/submit/${assignment._id}`} className="btn-primary text-sm">
                        Submit Now
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
