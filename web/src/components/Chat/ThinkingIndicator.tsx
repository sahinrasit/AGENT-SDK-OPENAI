import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ThinkingIndicatorProps {
  steps?: string[];
  isActive?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  steps = [],
  isActive = true
}) => {
  if (!isActive && steps.length === 0) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        {isActive ? (
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
        ) : (
          <Brain className="w-5 h-5 text-purple-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm text-purple-900">
            {isActive ? 'Thinking...' : 'Thought Process'}
          </span>
          {isActive && (
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          )}
        </div>

        {steps.length > 0 && (
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-purple-700"
              >
                <span className="text-purple-400 font-mono text-xs mt-0.5">
                  {index + 1}.
                </span>
                <span className="flex-1">{step}</span>
              </div>
            ))}
          </div>
        )}

        {isActive && steps.length === 0 && (
          <div className="text-sm text-purple-600">
            Analyzing your request and preparing a response...
          </div>
        )}
      </div>
    </div>
  );
};
