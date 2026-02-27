import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import { broadcast } from '@/lib/events';
import type { Task, Agent } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/tasks/[id]/complete
 * 
 * Convenience endpoint for agents to mark a task as done.
 * Combines status update + activity log + agent status reset.
 * 
 * Body:
 * {
 *   "summary": "What was accomplished",
 *   "deliverables": [{ "type": "file"|"url"|"artifact", "title": "...", "path": "..." }]
 * }
 * 
 * Agent identity via headers:
 *   X-Agent-Name: "Developer"
 *   X-Agent-Id: "uuid" (optional, resolved from name if not provided)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    // Resolve agent identity
    const agentName = request.headers.get('x-agent-name');
    const agentId = request.headers.get('x-agent-id');

    const task = queryOne<Task & { assigned_agent_name?: string }>(
      `SELECT t.*, a.name as assigned_agent_name
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       WHERE t.id = ?`,
      [id]
    );

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Move task to review (or done if explicitly requested)
    const targetStatus = body.status === 'done' ? 'done' : 'review';
    run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', [targetStatus, now, id]);

    // Log completion activity
    const summary = body.summary || 'Task completed';
    run(
      `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, task.assigned_agent_id || agentId, 'completed', summary, now]
    );

    // Register deliverables if provided
    if (body.deliverables && Array.isArray(body.deliverables)) {
      for (const d of body.deliverables) {
        run(
          `INSERT INTO task_deliverables (id, task_id, deliverable_type, title, path, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, d.type || 'artifact', d.title, d.path || null, d.description || null, now]
        );
      }
    }

    // Log event
    run(
      `INSERT INTO events (id, type, agent_id, task_id, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'task_completed', task.assigned_agent_id, id,
       `${task.assigned_agent_name || agentName || 'Agent'} completed: ${summary}`, now]
    );

    // Reset agent to standby
    if (task.assigned_agent_id) {
      run('UPDATE agents SET status = ?, updated_at = ? WHERE id = ?', ['standby', now, task.assigned_agent_id]);
    }

    // Fetch updated task and broadcast
    const updatedTask = queryOne<Task>(
      `SELECT t.*, aa.name as assigned_agent_name, aa.avatar_emoji as assigned_agent_emoji
       FROM tasks t
       LEFT JOIN agents aa ON t.assigned_agent_id = aa.id
       WHERE t.id = ?`,
      [id]
    );

    if (updatedTask) {
      broadcast({ type: 'task_updated', payload: updatedTask });
    }

    return NextResponse.json({
      success: true,
      task_id: id,
      status: targetStatus,
      summary,
      deliverables_count: body.deliverables?.length || 0
    });
  } catch (error) {
    console.error('Failed to complete task:', error);
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}
