import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/grades/my-grades').then(({ data }) => {
      setGrades(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  if (grades.length === 0) {
    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Grades & Feedback</h1>
          <p className="text-gray-500">View your graded assignments and lecturer feedback</p>
        </div>
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-gray-500">No grades available yet</p>
        </div>
      </Layout>
    );
  }

  const average = grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grades & Feedback</h1>
        <p className="text-gray-500">View your graded assignments and lecturer feedback</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="dashboard-card">
          <p className="text-sm text-gray-500">Total Graded</p>
          <p className="text-2xl font-bold">{grades.length}</p>
        </div>
        <div className="dashboard-card">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold">{average.toFixed(1)}%</p>
        </div>
        <div className="dashboard-card">
          <p className="text-sm text-gray-500">Highest Score</p>
          <p className="text-2xl font-bold">{Math.max(...grades.map(g => g.percentage)).toFixed(1)}%</p>
        </div>
      </div>

      <div className="space-y-4">
        {grades.map((grade) => (
          <div key={grade._id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded">{grade.course?.code}</span>
                </div>
                <h3 className="font-semibold">{grade.assignment?.title}</h3>
                <p className="text-sm text-gray-500">{grade.course?.title}</p>
              </div>
              <div className="text-right">
                <div className={`text-xl sm:text-2xl font-bold ${grade.percentage >= 70 ? 'text-green-600' : grade.percentage >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                  {grade.marksObtained}/{grade.totalMarks}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${grade.percentage >= 70 ? 'bg-green-100 text-green-700' : grade.percentage >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {grade.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            {grade.feedback && (
              <div className="bg-gray-50 p-3 rounded-lg mt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">Lecturer Feedback:</p>
                <p className="text-sm text-gray-600">{grade.feedback}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Graded on {new Date(grade.gradedAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
