'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Shield,
  Eye,
  Clock,
  X,
  Copy,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  isActive: boolean;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  isExpired: boolean;
  isUsed: boolean;
  createdAt: string;
  invitedBy: string;
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchInvitations();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, { credentials: 'include' });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${API_URL}/invitations`, { credentials: 'include' });
      if (res.ok) {
        setInvitations(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  const toggleUserActive = async (userId: string) => {
    try {
      await fetch(`${API_URL}/users/${userId}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteResult(null);
    setInviting(true);

    try {
      const res = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send invite');
      }

      const data = await res.json();
      setInviteResult({ url: data.inviteUrl, email: inviteEmail });
      setInviteEmail('');
      fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const deleteInvitation = async (id: string) => {
    try {
      await fetch(`${API_URL}/invitations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchInvitations();
    } catch (err) {
      console.error('Failed to delete invitation:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const pendingInvitations = invitations.filter((inv) => !inv.isUsed && !inv.isExpired);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-white/40">
              {isAdmin ? 'Manage users and system settings' : 'View system settings'}
            </p>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* Admin Only Sections */}
        {isAdmin && (
          <>
            {/* Invite User */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-6 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Invite User</h2>
                  <p className="text-sm text-white/40">Send invitation email to new users</p>
                </div>
              </div>

              <form onSubmit={sendInvite} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {inviteResult && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 text-sm mb-2">
                      Invitation sent to {inviteResult.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.url}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-white/70"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteResult.url)}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-medium text-white/70 mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
                    >
                      <option value="viewer" className="bg-[#1a1a2e]">Viewer</option>
                      <option value="admin" className="bg-[#1a1a2e]">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail}
                      className="btn-gradient px-6 py-3 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {inviting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Mail className="w-5 h-5" />
                      )}
                      Send Invite
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Pending Invitations</h2>
                      <p className="text-sm text-white/40">{pendingInvitations.length} pending</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {pendingInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">{inv.email}</p>
                          <p className="text-sm text-white/40">
                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteInvitation(inv.id)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Management */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">User Management</h2>
                    <p className="text-sm text-white/40">{users.length} users</p>
                  </div>
                </div>
                <button
                  onClick={fetchUsers}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-white/40">Loading users...</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            user.role === 'admin'
                              ? 'bg-violet-500/10'
                              : 'bg-cyan-500/10'
                          )}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-violet-400" />
                          ) : (
                            <Eye className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {user.email}
                            {user.id === currentUser?.id && (
                              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/50">You</span>
                            )}
                          </p>
                          <p className="text-sm text-white/40">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} • Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {user.id !== currentUser?.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserActive(user.id)}
                            className={cn(
                              'px-3 py-1.5 text-sm rounded-lg transition-all',
                              user.isActive
                                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                            )}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* System Info - Visible to all */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">System Information</h2>
              <p className="text-sm text-white/40">Application details</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Version</span>
              <span className="font-mono">2.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">API Endpoint</span>
              <span className="font-mono text-sm">{API_URL}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Your Role</span>
              <span className={cn(
                'px-2.5 py-1 rounded-lg text-sm font-medium',
                currentUser?.role === 'admin'
                  ? 'bg-violet-500/10 text-violet-400'
                  : 'bg-cyan-500/10 text-cyan-400'
              )}>
                {currentUser?.role === 'admin' ? 'Admin' : 'Viewer'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Metrics Refresh</span>
              <span className="font-mono">3 seconds</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Data Retention</span>
              <span className="font-mono">7 days</span>
            </div>
          </div>
        </div>

        {/* Non-admin message */}
        {!isAdmin && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">
              User management is only available for administrators.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
