import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DEV_TOOLS_BASE = path.join(os.homedir(), '.dev-tools');

/**
 * GET /api/devtools/usage?project=slug
 * 
 * Returns token usage and cost data from dev-tools sessions.
 * Stub: returns placeholder structure when no usage data exists yet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project');

  if (!project) {
    return NextResponse.json({ error: 'project parameter required' }, { status: 400 });
  }

  const projectDir = path.join(DEV_TOOLS_BASE, project);

  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check for any log files that might contain usage data
  const logsDir = path.join(projectDir, 'logs');
  let totalEntries = 0;
  let availableDates: string[] = [];

  if (fs.existsSync(logsDir)) {
    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.jsonl'));
    availableDates = logFiles.map(f => f.replace('.jsonl', '')).sort().reverse();
    
    // Count total entries across all files
    for (const file of logFiles) {
      try {
        const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
        totalEntries += content.trim().split('\n').filter(Boolean).length;
      } catch {
        // skip unreadable files
      }
    }
  }

  // Return stub structure — will be populated when JSONL contains usage objects
  return NextResponse.json({
    project,
    status: totalEntries > 0 ? 'ok' : 'awaiting_data',
    message: totalEntries > 0
      ? undefined
      : 'Token usage tracking will appear here once agents use dev-tools and generate session data.',
    summary: {
      totalToolCalls: totalEntries,
      totalTokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      totalCost: 0,
      byModel: {},
      byTool: {},
    },
    availableDates,
  });
}
