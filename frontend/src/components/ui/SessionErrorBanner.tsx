import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface SessionErrorBannerProps {
  message?: string;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

export const SessionErrorBanner: React.FC<SessionErrorBannerProps> = ({
  message = "Session expired. Please log in again.",
  onRefresh,
  showRefreshButton = false
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Authentication Error
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {message}
          </p>
        </div>
        {showRefreshButton && onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
