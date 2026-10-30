import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { Car } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  
  return (
    <nav className="bg-white text-gray-900 shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <Car className="w-6 h-6" />
            <span>Zim Cars</span>
          </Link>
          
          <div className="flex items-center space-x-4 md:space-x-6">
            <Link to="/" className="hover:text-blue-600 transition-colors hidden md:block">Home</Link>
            <Link to="/cars" className="hover:text-blue-600 transition-colors">Browse Cars</Link>
            {!user && (
              <>
                <a href="#how-it-works" className="hover:text-blue-600 transition-colors hidden md:block">How it works</a>
                <Link to="/become-a-dealer" className="hover:text-blue-600 transition-colors hidden md:block">Become a Dealer</Link>
                <Link to="/login" className="hover:text-blue-600 transition-colors hidden md:block">Sign in</Link>
              </>
            )}
            
            {user ? (
              <>
                {user.role === 'admin' && <Link to="/admin" className="hover:text-blue-600 transition-colors">Marketing Dashboard</Link>}
                {(user.role === 'dealer_owner' || user.role === 'dealer_staff') && <Link to="/dealer" className="hover:text-blue-600 transition-colors">Dealer Dashboard</Link>}
                <span className="text-gray-600 hidden md:block">Hi, {user.name.split(' ')[0]}</span>
                <button onClick={logout} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]">Logout</button>
              </>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex items-center">Sign in</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
