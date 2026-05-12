'use client';

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Download, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface LogsModalProps {
  containerId: string;
  containerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LogsModal({ containerId, containerName, isOpen, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [tail, setTail] = useState(100);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/docker/containers/${containerId}/logs?tail=${tail}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || '');
      } else {
        setLogs('Failed to fetch logs');
      }
    } catch (error) {
      setLogs('Error fetching logs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && containerId) {
      fetchLogs();
    }
  }, [isOpen, containerId, tail]);

  useEffect(() => {
    // Auto-scroll to bottom when logs update
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-[#0f0f10] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Container Logs</h2>
            <p className="text-sm text-white/40 font-mono">{containerName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tail selector */}
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value={50}>Last 50 lines</option>
              <option value={100}>Last 100 lines</option>
              <option value={200}>Last 200 lines</option>
              <option value={500}>Last 500 lines</option>
              <option value={1000}>Last 1000 lines</option>
            </select>

            {/* Refresh button */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={!logs}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-50"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs content */}
        <div className="flex-1 overflow-auto p-4 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : (
            <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap break-all leading-relaxed">
              {logs || 'No logs available'}
            </pre>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
