import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const [stats, setStats] = useState({ courses: 0, assignments: 0, pendingSubmissions: 0, grades: 0 });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, assignmentsRes, submissionsRes, gradesRes] = await Promise.all([
          api.get('/courses/registered'),
          api.get('/assignments'),
          api.get('/submissions/my-submissions'),
          api.get('/grades/my-grades')
        ]);
        const courses = coursesRes.data;
        const allAssignments = assignmentsRes.data;
        const submissions = submissionsRes.data;
        const grades = gradesRes.data;

        const registeredCourseIds = courses.map(c => c._id);
        const courseAssignments = allAssignments.filter(a => registeredCourseIds.includes(a.course?._id));

        const submittedIds = new Set(submissions.map(s => s.assignment?._id));
        const pendingSubmissions = courseAssignments.filter(a => !submittedIds.has(a._id) && new Date(a.dueDate) > new Date());

        setStats({
          courses: courses.length,
          assignments: courseAssignments.length,
          pendingSubmissions: pendingSubmissions.length,
          grades: grades.length
        });

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

      <div className="grid lg:grid-cols-2 gap-6">
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
    </Layout>
  );
}
