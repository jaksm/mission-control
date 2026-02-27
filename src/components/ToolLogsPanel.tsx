'use client';

import { useState, useEffect } from 'react';
import { Terminal, Clock, AlertCircle } from 'lucide-react';

interface ToolLogsData {
  entries: unknown[];
  total: number;
  status: string;
  message?: string;
  availableDates?: string[];
}

interface ToolLogsPanelProps {
  project?: string;
}

export function ToolLogsPanel({ project }: ToolLogsPanelProps) {
  const [data, setData] = useState<ToolLogsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) {
      setLoading(false);
      return;
    }

    async function fetchLogs() {
      try {
        const res = await fetch(`/api/devtools/logs?project=${project}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Failed to load tool logs:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [project]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-mc-text-secondary">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-mc-text-secondary">
        <Terminal className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">No project selected</p>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-mc-text-secondary">
        <Terminal className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">Awaiting tool call data</p>
        <p className="text-xs opacity-60 text-center max-w-xs">
          Tool call logs will stream here once agents start using dev-tools on this project.
          Each call is logged as JSONL to <code className="text-mc-accent/60">~/.dev-tools/{project}/logs/</code>
        </p>
        {data?.availableDates && data.availableDates.length > 0 && (
          <div className="mt-4 text-xs">
            <span className="text-mc-text-secondary">Available dates: </span>
            {data.availableDates.map(d => (
              <span key={d} className="inline-block px-2 py-0.5 bg-mc-bg-tertiary rounded mr-1">{d}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // When data exists, render the log entries
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-mc-border flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-mc-text-secondary">
          Tool Call Log
        </span>
        <span className="text-xs text-mc-text-secondary">
          {data.total} calls
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
        {(data.entries as Record<string, unknown>[]).map((entry, i) => {
          const tool = String(entry.tool || entry._tool || 'unknown');
          const duration = entry.duration ? String(entry.duration) : null;
          const error = entry.error ? String(entry.error) : null;
          return (
          <div key={i} className="p-2 bg-mc-bg rounded border border-mc-border/30 hover:border-mc-border transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-mc-accent">{tool}</span>
              {duration && (
                <span className="text-mc-text-secondary/50">{duration}ms</span>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-1 mt-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
