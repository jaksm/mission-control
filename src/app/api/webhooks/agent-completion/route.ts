import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import { queryOne, queryAll, run } from '@/lib/db';
import type { Task, OpenClawSession } from '@/lib/types';

function verifyWebhookSignature(signature: string, rawBody: string): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) return true; // Dev mode
  if (!signature) return false;
  const expectedSignature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/agent-completion
 * 
 * Payload options:
 * { "task_id": "uuid", "summary": "..." }
 * { "session_id": "...", "message": "TASK_COMPLETE: ..." }
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-webhook-signature');
      if (!signature || !verifyWebhookSignature(signature, rawBody)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const now = new Date().toISOString();

    // Handle direct task_id completion
    if (body.task_id) {
      const task = queryOne<Task & { assigned_agent_name?: string }>(
        `SELECT t.*, a.name as assigned_agent_name
         FROM tasks t
         LEFT JOIN agents a ON t.assigned_agent_id = a.id
         WHERE t.id = ?`,
        [body.task_id]
      );

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      // Move to review if not already in review or done
      if (task.status !== 'review' && task.status !== 'done') {
        run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', ['review', now, task.id]);
      }

      run(
        `INSERT INTO events (id, type, agent_id, task_id, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'task_completed', task.assigned_agent_id, task.id,
         `${task.assigned_agent_name} completed: ${body.summary || 'Task finished'}`, now]
      );

      if (task.assigned_agent_id) {
        run('UPDATE agents SET status = ?, updated_at = ? WHERE id = ?', ['standby', now, task.assigned_agent_id]);
      }

      return NextResponse.json({
        success: true, task_id: task.id, new_status: 'review',
        message: 'Task moved to review'
      });
    }

    // Handle session-based completion
    if (body.session_id && body.message) {
      const completionMatch = body.message.match(/TASK_COMPLETE:\s*(.+)/i);
      if (!completionMatch) {
        return NextResponse.json(
          { error: 'Invalid format. Expected: TASK_COMPLETE: [summary]' },
          { status: 400 }
        );
      }

      const summary = completionMatch[1].trim();
      const session = queryOne<OpenClawSession>(
        'SELECT * FROM openclaw_sessions WHERE openclaw_session_id = ? AND status = ?',
        [body.session_id, 'active']
      );

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const task = queryOne<Task & { assigned_agent_name?: string }>(
        `SELECT t.*, a.name as assigned_agent_name
         FROM tasks t
         LEFT JOIN agents a ON t.assigned_agent_id = a.id
         WHERE t.assigned_agent_id = ? AND t.status IN ('assigned', 'in_progress')
         ORDER BY t.updated_at DESC LIMIT 1`,
        [session.agent_id]
      );

      if (!task) {
        return NextResponse.json({ error: 'No active task found' }, { status: 404 });
      }

      if (task.status !== 'review' && task.status !== 'done') {
        run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', ['review', now, task.id]);
      }

      run(
        `INSERT INTO events (id, type, agent_id, task_id, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'task_completed', session.agent_id, task.id,
         `${task.assigned_agent_name} completed: ${summary}`, now]
      );

      run('UPDATE agents SET status = ?, updated_at = ? WHERE id = ?', ['standby', now, session.agent_id]);

      return NextResponse.json({
        success: true, task_id: task.id, agent_id: session.agent_id, summary,
        new_status: 'review', message: 'Task moved to review'
      });
    }

    return NextResponse.json(
      { error: 'Invalid payload. Provide either task_id or session_id + message' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Agent completion webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const recentCompletions = queryAll(
      `SELECT e.*, a.name as agent_name, t.title as task_title
       FROM events e
       LEFT JOIN agents a ON e.agent_id = a.id
       LEFT JOIN tasks t ON e.task_id = t.id
       WHERE e.type = 'task_completed'
       ORDER BY e.created_at DESC LIMIT 10`
    );

    return NextResponse.json({
      status: 'active',
      recent_completions: recentCompletions,
      endpoint: '/api/webhooks/agent-completion'
    });
  } catch (error) {
    console.error('Failed to fetch completion status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
