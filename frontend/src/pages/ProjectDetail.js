import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

const TaskModal = ({ task, projectId, users, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    project_id: projectId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null };
      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input className="form-control" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Task title" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Assignee</label>
              <select className="form-control" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" className="form-control" value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    const [p, t] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks?project_id=${id}`)
    ]);
    setProject(p.data);
    setTasks(t.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    fetchData();
  };

  const handleStatusChange = async (taskId, status) => {
    await api.put(`/tasks/${taskId}`, { status });
    fetchData();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!project) return <div className="empty-state"><p>Project not found.</p></div>;

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const members = project.members || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/projects')} className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}>← Back</button>
          <h2 className="page-title">{project.name}</h2>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal('create')}>+ Add Task</button>
        )}
      </div>

      {/* Members */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
          Team Members ({members.length})
        </h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg3)', borderRadius: 100 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                {m.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13 }}>{m.name}</span>
              <span className={`badge badge-${m.role}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Task filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'todo', 'in_progress', 'done'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 4, opacity: 0.7 }}>
              {f === 'all' ? tasks.length : tasks.filter(t => t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks table */}
      <div className="card">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No tasks</h3>
            <p>{isAdmin ? 'Create the first task for this project.' : 'No tasks match this filter.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                  const canEdit = isAdmin || task.assignee_id === user.id;
                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="primary">{task.title}</div>
                        {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                      </td>
                      <td>{task.assignee_name || <span style={{ color: 'var(--text3)' }}>Unassigned</span>}</td>
                      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                      <td>
                        {canEdit ? (
                          <select
                            className="form-control" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                            value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        ) : (
                          <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                        )}
                      </td>
                      <td className={isOverdue ? 'overdue' : ''}>
                        {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                        {isOverdue && ' ⚠️'}
                      </td>
                      <td>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(task)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>Del</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          projectId={parseInt(id)}
          users={members}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
