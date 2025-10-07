import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type McpType = 'hosted' | 'http';

export interface McpFormValues {
  type: McpType;
  name: string;
  serverLabel?: string;
  serverUrl?: string;
  url?: string;
}

interface MCPServerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: McpFormValues) => Promise<void> | void;
}

export const MCPServerForm: React.FC<MCPServerFormProps> = ({ open, onClose, onSubmit }) => {
  const [values, setValues] = useState<McpFormValues>({ type: 'hosted', name: '', serverLabel: '', serverUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Kaydetme başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add MCP Server</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="input w-full"
              value={values.type}
              onChange={(e) => setValues(v => ({ ...v, type: e.target.value as McpType }))}
            >
              <option value="hosted">Hosted</option>
              <option value="http">HTTP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="input w-full"
              value={values.name}
              onChange={(e) => setValues(v => ({ ...v, name: e.target.value }))}
              placeholder="my-mcp-server"
              required
            />
          </div>

          {values.type === 'hosted' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server Label</label>
                <input
                  className="input w-full"
                  value={values.serverLabel || ''}
                  onChange={(e) => setValues(v => ({ ...v, serverLabel: e.target.value }))}
                  placeholder="my-server-label"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
                <input
                  className="input w-full"
                  value={values.serverUrl || ''}
                  onChange={(e) => setValues(v => ({ ...v, serverUrl: e.target.value }))}
                  placeholder="https://.../mcp/sse"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTTP URL</label>
              <input
                className="input w-full"
                value={values.url || ''}
                onChange={(e) => setValues(v => ({ ...v, url: e.target.value }))}
                placeholder="https://server.example.com/mcp"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


