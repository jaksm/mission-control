import { NextResponse } from 'next/server';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const DEV_TOOLS_BASE = process.env.DEV_TOOLS_PATH || join(process.env.HOME || '', '.dev-tools');

interface DevToolsProject {
  slug: string;
  activePlans: number;
  completedPlans: number;
  lastModified: string | null;
}

/**
 * GET /api/devtools/projects
 * 
 * Lists all dev-tools projects (directories in ~/.dev-tools/ that have plans/)
 */
export async function GET() {
  try {
    if (!existsSync(DEV_TOOLS_BASE)) {
      return NextResponse.json([]);
    }

    const entries = readdirSync(DEV_TOOLS_BASE, { withFileTypes: true });
    const projects: DevToolsProject[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const plansDir = join(DEV_TOOLS_BASE, entry.name, 'plans');
      if (!existsSync(plansDir)) continue;

      // Count active plans
      const activeFiles = readdirSync(plansDir).filter(f => f.endsWith('.json'));
      
      // Count completed plans
      const completedDir = join(plansDir, '.completed');
      const completedFiles = existsSync(completedDir)
        ? readdirSync(completedDir).filter(f => f.endsWith('.json'))
        : [];

      // Get last modified time of the plans directory
      let lastModified: string | null = null;
      try {
        const stat = statSync(plansDir);
        lastModified = stat.mtime.toISOString();
      } catch { /* ignore */ }

      projects.push({
        slug: entry.name,
        activePlans: activeFiles.length,
        completedPlans: completedFiles.length,
        lastModified,
      });
    }

    // Sort by active plans (desc), then by slug
    projects.sort((a, b) => b.activePlans - a.activePlans || a.slug.localeCompare(b.slug));

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to list dev-tools projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}
