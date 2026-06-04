import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import LecturerLogin from './pages/LecturerLogin';
import LecturerRegister from './pages/LecturerRegister';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourses from './pages/StudentCourses';
import CourseRegistration from './pages/CourseRegistration';
import StudentAssignments from './pages/StudentAssignments';
import AssignmentSubmission from './pages/AssignmentSubmission';
import StudentGrades from './pages/StudentGrades';
import Profile from './pages/Profile';
import LecturerDashboard from './pages/LecturerDashboard';
import LecturerCourses from './pages/LecturerCourses';
import LecturerAssignments from './pages/LecturerAssignments';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/lecturer/login" element={<LecturerLogin />} />
      <Route path="/lecturer/register" element={<LecturerRegister />} />
      <Route path="/admin/login" element={<LecturerLogin />} />
      <Route path="/admin/register" element={<LecturerRegister />} />

      <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/courses" element={<ProtectedRoute role="student"><StudentCourses /></ProtectedRoute>} />
      <Route path="/student/course-registration" element={<ProtectedRoute role="student"><CourseRegistration /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute role="student"><StudentAssignments /></ProtectedRoute>} />
      <Route path="/student/submit/:id" element={<ProtectedRoute role="student"><AssignmentSubmission /></ProtectedRoute>} />
      <Route path="/student/grades" element={<ProtectedRoute role="student"><StudentGrades /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />

      <Route path="/lecturer/dashboard" element={<ProtectedRoute role="lecturer"><LecturerDashboard /></ProtectedRoute>} />
      <Route path="/lecturer/courses" element={<ProtectedRoute role="lecturer"><LecturerCourses /></ProtectedRoute>} />
      <Route path="/lecturer/assignments" element={<ProtectedRoute role="lecturer"><LecturerAssignments /></ProtectedRoute>} />
      <Route path="/lecturer/profile" element={<ProtectedRoute role="lecturer"><Profile /></ProtectedRoute>} />
    </Routes>
  );
}
