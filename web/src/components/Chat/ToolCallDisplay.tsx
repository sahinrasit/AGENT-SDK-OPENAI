import React, { useState } from 'react';
import { ToolCall } from '../../types/agent';
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending':
        return 'border-gray-200 bg-gray-50';
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  const getDuration = () => {
    if (!toolCall.endTime) return null;
    const duration = new Date(toolCall.endTime).getTime() - new Date(toolCall.startTime).getTime();
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className={clsx(
      'border rounded-lg overflow-hidden transition-all duration-200',
      getStatusColor()
    )}>
      {/* Tool Call Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-75 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <Wrench className="w-4 h-4 text-gray-600" />
          <div className="text-left">
            <div className="font-medium text-sm text-gray-900">
              {toolCall.toolName}
            </div>
            <div className="text-xs text-gray-500">
              {toolCall.status === 'running' && 'Executing...'}
              {toolCall.status === 'completed' && `Completed ${getDuration() ? `in ${getDuration()}` : ''}`}
              {toolCall.status === 'error' && 'Failed'}
              {toolCall.status === 'pending' && 'Pending'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getDuration() && (
            <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded">
              {getDuration()}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-white space-y-3">
          {/* Parameters */}
          {Object.keys(toolCall.parameters).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                Parameters
              </div>
              <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(toolCall.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Result */}
          {toolCall.result && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                Result
              </div>
              <div className="bg-gray-50 rounded p-3 font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">
                  {typeof toolCall.result === 'string'
                    ? toolCall.result
                    : JSON.stringify(toolCall.result, null, 2)
                  }
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <div className="text-xs font-semibold text-red-700 mb-2 uppercase">
                Error
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                {toolCall.error}
              </div>
            </div>
          )}

          {/* Timing */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
            <span>
              Started: {new Date(toolCall.startTime).toLocaleTimeString()}
            </span>
            {toolCall.endTime && (
              <span>
                Ended: {new Date(toolCall.endTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
