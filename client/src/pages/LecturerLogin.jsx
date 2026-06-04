import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PasswordInput from '../components/PasswordInput';

export default function LecturerLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/lecturer/login', form);
      login(data.user, data.token);
      navigate('/lecturer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-white">Alexzzy Course Site</Link>
          <p className="text-primary-200 mt-2">Lecturer Login</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <img src="/alex.png" alt="Alexzzy" className="w-36 h-36 rounded-full mx-auto object-cover border-4 border-primary-100" />
            <h2 className="text-xl font-bold text-gray-900 mt-3">Welcome to Alexzzy Courses</h2>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <PasswordInput label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link to="/lecturer/register" className="text-primary-600 hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
