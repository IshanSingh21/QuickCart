import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, User as UserIcon, Menu, X, LogOut, Package, Search, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { useUIStore } from '../../store/ui-store';
import { performLogout } from '../../services/auth.service';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { openCartDrawer, openSearchModal } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await performLogout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navCategories = [
    { label: 'All Products', href: '/products' },
    { label: 'Audio & Acoustics', href: '/products?category=audio' },
    { label: 'Computers & Displays', href: '/products?category=electronics' },
    { label: 'Workspace & Peripherals', href: '/products?category=accessories' },
    { label: 'Trending', href: '/products?sortBy=price&order=desc' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80">
      {/* Primary Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-8 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md group-hover:bg-primary-700 transition-colors">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-gray-900 leading-none">
                  Quick<span className="text-primary-600">Cart</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest font-semibold text-gray-400 mt-0.5">
                  Commerce
                </span>
              </div>
            </Link>
          </div>

          {/* Centralized Search Bar Trigger */}
          <div className="hidden sm:flex flex-1 max-w-md mx-auto">
            <button
              onClick={openSearchModal}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50/70 text-gray-400 text-xs hover:border-gray-300 hover:bg-gray-100/70 transition-all shadow-2xs group"
              aria-label="Open search dialog"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                <span className="text-gray-500 font-medium">Search products, audio, SKUs...</span>
              </div>
              <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md bg-white border border-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 font-semibold shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile Search Button */}
            <button
              onClick={openSearchModal}
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Shopping Cart Indicator / Slide-over Drawer Trigger */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative p-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="View Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                2
              </span>
            </button>

            {/* Authentication Entry */}
            {isLoading ? (
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200" aria-hidden="true">
                <div className="h-8 w-20 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-primary-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-4 h-4 text-gray-500" />
                  <span>Orders</span>
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Account & Session Security"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center border border-primary-200/80 shadow-2xs">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{user?.firstName}</span>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                  disabled={isLoggingOut}
                  title="Log Out"
                  aria-label="Log Out"
                  className="p-2"
                >
                  <LogOut className="w-4 h-4 text-gray-500 hover:text-rose-600" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200">
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

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation Sub-Bar (Desktop) */}
      <div className="hidden md:block border-t border-gray-100 bg-gray-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-7 h-10 overflow-x-auto no-scrollbar text-xs font-medium text-gray-600">
            {navCategories.map((cat) => {
              const isActive = location.pathname + location.search === cat.href;
              return (
                <Link
                  key={cat.href}
                  to={cat.href}
                  className={`hover:text-primary-600 transition-colors whitespace-nowrap py-2 border-b-2 ${
                    isActive ? 'border-primary-600 text-primary-600 font-semibold' : 'border-transparent'
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-primary-700 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Complimentary insured shipping on orders $100+</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-4 pb-6 space-y-4 animate-in slide-in-from-top-2">
          {/* Mobile Search */}
          <div className="relative">
            <input
              type="text"
              onClick={() => {
                setMobileMenuOpen(false);
                openSearchModal();
              }}
              readOnly
              placeholder="Search products..."
              className="w-full bg-gray-50 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
          </div>

          {/* Category Links */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3">
              Explore Catalog
            </span>
            {navCategories.map((cat) => (
              <Link
                key={cat.href}
                to={cat.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-50"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Account Actions */}
          {isAuthenticated ? (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span>Signed in as <strong className="text-gray-900">{user?.email}</strong></span>
              </div>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-50"
              >
                Account &amp; Security
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-50"
              >
                My Orders
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 rounded-lg hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
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
