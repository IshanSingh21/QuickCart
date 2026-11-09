import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, CheckCircle2, Shield, Zap, Lock, Terminal, Database, Server } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useHealth } from '../hooks/useHealth';
import { Badge } from '../components/ui/Badge';

export const HomePage: React.FC = () => {
  const { data: health, isLoading } = useHealth();

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold border border-primary-200">
          <Zap className="w-3.5 h-3.5 text-primary-600" />
          <span>QuickCart Phase 1: Frontend Foundation Initialized</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-tight">
          High-Concurrency E-Commerce <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">
            Engineered for Precision
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-normal">
          A separate, production-ready React 18 + TypeScript frontend interfacing seamlessly with the QuickCart PostgreSQL, Redis, and BullMQ backend.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/products">
            <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Catalog
            </Button>
          </Link>
          <Link to="/cart">
            <Button variant="outline" size="lg" leftIcon={<ShoppingBag className="w-4 h-4" />}>
              View Cart
            </Button>
          </Link>
        </div>
      </section>

      {/* Live Backend Connection Card */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-slate-800 bg-slate-900 text-white shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-slate-300">
                system-health.service // GET /api/v1/health
              </span>
            </div>
            <Badge variant={health?.status === 'healthy' ? 'success' : 'warning'} size="sm">
              {isLoading ? 'PROBING...' : (health?.status || 'OFFLINE').toUpperCase()}
            </Badge>
          </div>

          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
            <div className="space-y-2 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400">
                <Database className="w-4 h-4 text-blue-400" />
                <span>PostgreSQL 16 Primary</span>
              </div>
              <div className="text-xl font-bold text-slate-100">
                {health?.database.status === 'connected' ? `${health.database.latencyMs} ms` : 'Disconnected'}
              </div>
              <p className="text-[11px] text-slate-400">ACID Transactions & Row-Level Locking</p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400">
                <Server className="w-4 h-4 text-red-400" />
                <span>Redis 7.x In-Memory</span>
              </div>
              <div className="text-xl font-bold text-slate-100">
                {health?.redis.status === 'connected' ? `${health.redis.latencyMs} ms` : 'Disconnected'}
              </div>
              <p className="text-[11px] text-slate-400">Cache-Aside & Rate Limiting</p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>BullMQ Workers</span>
              </div>
              <div className="text-xl font-bold text-slate-100">15m TTL</div>
              <p className="text-[11px] text-slate-400">Automated Order Expiration Queue</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Architectural Guarantees Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Architectural Guarantees Interfacing with Backend
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            The frontend is decoupled from backend database mutations and complies strictly with server-authoritative contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Zero-Trust Price Authority</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Frontend clients never submit prices or line totals. All monetary calculations are performed on the server and frozen into order item snapshots.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tamper-proof financial consistency</span>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Dual-Token Auth & RTR</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              15-minute JWT access tokens paired with 7-day stateful refresh tokens. Transparent silent refresh handled via a mutexed Axios request queue.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Replay attack detection</span>
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Simulated Payment Console</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Portfolio-ready simulation modes allowing test evaluation of successful checkouts, card declines, and insufficient funds without live credentials.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Full error lifecycle testing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Banner */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Seeded Demo Credentials Available</h4>
            <p className="text-xs text-amber-800">
              Customer: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">customer@quickcart.com</code> / <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">CustomerPass123!</code>
            </p>
            <p className="text-xs text-amber-800">
              Admin: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">admin@quickcart.com</code> / <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">AdminPass123!</code>
            </p>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0">
              Try Signing In
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
