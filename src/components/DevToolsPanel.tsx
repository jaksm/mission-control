'use client';

import { useState, useEffect } from 'react';
import { FolderGit2, ChevronRight, FileJson, CheckCircle2, Clock } from 'lucide-react';
import { PlanViewer } from './PlanViewer';

interface DevToolsProject {
  slug: string;
  activePlans: number;
  completedPlans: number;
  lastModified: string | null;
}

interface PlanSummary {
  planId: string;
  goal: string;
  status: 'active' | 'completed';
  progress: string;
  taskCount: number;
  completedCount: number;
  project: string;
}

export function DevToolsPanel() {
  const [projects, setProjects] = useState<DevToolsProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<{ planId: string; project: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/devtools/projects');
        const data = await res.json();
        setProjects(data);

        // Auto-select first project with active plans
        const first = data.find((p: DevToolsProject) => p.activePlans > 0) || data[0];
        if (first) {
          setSelectedProject(first.slug);
        }
      } catch (e) {
        console.error('Failed to load dev-tools projects:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Load plans when project changes
  useEffect(() => {
    if (!selectedProject) return;

    async function fetchPlans() {
      try {
        const res = await fetch(`/api/devtools/plans?project=${selectedProject}&status=all`);
        const data = await res.json();
        setPlans(data);

        // Auto-select the active plan, or the most recent completed
        const activePlan = data.find((p: PlanSummary) => p.status === 'active');
        if (activePlan) {
          setSelectedPlan({ planId: activePlan.planId, project: selectedProject! });
        } else if (data.length > 0) {
          setSelectedPlan({ planId: data[0].planId, project: selectedProject! });
        } else {
          setSelectedPlan(null);
        }
      } catch (e) {
        console.error('Failed to load plans:', e);
      }
    }
    fetchPlans();
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-mc-text-secondary">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading dev-tools...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-mc-text-secondary">
        <FolderGit2 className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No dev-tools projects found</p>
        <p className="text-xs mt-1 opacity-60">Plans appear in ~/.dev-tools/*/plans/</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project + Plan Selector */}
      <div className="p-3 border-b border-mc-border space-y-2">
        {/* Project tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {projects.map((project) => (
            <button
              key={project.slug}
              onClick={() => setSelectedProject(project.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedProject === project.slug
                  ? 'bg-mc-accent/20 text-mc-accent'
                  : 'text-mc-text-secondary hover:bg-mc-bg-tertiary'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              {project.slug}
              {project.activePlans > 0 && (
                <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {project.activePlans}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan selector */}
        {plans.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">
            {plans.map((plan) => (
              <button
                key={plan.planId}
                onClick={() => setSelectedPlan({ planId: plan.planId, project: plan.project })}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                  selectedPlan?.planId === plan.planId
                    ? 'bg-mc-bg-tertiary text-mc-text'
                    : 'text-mc-text-secondary hover:bg-mc-bg-tertiary/50'
                }`}
              >
                {plan.status === 'active' ? (
                  <Clock className="w-3 h-3 text-blue-400" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                )}
                <span className="max-w-[200px] truncate">{plan.goal.slice(0, 50)}</span>
                <span className="text-mc-text-secondary/60">{plan.progress}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Plan Viewer */}
      {selectedPlan ? (
        <div className="flex-1 overflow-hidden">
          <PlanViewer planId={selectedPlan.planId} project={selectedPlan.project} />
        </div>
      ) : (
        <div className="flex items-center justify-center p-8 text-mc-text-secondary">
          <FileJson className="w-6 h-6 mr-2 opacity-40" />
          <span className="text-sm">No plans found for this project</span>
        </div>
      )}
    </div>
  );
}
