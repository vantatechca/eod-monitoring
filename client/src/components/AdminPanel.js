import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit, Trash2, Shield, Eye, Calendar, X, AlertCircle } from 'lucide-react';

const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const AdminPanel = ({ employees }) => {
  const [users, setUsers] = useState([]);
  const [viewerAccesses, setViewerAccesses] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'employee',
    employee_id: ''
  });

  const [viewerForm, setViewerForm] = useState({
    username: '',
    password: '',
    notes: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchViewerAccesses();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        withCredentials: true
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchViewerAccesses = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/viewer-access`, {
        withCredentials: true
      });
      setViewerAccesses(response.data);
    } catch (err) {
      console.error('Error fetching viewer accesses:', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/admin/users`, userForm, {
        withCredentials: true
      });
      setSuccess('User created successfully!');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', role: 'employee', employee_id: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.put(`${API_URL}/admin/users/${editingUser.id}`, {
        is_active: userForm.is_active,
        role: userForm.role,
        employee_id: userForm.employee_id || null
      }, {
        withCredentials: true
      });
      setSuccess('User updated successfully!');
      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        withCredentials: true
      });
      setSuccess('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleCreateViewerAccess = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/admin/viewer-access`, viewerForm, {
        withCredentials: true
      });
      setSuccess('Viewer access created successfully! Valid for 3 days.');
      setShowViewerModal(false);
      setViewerForm({ username: '', password: '', notes: '' });
      fetchUsers();
      fetchViewerAccesses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create viewer access');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeViewerAccess = async (accessId) => {
    if (!window.confirm('Are you sure you want to revoke this viewer access?')) {
      return;
    }

    try {
      await axios.put(`${API_URL}/admin/viewer-access/${accessId}/revoke`, {}, {
        withCredentials: true
      });
      setSuccess('Viewer access revoked successfully!');
      fetchViewerAccesses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke viewer access');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      role: user.role,
      employee_id: user.employee_id || '',
      is_active: user.is_active
    });
    setShowUserModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', role: 'employee', employee_id: '' });
    setShowUserModal(true);
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#c00'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#c00',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          background: '#efe',
          border: '1px solid #cfc',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#060'
        }}>
          <span>✓ {success}</span>
          <button
            onClick={() => setSuccess('')}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#060',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* User Management Section */}
      <div className="section-header">
        <h2 className="section-title">User Management ({users.length})</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowViewerModal(true)}>
            <Eye size={18} />
            Create Viewer Access
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Username</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Employee</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#9fa8da' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem' }}>{user.username}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' :
                                 user.role === 'employee' ? 'rgba(59, 130, 246, 0.2)' :
                                 'rgba(156, 163, 175, 0.2)',
                      color: user.role === 'admin' ? '#ef4444' :
                             user.role === 'employee' ? '#3b82f6' :
                             '#9ca3af',
                      textTransform: 'capitalize'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {user.employee_name || '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      background: user.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: user.is_active ? '#22c55e' : '#ef4444'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#9fa8da' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                        style={{ color: '#67e8f9' }}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete user"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Viewer Access Section */}
      <div className="section-header" style={{ marginTop: '3rem' }}>
        <h2 className="section-title">Viewer Access Log ({viewerAccesses.length})</h2>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Username</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Expires</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#9fa8da' }}>Notes</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#9fa8da' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {viewerAccesses.map(access => {
                const expired = isExpired(access.expires_at);
                const revoked = !!access.revoked_at;
                const status = revoked ? 'Revoked' : expired ? 'Expired' : 'Active';
                const statusColor = revoked ? '#ef4444' : expired ? '#f59e0b' : '#22c55e';

                return (
                  <tr key={access.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem' }}>{access.username}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#9fa8da' }}>
                      {new Date(access.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#9fa8da' }}>
                      {new Date(access.expires_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        background: `${statusColor}33`,
                        color: statusColor
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#9fa8da' }}>
                      {access.notes || '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {!revoked && !expired && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleRevokeViewerAccess(access.id)}
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  required
                  disabled={editingUser}
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {userForm.role === 'employee' && (
                <div className="form-group">
                  <label>Link to Employee (Optional)</label>
                  <select
                    value={userForm.employee_id}
                    onChange={(e) => setUserForm({ ...userForm, employee_id: e.target.value })}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingUser && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                    />
                    Account Active
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewer Access Modal */}
      {showViewerModal && (
        <div className="modal-overlay" onClick={() => setShowViewerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Viewer Access</h3>
              <button className="modal-close" onClick={() => setShowViewerModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateViewerAccess}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                color: '#3b82f6'
              }}>
                ℹ️ Viewer access will automatically expire after 3 days
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={viewerForm.username}
                  onChange={(e) => setViewerForm({ ...viewerForm, username: e.target.value })}
                  required
                  placeholder="viewer123"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={viewerForm.password}
                  onChange={(e) => setViewerForm({ ...viewerForm, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={viewerForm.notes}
                  onChange={(e) => setViewerForm({ ...viewerForm, notes: e.target.value })}
                  placeholder="e.g., Client name or purpose"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowViewerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Viewer Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
