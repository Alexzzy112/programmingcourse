import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => { setNotifications(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500">Announcements from your lecturers</p>
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => (
            <div key={n._id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{n.message}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>From: {n.sender?.firstName} {n.sender?.lastName}</span>
                {n.targetCourse && <span>· Course: {n.targetCourse?.code}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
