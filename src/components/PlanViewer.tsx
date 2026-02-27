'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, XCircle, AlertTriangle, Clock, Ban, FileText, Lightbulb, FolderOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlanTask {
  id: string;
  title: string;
  status: string;
  notes?: string;
  checkpoint?: boolean;
  context?: {
    findings?: string[];
    decisions?: string[];
    files?: string[];
  };
  subtasks?: PlanTask[];
}

interface Checkpoint {
  taskId: string;
  completedAt: string;
  summary: string;
}

interface Plan {
  planId: string;
  goal: string;
  tasks: PlanTask[];
  checkpoints?: Checkpoint[];
  _status: 'active' | 'completed';
  _project: string;
}

interface PlanViewerProps {
  planId: string;
  project: string;
}

const statusIcons: Record<string, JSX.Element> = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
  in_progress: <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />,
  pending: <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />,
  failed: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  blocked: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
  cancelled: <Ban className="w-4 h-4 text-gray-600 flex-shrink-0" />,
};

const statusColors: Record<string, string> = {
  completed: 'text-green-400',
  in_progress: 'text-blue-400',
  pending: 'text-gray-500',
  failed: 'text-red-400',
  blocked: 'text-yellow-400',
  cancelled: 'text-gray-600',
};

function countProgress(tasks: PlanTask[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const task of tasks) {
    if (task.subtasks?.length) {
      const sub = countProgress(task.subtasks);
      total += sub.total;
      completed += sub.completed;
    } else {
      total++;
      if (task.status === 'completed') completed++;
    }
  }
  return { total, completed };
}

function TaskNode({ task, depth = 0 }: { task: PlanTask; depth?: number }) {
  const [expanded, setExpanded] = useState(
    task.status === 'in_progress' || task.subtasks?.some(s => s.status === 'in_progress')
  );
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const hasContext = task.context && (task.context.findings?.length || task.context.decisions?.length || task.context.files?.length);
  const [showContext, setShowContext] = useState(false);

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-mc-border/30 pl-3' : ''}`}>
      <div className="flex items-start gap-2 py-1.5 group">
        {/* Expand/collapse button */}
        {hasSubtasks ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-0.5 hover:bg-mc-bg-tertiary rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-mc-text-secondary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-mc-text-secondary" />
            )}
          </button>
        ) : (
          <div className="w-4.5" />
        )}

        {/* Status icon */}
        {statusIcons[task.status] || statusIcons.pending}

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${statusColors[task.status] || 'text-gray-500'}`}>
              {task.id}
            </span>
            <span className={`text-sm ${task.status === 'completed' ? 'text-mc-text-secondary' : 'text-mc-text'}`}>
              {task.title}
            </span>
            {task.checkpoint && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-medium">
                checkpoint
              </span>
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="text-xs text-mc-text-secondary mt-1 leading-relaxed">
              {task.notes}
            </p>
          )}

          {/* Context toggle */}
          {hasContext && (
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-[10px] text-mc-accent hover:text-mc-accent/80 mt-1"
            >
              {showContext ? '▾ Hide context' : '▸ Show context'}
            </button>
          )}

          {/* Context details */}
          {showContext && task.context && (
            <div className="mt-2 space-y-2 text-xs bg-mc-bg-tertiary/30 rounded p-2">
              {task.context.findings?.length ? (
                <div>
                  <div className="flex items-center gap-1 text-mc-accent-cyan font-medium mb-1">
                    <Lightbulb className="w-3 h-3" /> Findings
                  </div>
                  <ul className="space-y-0.5 text-mc-text-secondary">
                    {task.context.findings.map((f, i) => (
                      <li key={i} className="pl-2">• {f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {task.context.decisions?.length ? (
                <div>
                  <div className="flex items-center gap-1 text-mc-accent-yellow font-medium mb-1">
                    <FileText className="w-3 h-3" /> Decisions
                  </div>
                  <ul className="space-y-0.5 text-mc-text-secondary">
                    {task.context.decisions.map((d, i) => (
                      <li key={i} className="pl-2">→ {d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {task.context.files?.length ? (
                <div>
                  <div className="flex items-center gap-1 text-mc-accent-green font-medium mb-1">
                    <FolderOpen className="w-3 h-3" /> Files
                  </div>
                  <ul className="space-y-0.5 text-mc-text-secondary font-mono">
                    {task.context.files.map((f, i) => (
                      <li key={i} className="pl-2 text-[10px]">{f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="mt-0.5">
          {task.subtasks!.map((subtask) => (
            <TaskNode key={subtask.id} task={subtask} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanViewer({ planId, project }: PlanViewerProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        setLoading(true);
        const res = await fetch(`/api/devtools/plans/${planId}?project=${project}`);
        if (!res.ok) {
          setError('Failed to load plan');
          return;
        }
        const data = await res.json();
        setPlan(data);
      } catch (e) {
        setError('Failed to load plan');
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [planId, project]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-mc-text-secondary">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading plan...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center p-8 text-red-400">
        <XCircle className="w-5 h-5 mr-2" /> {error || 'Plan not found'}
      </div>
    );
  }

  const { total, completed } = countProgress(plan.tasks);
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Plan Header */}
      <div className="p-4 border-b border-mc-border">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            plan._status === 'active'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {plan._status}
          </span>
          <span className="text-xs text-mc-text-secondary font-mono">{plan._project}</span>
        </div>

        <h2 className="text-sm font-medium leading-snug mb-3">{plan.goal}</h2>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-mc-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-mc-accent to-mc-accent-green transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-mc-text-secondary">
            {completed}/{total} ({progressPct}%)
          </span>
        </div>
      </div>

      {/* Task Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {plan.tasks.map((task) => (
          <TaskNode key={task.id} task={task} />
        ))}
      </div>

      {/* Checkpoints */}
      {plan.checkpoints && plan.checkpoints.length > 0 && (
        <div className="border-t border-mc-border p-4">
          <h3 className="text-xs font-medium uppercase text-mc-text-secondary mb-2">
            Checkpoints ({plan.checkpoints.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {plan.checkpoints.map((cp, i) => (
              <div key={i} className="text-xs bg-mc-bg-tertiary/30 rounded p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-mc-accent">Phase {cp.taskId}</span>
                  <span className="text-mc-text-secondary">
                    {formatDistanceToNow(new Date(cp.completedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-mc-text-secondary leading-relaxed line-clamp-2">
                  {cp.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
