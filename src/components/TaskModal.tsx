'use client';

import { useState, useEffect } from 'react';
import { X, Activity, Package, Monitor } from 'lucide-react';
import { useMissionControl } from '@/lib/store';
import { ActivityLog } from './ActivityLog';
import { DeliverablesList } from './DeliverablesList';
import { SessionsList } from './SessionsList';
import { formatDistanceToNow } from 'date-fns';
import type { Task } from '@/lib/types';

type TabType = 'overview' | 'activity' | 'deliverables' | 'sessions';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  workspaceId?: string;
}

const statusColors: Record<string, string> = {
  backlog: 'bg-pink-500/20 text-pink-400',
  assigned: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-purple-500/20 text-purple-400',
  done: 'bg-green-500/20 text-green-400',
};

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { selectedTask } = useMissionControl();

  // Use the live selectedTask from store if it matches (for SSE updates)
  const liveTask = selectedTask?.id === task.id ? selectedTask : task;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'activity' as TabType, label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'deliverables' as TabType, label: 'Deliverables', icon: <Package className="w-4 h-4" /> },
    { id: 'sessions' as TabType, label: 'Sessions', icon: <Monitor className="w-4 h-4" /> },
  ];

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={onClose}>
      <div
        className="bg-mc-bg-secondary border border-mc-border rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-mc-border flex items-start justify-between">
          <div className="flex-1 mr-4">
            <h2 className="text-lg font-semibold">{liveTask.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[liveTask.status] || 'bg-gray-500/20 text-gray-400'}`}>
                {liveTask.status.replace('_', ' ').toUpperCase()}
              </span>
              {liveTask.assigned_agent && (
                <span className="text-xs text-mc-text-secondary">
                  → {(liveTask.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}{' '}
                  {(liveTask.assigned_agent as unknown as { name: string }).name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-mc-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-mc-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-mc-accent border-b-2 border-mc-accent'
                  : 'text-mc-text-secondary hover:text-mc-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {liveTask.description ? (
                <div>
                  <h3 className="text-xs font-medium uppercase text-mc-text-secondary mb-2">Description</h3>
                  <p className="text-sm text-mc-text whitespace-pre-wrap">{liveTask.description}</p>
                </div>
              ) : (
                <p className="text-sm text-mc-text-secondary italic">No description</p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-mc-border/50">
                <div>
                  <span className="text-xs text-mc-text-secondary">Created</span>
                  <p className="text-sm">{formatDistanceToNow(new Date(liveTask.created_at), { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="text-xs text-mc-text-secondary">Updated</span>
                  <p className="text-sm">{formatDistanceToNow(new Date(liveTask.updated_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && <ActivityLog taskId={liveTask.id} />}
          {activeTab === 'deliverables' && <DeliverablesList taskId={liveTask.id} />}
          {activeTab === 'sessions' && <SessionsList taskId={liveTask.id} />}
        </div>
      </div>
    </div>
  );
}
