import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function LecturerDashboard() {
  const [stats, setStats] = useState({ totalCourses: 0, totalEnrolledStudents: 0, activeCourses: 0 });
  const [recentCourses, setRecentCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, coursesRes] = await Promise.all([
          api.get('/courses/stats'),
          api.get('/courses')
        ]);
        setStats(statsRes.data);
        setRecentCourses(coursesRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lecturer Dashboard</h1>
        <p className="text-gray-500">Manage your courses and track progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
    </Layout>
  );
}
