import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto">
        <FileQuestion className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Page Not Found</h1>
        <p className="text-sm text-gray-500">
          The page or product resource you are searching for does not exist or has been moved.
        </p>
      </div>
      <Link to="/">
        <Button leftIcon={<Home className="w-4 h-4" />}>
          Return to Home
        </Button>
      </Link>
    </div>
  );
};
