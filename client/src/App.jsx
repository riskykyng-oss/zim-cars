import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/AuthContext';
import Home from './features/home/Home';
import Login from './features/admin/Login';
import RegisterDealer from './features/auth/RegisterDealer';
import Marketplace from './features/marketplace/Marketplace';
import VehicleDetail from './features/marketplace/VehicleDetail';
import DealerDashboard from './features/dealer/DealerDashboard';
import AdminDashboard from './features/admin/AdminDashboard';
import Navbar from './components/Navbar';
import { captureRef } from './utils/ref';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
};

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <h1 className="text-4xl font-bold mb-3">Page not found</h1>
    <p className="text-gray-600 mb-6">The page you are looking for does not exist or has moved.</p>
    <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
      Back to home
    </Link>
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    captureRef();
  }, []);
  
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cars" element={<Marketplace />} />
        <Route path="/vehicle/:id" element={<VehicleDetail />} />
        <Route path="/car/:id" element={<VehicleDetail />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dealer'} /> : <Login />} />
        <Route path="/become-a-dealer" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dealer'} /> : <RegisterDealer />} />
        <Route path="/dealer" element={
          <ProtectedRoute allowedRoles={['dealer_owner', 'dealer_staff']}>
            <DealerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
