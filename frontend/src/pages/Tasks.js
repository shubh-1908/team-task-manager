import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

const Tasks = () => {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    const res = await api.get(`/tasks?${params}`);
    setTasks(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [filters]);

  const handleStatusChange = async (taskId, status) => {
    await api.put(`/tasks/${taskId}`, { status });
    fetchTasks();
  };

  const filtered = filters.priority
    ? tasks.filter(t => t.priority === filters.priority)
    : tasks;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="page-subtitle">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 'auto' }} value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={filters.priority}
          onChange={e => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(filters.status || filters.priority) && (
          <button className="btn btn-ghost" onClick={() => setFilters({ status: '', priority: '' })}>Clear filters</button>
        )}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✅</div>
            <h3>No tasks found</h3>
            <p>Try adjusting your filters or ask an admin to create tasks.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                  const canUpdateStatus = isAdmin || task.assignee_id === user.id;
                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="primary">{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                            {task.description.slice(0, 50)}{task.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>
                          {task.project_name}
                        </Link>
                      </td>
                      <td style={{ color: task.assignee_name ? 'var(--text2)' : 'var(--text3)' }}>
                        {task.assignee_name || 'Unassigned'}
                      </td>
                      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                      <td>
                        {canUpdateStatus ? (
                          <select
                            className="form-control"
                            style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
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
                      <td className={isOverdue ? 'overdue' : ''} style={{ fontSize: 13 }}>
                        {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                        {isOverdue && ' ⚠️'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
