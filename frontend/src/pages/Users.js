import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';

const Users = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/users').then(res => {
      setUsers(res.data);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) return (
    <div className="empty-state">
      <div className="icon">🔒</div>
      <h3>Access Denied</h3>
      <p>Only admins can view the users list.</p>
    </div>
  );

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const admins = users.filter(u => u.role === 'admin');
  const members = users.filter(u => u.role === 'member');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ '--accent-color': 'var(--accent)' }}>
          <div className="stat-value">{admins.length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': 'var(--text3)' }}>
          <div className="stat-value">{members.length}</div>
          <div className="stat-label">Members</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <span className="primary">{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ fontSize: 13 }}>{u.created_at ? format(parseISO(u.created_at), 'MMM d, yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
