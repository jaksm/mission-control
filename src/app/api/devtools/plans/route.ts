import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEV_TOOLS_BASE = process.env.DEV_TOOLS_PATH || join(process.env.HOME || '', '.dev-tools');

interface PlanSummary {
  planId: string;
  goal: string;
  status: 'active' | 'completed';
  progress: string;
  taskCount: number;
  completedCount: number;
  project: string;
}

function countTasks(tasks: any[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const task of tasks) {
    if (task.subtasks?.length) {
      const sub = countTasks(task.subtasks);
      total += sub.total;
      completed += sub.completed;
    } else {
      total++;
      if (task.status === 'completed') completed++;
    }
  }
  return { total, completed };
}

/**
 * GET /api/devtools/plans?project=openclaw-devtools&status=active|completed|all
 * 
 * Lists plans for a project (summaries, not full plan data)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const statusFilter = searchParams.get('status') || 'active';

    if (!project) {
      return NextResponse.json({ error: 'project parameter required' }, { status: 400 });
    }

    const plansDir = join(DEV_TOOLS_BASE, project, 'plans');
    if (!existsSync(plansDir)) {
      return NextResponse.json([]);
    }

    const plans: PlanSummary[] = [];

    // Active plans
    if (statusFilter === 'active' || statusFilter === 'all') {
      const activeFiles = readdirSync(plansDir).filter(f => f.endsWith('.json'));
      for (const file of activeFiles) {
        try {
          const raw = readFileSync(join(plansDir, file), 'utf-8');
          const plan = JSON.parse(raw);
          const { total, completed } = countTasks(plan.tasks || []);
          plans.push({
            planId: plan.planId || file.replace('.json', ''),
            goal: plan.goal || 'No goal specified',
            status: 'active',
            progress: `${completed}/${total}`,
            taskCount: total,
            completedCount: completed,
            project,
          });
        } catch (e) {
          console.error(`Failed to parse plan ${file}:`, e);
        }
      }
    }

    // Completed plans
    if (statusFilter === 'completed' || statusFilter === 'all') {
      const completedDir = join(plansDir, '.completed');
      if (existsSync(completedDir)) {
        const completedFiles = readdirSync(completedDir).filter(f => f.endsWith('.json'));
        for (const file of completedFiles) {
          try {
            const raw = readFileSync(join(completedDir, file), 'utf-8');
            const plan = JSON.parse(raw);
            const { total, completed } = countTasks(plan.tasks || []);
            plans.push({
              planId: plan.planId || file.replace('.json', ''),
              goal: plan.goal || 'No goal specified',
              status: 'completed',
              progress: `${completed}/${total}`,
              taskCount: total,
              completedCount: completed,
              project,
            });
          } catch (e) {
            console.error(`Failed to parse completed plan ${file}:`, e);
          }
        }
      }
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Failed to list plans:', error);
    return NextResponse.json({ error: 'Failed to list plans' }, { status: 500 });
  }
}
