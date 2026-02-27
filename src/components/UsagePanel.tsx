'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, Coins } from 'lucide-react';

interface UsageData {
  project: string;
  status: string;
  message?: string;
  summary: {
    totalToolCalls: number;
    totalTokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
    totalCost: number;
    byModel: Record<string, unknown>;
    byTool: Record<string, unknown>;
  };
}

interface UsagePanelProps {
  project?: string;
}

export function UsagePanel({ project }: UsagePanelProps) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) {
      setLoading(false);
      return;
    }

    async function fetchUsage() {
      try {
        const res = await fetch(`/api/devtools/usage?project=${project}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Failed to load usage:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
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
        <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">No project selected</p>
      </div>
    );
  }

  if (!data || data.status === 'awaiting_data') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-mc-text-secondary">
        <Coins className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">Awaiting usage data</p>
        <p className="text-xs opacity-60 text-center max-w-xs">
          Token usage and cost tracking will appear here once agents generate session data through dev-tools.
        </p>
      </div>
    );
  }

  const { summary } = data;
  const tokens = summary.totalTokens;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-mc-border">
        <span className="text-xs font-medium uppercase tracking-wider text-mc-text-secondary">
          Token Usage & Cost
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-mc-bg rounded-lg border border-mc-border/50 p-3">
            <p className="text-[10px] uppercase text-mc-text-secondary mb-1">Tool Calls</p>
            <p className="text-lg font-bold text-mc-accent">{summary.totalToolCalls.toLocaleString()}</p>
          </div>
          <div className="bg-mc-bg rounded-lg border border-mc-border/50 p-3">
            <p className="text-[10px] uppercase text-mc-text-secondary mb-1">Input Tokens</p>
            <p className="text-lg font-bold">{tokens.input.toLocaleString()}</p>
          </div>
          <div className="bg-mc-bg rounded-lg border border-mc-border/50 p-3">
            <p className="text-[10px] uppercase text-mc-text-secondary mb-1">Output Tokens</p>
            <p className="text-lg font-bold">{tokens.output.toLocaleString()}</p>
          </div>
          <div className="bg-mc-bg rounded-lg border border-mc-border/50 p-3">
            <p className="text-[10px] uppercase text-mc-text-secondary mb-1">Est. Cost</p>
            <p className="text-lg font-bold text-mc-accent-yellow">${summary.totalCost.toFixed(4)}</p>
          </div>
        </div>

        {/* Cache stats */}
        {(tokens.cacheRead > 0 || tokens.cacheWrite > 0) && (
          <div className="bg-mc-bg rounded-lg border border-mc-border/50 p-3">
            <p className="text-[10px] uppercase text-mc-text-secondary mb-2">Cache Performance</p>
            <div className="flex gap-4 text-sm">
              <span>Read: <strong>{tokens.cacheRead.toLocaleString()}</strong></span>
              <span>Write: <strong>{tokens.cacheWrite.toLocaleString()}</strong></span>
              {tokens.input > 0 && (
                <span className="text-mc-accent-green">
                  Hit rate: {((tokens.cacheRead / (tokens.input + tokens.cacheRead)) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
