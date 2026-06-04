import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PasswordInput from '../components/PasswordInput';

export default function StudentRegister() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/student/register', form);
      login(data.user, data.token);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-white">Alexzzy Course Site</Link>
          <p className="text-primary-200 mt-2">Student Registration</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <img src="/alex.png" alt="Alexzzy" className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary-100" />
            <h2 className="text-xl font-bold text-gray-900 mt-3">Welcome to Alexzzy Courses</h2>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" name="firstName" className="input-field" value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" name="lastName" className="input-field" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" className="input-field" value={form.email} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PasswordInput label="Password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
              <PasswordInput label="Confirm Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" name="department" className="input-field" value={form.department} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" name="phone" className="input-field" value={form.phone} onChange={handleChange} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/student/login" className="text-primary-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
