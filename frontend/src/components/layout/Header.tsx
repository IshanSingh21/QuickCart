import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, User as UserIcon, Menu, X, LogOut, Package } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md group-hover:bg-primary-700 transition-colors">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Quick<span className="text-primary-600">Cart</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/products" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                Products
              </Link>
              <Link to="/products?category=electronics" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                Electronics
              </Link>
              <Link to="/products?category=audio" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                Audio
              </Link>
              <Link to="/products?category=accessories" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                Accessories
              </Link>
            </nav>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Shopping Cart Pill */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </Link>

            {/* Authentication States */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3 pl-2 border-l border-gray-200">
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-4 h-4 text-gray-500" />
                  <span>Orders</span>
                </Link>
                <div className="flex items-center gap-2 pl-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center border border-primary-200">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{user?.firstName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} title="Log Out">
                  <LogOut className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-gray-800 rounded-md hover:bg-gray-50"
          >
            All Products
          </Link>
          <Link
            to="/cart"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-gray-800 rounded-md hover:bg-gray-50"
          >
            Shopping Cart
          </Link>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span>Signed in as <strong className="text-gray-900">{user?.email}</strong></span>
              </div>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-gray-800 rounded-md hover:bg-gray-50"
              >
                My Orders
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-red-600 rounded-md hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="md" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
