import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function Profile() {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', department: '' });
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/profile').then(({ data }) => {
      setUser(data);
      setForm({ firstName: data.firstName, lastName: data.lastName, phone: data.phone || '', department: data.department || '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', form);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">Manage your account information</p>
      </div>

      <div className="max-w-2xl">
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role} - {user?.studentId || user?.staffId}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
          {message.text && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
