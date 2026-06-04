import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function LecturerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => { setNotifications(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormMsg({ type: 'error', text: 'Title and message are required' });
      return;
    }
    setSending(true);
    setFormMsg({ type: '', text: '' });
    try {
      const { data } = await api.post('/notifications', { title, message, targetAudience });
      setNotifications(prev => [data, ...prev]);
      setTitle('');
      setMessage('');
      setTargetAudience('all');
      setFormMsg({ type: 'success', text: 'Notification sent successfully' });
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send notification' });
    } finally {
      setSending(false);
    }
    setTimeout(() => setFormMsg({ type: '', text: '' }), 3000);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-gray-500">Broadcast messages to students</p>
      </div>

      <div className="card mb-8">
        {formMsg.text && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${formMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {formMsg.text}
          </div>
        )}
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-y focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Students</option>
              <option value="course">Students in a Course (coming soon)</option>
              <option value="student">Specific Student (coming soon)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="bg-primary-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Sent Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No notifications sent yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-3 font-medium">Title</th>
                  <th className="pb-3 pr-3 font-medium">Message</th>
                  <th className="pb-3 pr-3 font-medium">Audience</th>
                  <th className="pb-3 pr-3 font-medium">Date</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-3 font-medium">{n.title}</td>
                    <td className="py-3 pr-3 text-xs text-gray-600 max-w-xs truncate">{n.message}</td>
                    <td className="py-3 pr-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {n.targetAudience}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(n._id)} className="text-red-600 text-xs hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
