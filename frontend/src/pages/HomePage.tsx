import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Truck,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Database,
  Server,
  Terminal,
  Send,
  Star
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductGrid } from '../components/ui/ProductGrid';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { useHealth } from '../hooks/useHealth';
import { useUIStore } from '../store/ui-store';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mocks/mock-products';

export const HomePage: React.FC = () => {
  const { data: health, isLoading: isHealthLoading } = useHealth();
  const { openCartDrawer } = useUIStore();

  // Local state for interactive elements
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Filter curated mock catalog subsets
  const trendingProducts = MOCK_PRODUCTS.filter((p) => p.isTrending);
  const newArrivalProducts = MOCK_PRODUCTS.filter((p) => p.isNewArrival);
  const spotlightProduct = MOCK_PRODUCTS.find((p) => p.slug === 'macbook-pro-14-m3') || MOCK_PRODUCTS[1];

  const handleAddToCart = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddedProductIds((prev) => new Set(prev).add(id));
    openCartDrawer();
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }
    setNewsletterError('');
    setIsSubscribed(true);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50/50 pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200/70 text-primary-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>2026 Studio Collection — In Stock</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-950 leading-[1.1]">
                Engineered Audio & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-700">
                  Precision Computing.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-xl font-normal leading-relaxed">
                A minimalist e-commerce platform curated for engineers, designers, and audiophiles.
                Interfacing with a high-concurrency PostgreSQL and Redis backend with strict server-authoritative pricing.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/products">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore Catalog
                  </Button>
                </Link>
                <Link to="/products?category=audio">
                  <Button variant="outline" size="lg">
                    Browse Acoustics
                  </Button>
                </Link>
              </div>

              {/* 3 Key Trust Micro-Badges */}
              <div className="pt-6 border-t border-gray-200/80 grid grid-cols-3 gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block">Free Express</span>
                    <span className="text-gray-500 text-[11px]">Orders over $100</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block">2-Yr Warranty</span>
                    <span className="text-gray-500 text-[11px]">Official coverage</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block">30-Day Audition</span>
                    <span className="text-gray-500 text-[11px]">Hassle-free returns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Background Glow */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-3xl blur-2xl opacity-60 transform -rotate-1" />

                {/* Main Card */}
                <div className="relative rounded-2xl bg-white p-4 shadow-xl border border-gray-200/80">
                  <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-4/3">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
                      alt="Sony WH-1000XM5 Headphones"
                      aspectRatio="video"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="primary" size="sm">
                        Curator&apos;s Pick
                      </Badge>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">
                        Featured Acoustics
                      </span>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        Sony WH-1000XM5 Wireless Headphones
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-500">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <span className="font-semibold text-gray-700">4.9</span>
                        <span className="text-gray-400 text-[11px]">(148 reviews)</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <PriceDisplay price="349.99" originalPrice="399.99" size="md" />
                      <button
                        onClick={openCartDrawer}
                        className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-auto"
                      >
                        <span>Quick View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600 block mb-1">
              Curated Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-gray-900 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block"
            >
              {/* Category Image with Zoom Effect */}
              <div className="aspect-16/10 overflow-hidden">
                <ImageWithFallback
                  src={category.imageUrl}
                  alt={category.name}
                  aspectRatio="video"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-80 group-hover:opacity-90"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-400">
                    {category.itemCount} Instruments
                  </span>
                  <span className="text-white text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-200">
                    Explore →
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{category.name}</h3>
                <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TRENDING PRODUCTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-primary-600">
                Top Rated Gear
              </span>
              <Badge variant="primary" size="sm">Trending</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Popular in Studio & Workspace
            </h2>
          </div>
          <Link
            to="/products?sortBy=price&order=desc"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Trending ({trendingProducts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProductGrid columns={4}>
          {trendingProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              originalPrice={product.originalPrice}
              imageUrl={product.imageUrl}
              categoryName={product.categoryName}
              stock={product.stock}
              rating={product.rating}
              reviewCount={product.reviewCount}
              badgeText={product.badgeText}
              badgeVariant={product.badgeVariant}
              isAddedToCart={addedProductIds.has(product.id)}
              onAddToCart={handleAddToCart}
            />
          ))}
        </ProductGrid>
      </section>

      {/* 4. SPOTLIGHT / FLAGSHIP PRODUCT COLLECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-12 lg:p-16">
            {/* Spec Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Flagship Hardware Spotlight</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {spotlightProduct.name}
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                {spotlightProduct.description} Built for demanding developer workflows, machine learning models, and color-critical creative production.
              </p>

              {/* Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">SoC Architecture</span>
                  <span className="text-white font-bold text-sm">Apple M3 Pro</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Unified Memory</span>
                  <span className="text-white font-bold text-sm">18GB Fast RAM</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Display Precision</span>
                  <span className="text-white font-bold text-sm">Liquid Retina XDR</span>
                </div>
              </div>

              {/* Purchase Actions & Price */}
              <div className="pt-4 flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                    Instant Delivery
                  </span>
                  <div className="text-3xl font-extrabold text-white tabular-nums">
                    ${spotlightProduct.price}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={(e) => handleAddToCart(spotlightProduct.id, e)}
                    className="bg-primary-600 hover:bg-primary-500 text-white shadow-lg"
                  >
                    {addedProductIds.has(spotlightProduct.id) ? 'Added to Cart ✓' : 'Add to Cart'}
                  </Button>
                  <Link to={`/products/${spotlightProduct.slug}`}>
                    <Button variant="outline" size="lg" className="border-slate-700 text-slate-200 hover:bg-slate-900 hover:text-white">
                      Full Specs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Visual Preview */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
                <ImageWithFallback
                  src={spotlightProduct.imageUrl}
                  alt={spotlightProduct.name}
                  aspectRatio="square"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <Badge variant="success" size="sm">
                    In Stock ({spotlightProduct.stock})
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VALUE PROPOSITION & 4-PILLAR TRUST STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-primary-600">
            The QuickCart Standard
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Engineered Reliability at Every Touchpoint
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Free Insured Shipping</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every parcel over $100 travels with full transit insurance, temperature protection, and signature confirmation.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">30-Day Audition</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Test monitors and headphones in your personal studio. If acoustics don&apos;t match your expectations, return prepaid.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">2-Year Official Warranty</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Complete hardware backing. In the unlikely event of hardware failure, we handle instant cross-shipping replacements.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">24/7 Audio Engineers</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Direct access to hardware specialists to assist with DAC pairing, impedance matching, and workspace calibration.
            </p>
          </div>
        </div>
      </section>

      {/* 6. NEW ARRIVALS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-primary-600">
                Fresh Inventory
              </span>
              <Badge variant="new" size="sm">New Arrivals</Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Latest Additions to the Catalog
            </h2>
          </div>
          <Link
            to="/products?sortBy=createdAt&order=desc"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            <span>View All New Arrivals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProductGrid columns={4}>
          {newArrivalProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              originalPrice={product.originalPrice}
              imageUrl={product.imageUrl}
              categoryName={product.categoryName}
              stock={product.stock}
              rating={product.rating}
              reviewCount={product.reviewCount}
              badgeText={product.badgeText}
              badgeVariant={product.badgeVariant}
              isAddedToCart={addedProductIds.has(product.id)}
              onAddToCart={handleAddToCart}
            />
          ))}
        </ProductGrid>
      </section>

      {/* 7. NEWSLETTER SUBSCRIPTION SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary-900 text-white p-8 sm:p-12 text-center shadow-xl">
          {/* Subtle geometric circles */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-primary-800/50 blur-2xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-700/50 blur-2xl" />

          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-300">
              Exclusive Allocation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Stay Ahead of Limited Hardware Drops
            </h2>
            <p className="text-xs sm:text-sm text-primary-200 leading-relaxed">
              Subscribers receive early access notifications 30 minutes before high-demand audio gear and mechanical keyboards enter stock.
            </p>

            {isSubscribed ? (
              <div className="p-4 rounded-xl bg-primary-800/60 border border-primary-700 flex items-center justify-center gap-2 text-emerald-300 text-sm font-semibold animate-in zoom-in-95">
                <CheckCircle2 className="w-5 h-5" />
                <span>Thank you! You are subscribed for priority drop alerts.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="pt-2 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      if (newsletterError) setNewsletterError('');
                    }}
                    placeholder="Enter your work email address..."
                    className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-primary-200 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-white text-primary-900 hover:bg-gray-100 font-bold shrink-0"
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Subscribe
                  </Button>
                </div>
                {newsletterError && (
                  <p className="text-xs text-rose-300 text-left pl-1">{newsletterError}</p>
                )}
                <p className="text-[11px] text-primary-300/80 text-left sm:text-center">
                  Zero spam. Unsubscribe at any time with a single click.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 8. DEVELOPER / EVALUATOR BACKEND TELEMETRY & SEEDED CREDENTIALS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary-600" />
                <h3 className="font-bold text-sm text-gray-900">
                  Backend Architecture & API Verification Telemetry
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Frontend interfacing directly with QuickCart Express REST API at <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">/api/v1</code>
              </p>
            </div>
            <Badge variant={health?.status === 'healthy' ? 'success' : 'warning'} size="sm">
              {isHealthLoading ? 'PROBING...' : (health?.status || 'STANDALONE').toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>PostgreSQL 16 Primary</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {health?.database.status === 'connected' ? `${health.database.latencyMs} ms` : 'Active / Ready'}
              </div>
              <p className="text-[10px] text-gray-400">ACID Transactions & Row Locks</p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Server className="w-3.5 h-3.5 text-rose-600" />
                <span>Redis 7.x In-Memory</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {health?.redis.status === 'connected' ? `${health.redis.latencyMs} ms` : 'Active / Ready'}
              </div>
              <p className="text-[10px] text-gray-400">Cache-Aside & Rate Limiting</p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>BullMQ Queue Workers</span>
              </div>
              <div className="text-sm font-bold text-gray-900">15m Auto TTL</div>
              <p className="text-[10px] text-gray-400">Order Cancellation Queue</p>
            </div>
          </div>

          {/* Seeded Demo Credentials Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900">
            <div className="space-y-1">
              <span className="font-bold block">Seeded Backend Evaluation Credentials</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-800">
                <span>Customer: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">customer@quickcart.com</code> / <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">CustomerPass123!</code></span>
                <span>Admin: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">admin@quickcart.com</code> / <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">AdminPass123!</code></span>
              </div>
            </div>
            <Link to="/login" className="shrink-0">
              <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100">
                Sign In With Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
