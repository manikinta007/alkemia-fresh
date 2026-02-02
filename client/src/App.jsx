import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Periods from './pages/Periods';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import Materials from './pages/Materials';
import Tasks from './pages/Tasks';
import Quizzes from './pages/Quizzes';
import Grades from './pages/Grades';

import QRCodes from './pages/QRCodes';
import Settings from './pages/Settings';

import StudentLanding from './pages/student/StudentLanding';
import StudentPortal from './pages/student/StudentPortal';
import { initSession, getCsrfToken } from './utils/api';

// Wrapper for protected routes
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking

  useEffect(() => {
    const checkAuth = async () => {
      const user = await initSession();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) return <div className="min-h-screen flex items-center justify-center text-zinc-400">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/student" element={<StudentLanding />} />
      <Route path="/student/portal" element={<StudentPortal />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="periods" element={<Periods />} />
        <Route path="classes" element={<Classes />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="materials" element={<Materials />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="grades" element={<Grades />} />
        <Route path="qrcodes" element={<QRCodes />} />
        <Route path="qrcodes" element={<QRCodes />} />
        <Route path="settings" element={<Settings />} />
        <Route path="lab" element={<div className="p-8 text-center text-zinc-500 bg-white rounded-xl border border-zinc-200 mt-4 mx-4 shadow-sm"><div className="text-4xl mb-4">🧪</div><h2 className="text-xl font-bold text-zinc-800">Virtual Lab</h2><p className="mt-2">Fitur ini sedang dalam pengembangan.</p></div>} />

        {/* Fallback */}
        <Route path="*" element={<div className="p-10 text-center">Halaman ini belum migrasi ke React. <br /> <a href="/old-version" className="text-blue-600 underline">Ke Versi Lama</a></div>} />
      </Route>
    </Routes>
  );
}

import { AlertProvider } from './components/Alert';

function App() {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </BrowserRouter>
  );
}

export default App;
