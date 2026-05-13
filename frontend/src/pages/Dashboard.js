import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>
);

const PriorityBadge = ({ priority }) => (
  <span className={`badge badge-${priority}`}>{priority}</span>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><p>Failed to load dashboard.</p></div>;

  const { stats, myTasks, recentTasks } = data;

  const statCards = [
    { label: 'Total Tasks', value: stats.total, color: 'var(--accent)' },
    { label: 'To Do', value: stats.todo, color: 'var(--text3)' },
    { label: 'In Progress', value: stats.in_progress, color: 'var(--accent)' },
    { label: 'Done', value: stats.done, color: 'var(--accent3)' },
    { label: 'Overdue', value: stats.overdue, color: 'var(--accent2)' },
    { label: 'Projects', value: stats.projects, color: '#ffd54f' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">👋 Hey, {user.name.split(' ')[0]}</h2>
          <p className="page-subtitle">Here's what's happening today</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(s => (
          <div className="stat-card" key={s.label} style={{ '--accent-color': s.color }}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* My Tasks */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>My Tasks</h3>
            <Link to="/tasks" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="icon">✅</div>
              <p>No tasks assigned to you</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTasks.map(task => (
                <div key={task.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg3)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {task.project_name}
                      {task.due_date && (
                        <span className={isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'overdue' : ''}>
                          {' · '}Due {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Tasks</h3>
            <Link to="/tasks" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="icon">📋</div>
              <p>No tasks yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTasks.map(task => (
                <div key={task.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg3)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {task.project_name} {task.assignee_name ? `· ${task.assignee_name}` : '· Unassigned'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
