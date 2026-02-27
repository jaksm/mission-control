import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DEV_TOOLS_BASE = path.join(os.homedir(), '.dev-tools');

/**
 * GET /api/devtools/logs?project=slug&date=YYYY-MM-DD&limit=100
 * 
 * Returns tool call log entries from ~/.dev-tools/{slug}/logs/{date}.jsonl
 * Stub: returns empty array with metadata when no logs exist yet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project');
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  if (!project) {
    return NextResponse.json({ error: 'project parameter required' }, { status: 400 });
  }

  const logsDir = path.join(DEV_TOOLS_BASE, project, 'logs');
  const logFile = path.join(logsDir, `${date}.jsonl`);

  // Check if logs directory exists
  if (!fs.existsSync(logsDir)) {
    return NextResponse.json({
      entries: [],
      total: 0,
      date,
      project,
      status: 'no_logs_dir',
      message: 'Tool call logging not yet active for this project. Logs will appear here once agents use dev-tools.',
    });
  }

  // Check if specific date file exists
  if (!fs.existsSync(logFile)) {
    // List available dates
    const availableDates = fs.readdirSync(logsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''))
      .sort()
      .reverse();

    return NextResponse.json({
      entries: [],
      total: 0,
      date,
      project,
      status: 'no_logs_for_date',
      availableDates,
      message: `No logs for ${date}.`,
    });
  }

  // Parse JSONL
  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines
      .slice(-limit)
      .map((line, i) => {
        try {
          return JSON.parse(line);
        } catch {
          return { _parseError: true, _line: i, _raw: line.slice(0, 200) };
        }
      });

    return NextResponse.json({
      entries,
      total: lines.length,
      showing: entries.length,
      date,
      project,
      status: 'ok',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to read log file',
      detail: String(error),
    }, { status: 500 });
  }
}
