import React from 'react';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const ProductsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse our inventory backed by PostgreSQL relational catalog and Redis cache-aside reads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Redis Cached</Badge>
          <Badge variant="outline">Server-Side Pagination</Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Search products by title or description..."
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="md" leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
            Filters
          </Button>
          <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option value="createdAt-desc">Newest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Foundation State Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Phase 1 Foundation Active</h3>
        <p className="text-sm text-gray-500">
          Vite build, routing, TanStack Query, and Axios API client have been wired successfully. Full catalog integration with live seed data will be rendered in Phase 3.
        </p>
      </div>
    </div>
  );
};
