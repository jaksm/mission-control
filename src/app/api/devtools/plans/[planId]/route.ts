import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEV_TOOLS_BASE = process.env.DEV_TOOLS_PATH || join(process.env.HOME || '', '.dev-tools');

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * GET /api/devtools/plans/[planId]?project=openclaw-devtools
 * 
 * Returns full plan data (all tasks, subtasks, notes, context, checkpoints)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');

    if (!project) {
      return NextResponse.json({ error: 'project parameter required' }, { status: 400 });
    }

    const filename = `${planId}.json`;

    // Try active plans first
    const activePath = join(DEV_TOOLS_BASE, project, 'plans', filename);
    if (existsSync(activePath)) {
      const raw = readFileSync(activePath, 'utf-8');
      const plan = JSON.parse(raw);
      return NextResponse.json({ ...plan, _status: 'active', _project: project });
    }

    // Try completed plans
    const completedPath = join(DEV_TOOLS_BASE, project, 'plans', '.completed', filename);
    if (existsSync(completedPath)) {
      const raw = readFileSync(completedPath, 'utf-8');
      const plan = JSON.parse(raw);
      return NextResponse.json({ ...plan, _status: 'completed', _project: project });
    }

    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to read plan:', error);
    return NextResponse.json({ error: 'Failed to read plan' }, { status: 500 });
  }
}
