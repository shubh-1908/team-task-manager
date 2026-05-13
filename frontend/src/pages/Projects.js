import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const ProjectModal = ({ project, users, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    memberIds: project?.members?.map(m => m.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter(m => m !== id)
        : [...f.memberIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (project) {
        await api.put(`/projects/${project.id}`, form);
      } else {
        await api.post('/projects', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name</label>
            <input className="form-control" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Website Redesign" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this project about?" />
          </div>
          <div className="form-group">
            <label>Team Members</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', borderRadius: 6, background: form.memberIds.includes(u.id) ? 'rgba(108,99,255,0.1)' : 'var(--bg3)' }}>
                  <input type="checkbox" checked={form.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <span style={{ fontSize: 14 }}>{u.name}</span>
                  <span className={`badge badge-${u.role}`} style={{ marginLeft: 'auto' }}>{u.role}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : project ? 'Update' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Projects = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project object

  const fetchAll = async () => {
    const [p, u] = await Promise.all([api.get('/projects'), api.get('/users')]);
    setProjects(p.data);
    setUsers(u.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    fetchAll();
  };

  const handleSave = () => { setModal(null); fetchAll(); };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Project</button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📁</div>
          <h3>No projects yet</h3>
          <p>{isAdmin ? 'Create your first project to get started.' : 'You have not been added to any projects yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
                {p.description && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{p.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.task_count}</span> tasks
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.member_count}</span> members
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>by {p.owner_name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => navigate(`/projects/${p.id}`)}>
                  View →
                </button>
                {isAdmin && <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(p)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Projects;
