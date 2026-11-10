import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  Github,
  Mail
} from 'lucide-react';
import { Button } from '../ui/Button';

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes('@')) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Trust & Architectural Guarantees 4-Pillar Strip */}
      <div className="border-b border-gray-100 bg-gray-50/70 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary-100/80 text-primary-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">Server Price Authority</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Live lookup prevents client-side price or discount tampering.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">Atomic Inventory Locks</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Conditional SQL updates eliminate flash-sale overselling.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">15-Min BullMQ Countdown</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Delayed jobs automatically release unpaid checkout reservations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-900">Dual-Token RTR Security</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  15-minute access JWTs with server-enforced reuse detection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-xl text-gray-900 tracking-tight">
                Quick<span className="text-primary-600">Cart</span>
              </span>
            </Link>

            <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
              QuickCart is a high-concurrency, transaction-safe e-commerce platform built to solve real-world retail engineering challenges: atomic inventory reservations, decoupled payment settlement, and distributed caching.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                PCI-DSS Compliant Flow
              </span>
              <span className="text-gray-400">|</span>
              <span>PostgreSQL 16 • Redis 7</span>
            </div>
          </div>

          {/* Catalog Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900">Catalog</h5>
            <ul className="space-y-2 text-xs text-gray-500">
              <li>
                <Link to="/products" className="hover:text-primary-600 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products?category=audio" className="hover:text-primary-600 transition-colors">
                  Audio & Acoustics
                </Link>
              </li>
              <li>
                <Link to="/products?category=electronics" className="hover:text-primary-600 transition-colors">
                  Computers & Displays
                </Link>
              </li>
              <li>
                <Link to="/products?category=accessories" className="hover:text-primary-600 transition-colors">
                  Workspace & Peripherals
                </Link>
              </li>
              <li>
                <Link to="/products?sortBy=price&order=desc" className="hover:text-primary-600 transition-colors">
                  Flagship Collection
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900">Customer Care</h5>
            <ul className="space-y-2 text-xs text-gray-500">
              <li>
                <Link to="/orders" className="hover:text-primary-600 transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-primary-600 transition-colors">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Free 30-Day Returns</span>
              </li>
              <li>
                <span className="text-gray-400">2-Year Hardware Warranty</span>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary-600 transition-colors">
                  Customer Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-900">Newsletter</h5>
            <p className="text-xs text-gray-500 leading-relaxed">
              Receive release updates, flash drop notifications, and private catalog discounts.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! You are now subscribed to QuickCart drops.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 pl-9 text-xs text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-2xs"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <Button type="submit" size="sm" className="w-full text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            © {new Date().getFullYear()} QuickCart Engineering Team. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <span className="text-gray-400 hidden md:inline">MIT Licensed Portfolio Project</span>
            <a
              href="https://github.com/quickcart/quickcart-backend"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
