require('dotenv').config({ path: __dirname + '/backend/.env' });
const db = require('./backend/db/database');
const bcrypt = require('bcryptjs');

console.log('Seeding demo data...');

// Create demo users
const users = [
  { name: 'Admin User', email: 'admin@demo.com', password: 'password123', role: 'admin' },
  { name: 'Alice Johnson', email: 'member@demo.com', password: 'password123', role: 'member' },
  { name: 'Bob Smith', email: 'bob@demo.com', password: 'password123', role: 'member' },
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
users.forEach(u => {
  insertUser.run(u.name, u.email, bcrypt.hashSync(u.password, 10), u.role);
});

const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.com');
const alice = db.prepare('SELECT id FROM users WHERE email = ?').get('member@demo.com');
const bob = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@demo.com');

// Create demo projects
const p1 = db.prepare('INSERT OR IGNORE INTO projects (name, description, owner_id) VALUES (?, ?, ?)')
  .run('Website Redesign', 'Revamp the company website with modern UI/UX', admin.id);
const p2 = db.prepare('INSERT OR IGNORE INTO projects (name, description, owner_id) VALUES (?, ?, ?)')
  .run('Mobile App v2', 'Second version of our flagship mobile application', admin.id);

const proj1 = db.prepare('SELECT id FROM projects WHERE name = ?').get('Website Redesign');
const proj2 = db.prepare('SELECT id FROM projects WHERE name = ?').get('Mobile App v2');

// Add members to projects
const addMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)');
[admin.id, alice.id, bob.id].forEach(uid => addMember.run(proj1.id, uid));
[admin.id, alice.id].forEach(uid => addMember.run(proj2.id, uid));

// Create tasks
const today = new Date();
const future = d => { const dt = new Date(today); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; };
const past = d => { const dt = new Date(today); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0]; };

const insertTask = db.prepare(`
  INSERT OR IGNORE INTO tasks (title, description, project_id, assignee_id, status, priority, due_date, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const tasks = [
  ['Design new homepage layout', 'Create wireframes and mockups', proj1.id, alice.id, 'in_progress', 'high', future(3), admin.id],
  ['Set up CI/CD pipeline', 'Configure GitHub Actions', proj1.id, bob.id, 'todo', 'medium', future(7), admin.id],
  ['Write unit tests', 'Achieve 80% coverage', proj1.id, alice.id, 'todo', 'medium', future(10), admin.id],
  ['Fix login bug', 'Users are getting 401 on refresh', proj1.id, bob.id, 'done', 'high', past(2), admin.id],
  ['Update dependencies', 'Bump all packages to latest', proj1.id, null, 'todo', 'low', future(14), admin.id],
  ['Design onboarding flow', 'New user experience screens', proj2.id, alice.id, 'in_progress', 'high', past(1), admin.id],
  ['Implement push notifications', 'FCM integration', proj2.id, alice.id, 'todo', 'medium', future(5), admin.id],
  ['Performance audit', 'Profile and optimize startup time', proj2.id, null, 'todo', 'low', future(20), admin.id],
];

tasks.forEach(t => insertTask.run(...t));

console.log('✅ Seed complete!');
console.log('');
console.log('Demo accounts:');
console.log('  Admin:  admin@demo.com  / password123');
console.log('  Member: member@demo.com / password123');
console.log('  Member: bob@demo.com    / password123');
