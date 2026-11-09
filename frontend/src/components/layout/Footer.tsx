import React from 'react';
import { ShoppingBag, ShieldCheck, Zap, RefreshCw, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Feature Highlights */}
      <div className="border-b border-gray-100 bg-gray-50/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Zero-Trust Price Authority</h4>
                <p className="text-xs text-gray-500">Live server price lookup & snapshotting</p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Atomic Inventory Locks</h4>
                <p className="text-xs text-gray-500">Oversell prevention with PostgreSQL row locks</p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Dual-Token Auth & RTR</h4>
                <p className="text-xs text-gray-500">15m JWT access tokens with reuse detection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center text-white">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-gray-900">QuickCart</span>
            <span className="text-xs text-gray-500 ml-2">
              © {new Date().getFullYear()} QuickCart Engineering Team. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span className="text-xs text-gray-400">Node.js • Express • PostgreSQL • Redis • BullMQ • React</span>
            <a
              href="https://github.com/quickcart/quickcart-backend"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
