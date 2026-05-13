const express = require('express');
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const hasProjectAccess = (userId, projectId, role) => {
  if (role === 'admin') return true;
  return !!db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
};

router.get('/', (req, res) => {
  const { project_id, status, assignee_id } = req.query;
  let q = `
    SELECT t.*, u.name as assignee_name, p.name as project_name, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    JOIN projects p ON p.id = t.project_id
    JOIN users c ON c.id = t.created_by
    WHERE 1=1
  `;
  const params = [];

  if (project_id) { q += ' AND t.project_id = ?'; params.push(project_id); }
  if (status) { q += ' AND t.status = ?'; params.push(status); }
  if (assignee_id) { q += ' AND t.assignee_id = ?'; params.push(assignee_id); }

  if (req.user.role !== 'admin') {
    q += ` AND t.project_id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
      UNION SELECT id FROM projects WHERE owner_id = ?
    )`;
    params.push(req.user.id, req.user.id);
  }

  q += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireAdmin, (req, res) => {
  const { title, description, project_id, assignee_id, status, priority, due_date } = req.body;
  if (!title || !project_id)
    return res.status(400).json({ error: 'Title and project_id are required' });

  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id))
    return res.status(404).json({ error: 'Project not found' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', project_id, assignee_id || null, status || 'todo', priority || 'medium', due_date || null, req.user.id);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, p.name as project_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    JOIN projects p ON p.id = t.project_id WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

router.get('/:id', (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, p.name as project_name, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    JOIN projects p ON p.id = t.project_id
    JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!hasProjectAccess(req.user.id, task.project_id, req.user.role))
    return res.status(403).json({ error: 'Access denied' });

  res.json(task);
});

router.put('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!hasProjectAccess(req.user.id, task.project_id, req.user.role))
    return res.status(403).json({ error: 'Access denied' });

  if (req.user.role !== 'admin') {
    if (task.assignee_id !== req.user.id)
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Only status can be updated' });
    db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  } else {
    const { title, description, assignee_id, status, priority, due_date } = req.body;
    db.prepare(`
      UPDATE tasks SET title=?, description=?, assignee_id=?, status=?, priority=?, due_date=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      title || task.title,
      description ?? task.description,
      assignee_id !== undefined ? assignee_id : task.assignee_id,
      status || task.status,
      priority || task.priority,
      due_date !== undefined ? due_date : task.due_date,
      req.params.id
    );
  }

  res.json(db.prepare(`
    SELECT t.*, u.name as assignee_name, p.name as project_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    JOIN projects p ON p.id = t.project_id WHERE t.id = ?
  `).get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
