import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses/registered').then(({ data }) => {
      setCourses(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500">Courses you are currently registered for</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search courses..."
          className="input-field max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-gray-500">No courses found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course._id} className="card hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-1 rounded">{course.code}</span>
                <span className="text-xs text-gray-500">{course.credits} credits</span>
              </div>
              <h3 className="font-semibold mb-1">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description || 'No description'}</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Lecturer: {course.lecturer?.firstName} {course.lecturer?.lastName}</p>
                <p>{course.schedule || 'Schedule TBD'}</p>
                <p>Semester: {course.semester}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
