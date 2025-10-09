import React from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface ThinkingIndicatorProps {
  steps?: string[];
  isActive?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  steps = [],
  isActive = true
}) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex-shrink-0">
        <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-medium text-base text-purple-900">
          Düşünüyorum
        </span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
};
