const express = require('express');
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users - list all users (admin sees all, members see project-mates)
router.get('/', (req, res) => {
  let users;
  if (req.user.role === 'admin') {
    users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name').all();
  } else {
    users = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u
      JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = ?
        UNION SELECT id FROM projects WHERE owner_id = ?
      )
      ORDER BY u.name
    `).all(req.user.id, req.user.id);
  }
  res.json(users);
});

// GET /api/users/dashboard - dashboard stats
router.get('/dashboard', (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const today = new Date().toISOString().split('T')[0];

  let totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks, recentTasks, projectCount;

  if (isAdmin) {
    totalTasks      = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    todoTasks       = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status='todo'").get();
    inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status='in_progress'").get();
    doneTasks       = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status='done'").get();
    overdueTasks    = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status!='done' AND due_date < ?").get(today);
    recentTasks     = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      JOIN projects p ON p.id = t.project_id
      ORDER BY t.updated_at DESC LIMIT 8
    `).all();
    projectCount    = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  } else {
    const af = `t.project_id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
      UNION SELECT id FROM projects WHERE owner_id = ?)`;
    totalTasks      = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE ${af}`).get(userId, userId);
    todoTasks       = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE status='todo' AND ${af}`).get(userId, userId);
    inProgressTasks = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE status='in_progress' AND ${af}`).get(userId, userId);
    doneTasks       = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE status='done' AND ${af}`).get(userId, userId);
    overdueTasks    = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE status!='done' AND due_date<? AND ${af}`).get(today, userId, userId);
    recentTasks     = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      JOIN projects p ON p.id = t.project_id
      WHERE ${af} ORDER BY t.updated_at DESC LIMIT 8
    `).all(userId, userId);
    projectCount    = db.prepare(`SELECT COUNT(DISTINCT p.id) as count FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.owner_id = ? OR pm.user_id = ?`).get(userId, userId);
  }

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assignee_id = ? ORDER BY t.due_date ASC LIMIT 5
  `).all(userId);

  res.json({
    stats: {
      total: totalTasks.count,
      todo: todoTasks.count,
      in_progress: inProgressTasks.count,
      done: doneTasks.count,
      overdue: overdueTasks.count,
      projects: projectCount.count
    },
    myTasks,
    recentTasks
  });
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
