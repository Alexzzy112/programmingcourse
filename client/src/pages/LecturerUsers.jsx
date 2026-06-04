import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function LecturerUsers() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/courses/students/all')
      .then(({ data }) => { setAllStudents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAction = async (studentId, courseId, action) => {
    setMessage({ type: '', text: '' });
    try {
      let res;
      if (action === 'suspend') res = await api.put(`/courses/${courseId}/students/${studentId}/suspend`);
      else if (action === 'approve') res = await api.put(`/courses/${courseId}/students/${studentId}/approve`);
      else if (action === 'delete') res = await api.delete(`/courses/${courseId}/students/${studentId}`);
      setMessage({ type: 'success', text: res.data.message });
      const { data } = await api.get('/courses/students/all');
      setAllStudents(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-500">Manage students enrolled in your courses</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        {allStudents.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No students enrolled in your courses</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-3 font-medium">Student</th>
                  <th className="pb-3 pr-3 font-medium">Email</th>
                  <th className="pb-3 pr-3 font-medium">Student ID</th>
                  <th className="pb-3 pr-3 font-medium">Course</th>
                  <th className="pb-3 pr-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allStudents.map((item) => {
                  const s = item.student;
                  const c = item.course;
                  return (
                    <tr key={item.registrationId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                            {s?.firstName?.[0]}{s?.lastName?.[0]}
                          </div>
                          <p className="font-medium">{s?.firstName} {s?.lastName}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{s?.email}</td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{s?.studentId}</td>
                      <td className="py-3 pr-3 text-xs">{c?.code}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' :
                          item.status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{item.status}</span>
                      </td>
                      <td className="py-3 flex gap-1">
                        {item.status === 'suspended' ? (
                          <button onClick={() => handleAction(s._id, c._id, 'approve')} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition">Approve</button>
                        ) : (
                          <button onClick={() => handleAction(s._id, c._id, 'suspend')} className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-600 transition">Suspend</button>
                        )}
                        <button onClick={() => handleAction(s._id, c._id, 'delete')} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 transition">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
