import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function LecturerUsers() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    api.get('/courses/students/all')
      .then(({ data }) => { setAllStudents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const groupedStudents = useMemo(() => {
    const map = {};
    for (const item of allStudents) {
      const sid = item.student?._id;
      if (!sid) continue;
      if (!map[sid]) {
        map[sid] = {
          student: item.student,
          studentStatus: item.studentStatus,
          registrations: [],
          hasRegistration: false
        };
      }
      if (item.course) {
        map[sid].registrations.push(item);
        map[sid].hasRegistration = true;
      }
    }
    return Object.values(map);
  }, [allStudents]);

  const handleAction = async (studentId, courseId, action) => {
    setMessage({ type: '', text: '' });
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
      setMessage({ type: 'success', text: res.data.message });
      const { data } = await api.get('/courses/students/all');
      setAllStudents(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const openView = (s) => {
    setViewStudent(s);
  };

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
    setMessage({ type: '', text: '' });
    try {
      const res = await api.put(`/courses/students/${editStudent._id}`, editForm);
      setMessage({ type: 'success', text: res.data.message });
      setEditStudent(null);
      const { data } = await api.get('/courses/students/all');
      setAllStudents(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setEditLoading(false);
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-500">Manage all registered students</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        {groupedStudents.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No registered users</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-3 font-medium">Student</th>
                  <th className="pb-3 pr-3 font-medium">Email</th>
                  <th className="pb-3 pr-3 font-medium">Student ID</th>
                  <th className="pb-3 pr-3 font-medium">Courses</th>
                  <th className="pb-3 pr-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedStudents.map((group) => {
                  const s = group.student;
                  const accountSus = group.studentStatus === 'suspended';
                  return (
                    <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
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
                      <td className="py-3 pr-3">
                        {group.registrations.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {group.registrations.map((item) => {
                              const c = item.course;
                              return (
                                <div key={item.registrationId} className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium">{c?.code || '—'}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    item.status === 'active' ? 'bg-green-100 text-green-700' :
                                    item.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>{item.status}</span>
                                  {item.status === 'suspended' ? (
                                    <button onClick={() => handleAction(s._id, c._id, 'approve')} className="bg-green-600 text-white text-xs px-2 py-0.5 rounded hover:bg-green-700 transition">Approve</button>
                                  ) : (
                                    <button onClick={() => handleAction(s._id, c._id, 'suspend')} className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded hover:bg-orange-600 transition">Suspend</button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${accountSus ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {accountSus ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 flex gap-1 flex-wrap">
                        <button onClick={() => openView(s)} className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition">View</button>
                        <button onClick={() => openEdit(s)} className="bg-indigo-500 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-600 transition">Edit</button>
                        {accountSus ? (
                          <button onClick={() => handleAction(s._id, null, 'approve')} className="bg-green-700 text-white text-xs px-3 py-1.5 rounded hover:bg-green-800 transition">Un-suspend Acct</button>
                        ) : (
                          <button onClick={() => handleAction(s._id, null, 'suspend')} className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-700 transition">Suspend Acct</button>
                        )}
                        <button onClick={() => setDeleteConfirm({ studentId: s._id })} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 transition">Delete</button>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Confirm Delete</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this student? This action cannot be undone and will remove all related data.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => { handleAction(deleteConfirm.studentId, deleteConfirm.courseId, 'delete'); setDeleteConfirm(null); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 transition">Confirm Delete</button>
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
