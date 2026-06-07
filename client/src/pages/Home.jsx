import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'student') navigate('/student/dashboard');
    if (user?.role === 'lecturer') navigate('/lecturer/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between py-6">
          <h1 className="text-2xl font-bold text-white">Alexzzy Course Site</h1>
          <div className="flex gap-3">
            <Link to="/student/login" className="text-white/90 hover:text-white px-4 py-2 text-sm">Student Login</Link>
          </div>
        </nav>

        <div className="py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white mb-6">
              Programming for Beginners
            </h2>
            <p className="text-sm sm:text-lg text-primary-100 mb-8 sm:mb-12">
              A comprehensive platform for students to register courses and submit assignments online,
              and for lecturers to manage courses, assignments, and grading efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/student/register" className="bg-white text-primary-700 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition text-center">
                Get Started as Student
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pb-20">
          {[
            { title: 'Course Registration', desc: 'Browse and register for available courses online with ease.', icon: '📚' },
            { title: 'Assignment Submission', desc: 'Submit assignments in various formats with deadline tracking.', icon: '📤' },
            { title: 'Grading & Feedback', desc: 'View grades and detailed feedback from your lecturers.', icon: '⭐' }
          ].map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-white">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-primary-100 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
