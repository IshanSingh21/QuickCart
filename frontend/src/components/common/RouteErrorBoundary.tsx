import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * RouteErrorBoundary
 * Global error element attached to the root route of createBrowserRouter.
 * Catches unhandled runtime exceptions, dynamic import/chunk loading failures,
 * and HTTP route errors without crashing to an unstyled blank screen.
 */
export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  let errorTitle = 'Application Error';
  let errorMessage = 'An unexpected runtime error occurred while rendering this page.';

  if (isRouteErrorResponse(error)) {
    errorTitle = `${error.status} ${error.statusText}`;
    errorMessage =
      typeof error.data === 'string'
        ? error.data
        : error.data?.message || 'The requested page or resource could not be loaded.';
  } else if (error instanceof Error) {
    // Detect new deployment chunk hash invalidation (Vite dynamic import failures)
    if (error.message.includes('dynamically imported module') || error.message.includes('Importing a module script failed')) {
      errorTitle = 'Application Updated';
      errorMessage = 'A new version of QuickCart was deployed. Please reload the page to load the latest release.';
    } else {
      errorMessage = error.message;
    }
  }

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">{errorTitle}</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReload}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reload Application
          </Button>
          <Link to="/">
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
