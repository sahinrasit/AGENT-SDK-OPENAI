import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ToolApprovalCardProps {
  approvalId: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export const ToolApprovalCard: React.FC<ToolApprovalCardProps> = ({
  approvalId,
  toolName,
  parameters,
  timestamp,
  onApprove,
  onReject
}) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-yellow-900">
              Araç Onayı Gerekli
            </h4>
            <span className="text-xs text-yellow-700">
              {new Date(timestamp).toLocaleTimeString('tr-TR')}
            </span>
          </div>

          <div className="mb-3">
            <p className="text-sm text-yellow-800 mb-2">
              Ajan <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">{toolName}</span> aracını kullanmak istiyor.
            </p>

            {parameters && Object.keys(parameters).length > 0 && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                <p className="font-semibold text-yellow-900 mb-1">Parametreler:</p>
                <pre className="text-yellow-800 overflow-x-auto">
                  {JSON.stringify(parameters, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onApprove(approvalId)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Onayla
            </button>

            <button
              onClick={() => onReject(approvalId)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Reddet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
