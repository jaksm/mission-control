'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useMissionControl } from '@/lib/store';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './TaskModal';
import { formatDistanceToNow } from 'date-fns';

interface MissionQueueProps {
  workspaceId?: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'BACKLOG', color: 'border-t-mc-accent-pink' },
  { id: 'assigned', label: 'ASSIGNED', color: 'border-t-mc-accent-yellow' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'border-t-mc-accent' },
  { id: 'review', label: 'REVIEW', color: 'border-t-mc-accent-purple' },
  { id: 'done', label: 'DONE', color: 'border-t-mc-accent-green' },
];

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const { tasks } = useMissionControl();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-mc-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">Mission Queue</span>
        </div>
        <span className="text-xs text-mc-text-secondary">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Columns — read-only, snap scroll on mobile */}
      <div className="flex-1 flex gap-3 p-3 overflow-x-auto snap-x snap-mandatory lg:snap-none">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-[85vw] sm:w-auto sm:flex-1 min-w-[220px] max-w-[300px] flex flex-col bg-mc-bg rounded-lg border border-mc-border/50 border-t-2 snap-center ${column.color}`}
            >
              {/* Column Header */}
              <div className="p-2 border-b border-mc-border flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-mc-text-secondary">
                  {column.label}
                </span>
                <span className="text-xs bg-mc-bg-tertiary px-2 py-0.5 rounded text-mc-text-secondary">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setViewingTask(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal (read-only) */}
      {viewingTask && (
        <TaskModal task={viewingTask} onClose={() => setViewingTask(null)} workspaceId={workspaceId} />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-mc-bg-secondary border border-mc-border/50 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 hover:border-mc-accent/40 active:scale-[0.98]"
    >
      <div className="p-4">
        {/* Title */}
        <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-3">
          {task.title}
        </h4>

        {/* Assigned agent */}
        {task.assigned_agent && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-2 bg-mc-bg-tertiary/50 rounded">
            <span className="text-base">{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</span>
            <span className="text-xs text-mc-text-secondary truncate">
              {(task.assigned_agent as unknown as { name: string }).name}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-end pt-2 border-t border-mc-border/20">
          <span className="text-[10px] text-mc-text-secondary/60">
            {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
