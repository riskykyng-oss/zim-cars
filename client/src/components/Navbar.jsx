import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { Car, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="bg-white text-gray-900 shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <Car className="w-6 h-6" />
            <span>Zim Cars</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-4 md:space-x-6">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/cars" className="hover:text-blue-600 transition-colors">Browse Cars</Link>
            {!user && (
              <>
                <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
                <Link to="/become-a-dealer" className="hover:text-blue-600 transition-colors">Become a Dealer</Link>
                <Link to="/login" className="hover:text-blue-600 transition-colors">Sign in</Link>
              </>
            )}
            
            {user ? (
              <>
                {user.role === 'admin' && <Link to="/admin" className="hover:text-blue-600 transition-colors">Marketing Dashboard</Link>}
                {(user.role === 'dealer_owner' || user.role === 'dealer_staff') && <Link to="/dealer" className="hover:text-blue-600 transition-colors">Dealer Dashboard</Link>}
                <span className="text-gray-600">Hi, {user.name.split(' ')[0]}</span>
                <button onClick={logout} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]">Logout</button>
              </>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex items-center">Sign in</Link>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-gray-100">
            <Link to="/" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Home</Link>
            <Link to="/cars" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Browse Cars</Link>
            {!user && (
              <>
                <a href="#how-it-works" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">How it works</a>
                <Link to="/become-a-dealer" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Become a Dealer</Link>
                <Link to="/login" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Sign in</Link>
              </>
            )}
            {user ? (
              <>
                {user.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Marketing Dashboard</Link>}
                {(user.role === 'dealer_owner' || user.role === 'dealer_staff') && <Link to="/dealer" onClick={() => setIsOpen(false)} className="block px-2 py-2 hover:bg-gray-50 rounded-lg min-h-[44px] flex items-center">Dealer Dashboard</Link>}
                <div className="px-2 py-2 text-gray-600">Hi, {user.name}</div>
                <button onClick={() => { logout(); setIsOpen(false); }} className="w-full text-left px-2 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="block px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] flex items-center justify-center">Sign in</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
