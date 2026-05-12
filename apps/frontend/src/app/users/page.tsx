'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Users,
  Mail,
  Trash2,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Shield,
  Eye,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
  token: string;
  expiresAt: string;
  usedAt: string | null;
  isExpired: boolean;
  isUsed: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        fetch(`${API_URL}/users`, { credentials: 'include' }),
        fetch(`${API_URL}/invitations`, { credentials: 'include' }),
      ]);

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      if (invitationsRes.ok) {
        setInvitations(await invitationsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [currentUser, fetchData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setIsInviting(true);
    setLastInviteUrl(null);

    try {
      const res = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send invitation');
      }

      const data = await res.json();
      setLastInviteUrl(data.inviteUrl);
      await navigator.clipboard.writeText(data.inviteUrl);
      setCopiedLink('new');
      setTimeout(() => setCopiedLink(null), 3000);

      setInviteEmail('');
      fetchData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      await fetch(`${API_URL}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete invitation:', error);
    }
  };

  const copyInviteLink = async (token: string, invId: string) => {
    const url = `${window.location.origin}/set-password?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(invId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Non-admin view
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-4 pl-14 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-sm text-white/40">Manage users and invitations</p>
            </div>
            <ConnectionStatus />
          </div>
        </header>
        <div className="p-4 md:p-8">
          <div className="glass-card rounded-2xl p-12">
            <div className="text-center text-white/40">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Admin access required to manage users</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((inv) => !inv.isUsed);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-4 pl-14 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-white/40">Manage users and invitations</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
            </button>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6">
        {/* Invite User */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold">Invite New Viewer</h2>
          </div>

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              required
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
            <button
              type="submit"
              disabled={isInviting}
              className="btn-gradient px-6 py-3 text-white font-medium rounded-xl flex items-center gap-2"
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Invite
            </button>
          </form>

          {inviteError && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {inviteError}
            </div>
          )}

          {lastInviteUrl && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-3">
                <Check className="h-4 w-4" />
                Invitation created! Link copied to clipboard.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lastInviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(lastInviteUrl);
                    setCopiedLink('new');
                    setTimeout(() => setCopiedLink(null), 2000);
                  }}
                  className="p-2 text-white/40 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"
                >
                  {copiedLink === 'new' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold">Users ({users.length})</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-white/40 py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all',
                    user.isActive
                      ? 'bg-white/5 border-white/5 hover:border-white/10'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        user.role === 'admin'
                          ? 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20'
                          : user.isActive
                            ? 'bg-white/5 border border-white/10'
                            : 'bg-red-500/10 border border-red-500/20'
                      )}
                    >
                      {user.role === 'admin' ? (
                        <Shield className="h-4 w-4 text-violet-400" />
                      ) : (
                        <Eye className={cn('h-4 w-4', user.isActive ? 'text-white/60' : 'text-red-400')} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.email}
                        {!user.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 capitalize">
                        {user.role} • Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {user.id !== currentUser?.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={cn(
                          'p-2 rounded-lg transition-all',
                          user.isActive
                            ? 'text-white/40 hover:text-amber-400 hover:bg-amber-500/10'
                            : 'text-amber-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title={user.isActive ? 'Lock user' : 'Unlock user'}
                      >
                        {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">Pending Invitations ({pendingInvitations.length})</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-center text-white/40 py-8">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all',
                    invitation.isExpired
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  )}
                >
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-xs text-white/40">
                      {invitation.isExpired ? (
                        <span className="text-red-400">Expired</span>
                      ) : (
                        <>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!invitation.isExpired && (
                      <button
                        onClick={() => copyInviteLink(invitation.token, invitation.id)}
                        className="p-2 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                        title="Copy invite link"
                      >
                        {copiedLink === invitation.id ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id)}
                      className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete invitation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
