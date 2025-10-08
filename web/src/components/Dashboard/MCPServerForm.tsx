import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type McpType = 'hosted' | 'http' | 'stdio';

export interface McpFormValues {
  type: McpType;
  name: string;
  // Hosted MCP fields
  serverLabel?: string;
  serverUrl?: string;
  // HTTP MCP fields
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  // Stdio MCP fields
  command?: string;
  args?: string[];
  workingDirectory?: string;
  env?: Record<string, string>;
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
          <h3 className="text-lg font-semibold text-gray-900">MCP Sunucu Ekle</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
            <select
              className="input w-full"
              value={values.type}
              onChange={(e) => setValues(v => ({ ...v, type: e.target.value as McpType }))}
            >
              <option value="hosted">Hosted MCP (Model tarafından çağrılır)</option>
              <option value="http">HTTP MCP (Streamable HTTP)</option>
              <option value="stdio">Stdio MCP (Komut satırı)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {values.type === 'hosted' && 'Model doğrudan çağırır - OpenAI API desteği gerekir'}
              {values.type === 'http' && 'Backend HTTP ile bağlanır - çoğu durum için önerilir'}
              {values.type === 'stdio' && 'Yerel komut satırı MCP sunucusu - makinenizde çalışır'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
            <input
              className="input w-full"
              value={values.name}
              onChange={(e) => setValues(v => ({ ...v, name: e.target.value }))}
              placeholder="mcp-sunucu-ismi"
              required
            />
          </div>

          {values.type === 'hosted' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sunucu Etiketi</label>
                <input
                  className="input w-full"
                  value={values.serverLabel || ''}
                  onChange={(e) => setValues(v => ({ ...v, serverLabel: e.target.value }))}
                  placeholder="sunucu-etiketi"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Hosted MCP sunucusu için tanımlayıcı</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sunucu URL</label>
                <input
                  className="input w-full"
                  value={values.serverUrl || ''}
                  onChange={(e) => setValues(v => ({ ...v, serverUrl: e.target.value }))}
                  placeholder="https://mcp.example.com/sse"
                  required
                />
              </div>
            </>
          )}

          {values.type === 'http' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTTP URL</label>
              <input
                className="input w-full"
                value={values.url || ''}
                onChange={(e) => setValues(v => ({ ...v, url: e.target.value }))}
                placeholder="https://mcp.example.com/mcp/sse"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Streamable HTTP endpoint adresi</p>
            </div>
          )}

          {values.type === 'stdio' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Komut</label>
                <input
                  className="input w-full"
                  value={values.command || ''}
                  onChange={(e) => setValues(v => ({ ...v, command: e.target.value }))}
                  placeholder="npx"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Çalıştırılacak komut (örn: npx, node, python)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parametreler (virgülle ayrılmış)</label>
                <input
                  className="input w-full"
                  value={values.args?.join(', ') || ''}
                  onChange={(e) => setValues(v => ({ ...v, args: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="-y, @modelcontextprotocol/server-filesystem, ./files"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çalışma Dizini (opsiyonel)</label>
                <input
                  className="input w-full"
                  value={values.workingDirectory || ''}
                  onChange={(e) => setValues(v => ({ ...v, workingDirectory: e.target.value }))}
                  placeholder="/dizin/yolu"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">İptal</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


