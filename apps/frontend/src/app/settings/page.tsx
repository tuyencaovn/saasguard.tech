'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';

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
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      // Copy invite link to clipboard
      await navigator.clipboard.writeText(data.inviteUrl);
      setCopiedLink(data.inviteUrl);
      setTimeout(() => setCopiedLink(null), 3000);

      setInviteEmail('');
      fetchData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
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

  // Non-admin view
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-zinc-500">Configure your preferences</p>
        </header>
        <div className="p-8">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-zinc-500">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Admin access required to manage users</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-500">Manage users and invitations</p>
      </header>

      <div className="p-8 space-y-6">
        {/* Invite User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-500" />
              Invite New Viewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                disabled={isInviting}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                {inviteError}
              </div>
            )}
            {copiedLink && (
              <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
                <Check className="h-4 w-4" />
                Invite link copied to clipboard!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No users found</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          user.role === 'admin'
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                            : 'bg-gradient-to-br from-slate-600 to-slate-700'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-zinc-500 capitalize">
                          {user.role} • Joined{' '}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : invitations.filter((inv) => !inv.isUsed).length === 0 ? (
              <p className="text-center text-zinc-500 py-8">
                No pending invitations
              </p>
            ) : (
              <div className="space-y-2">
                {invitations
                  .filter((inv) => !inv.isUsed)
                  .map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-xs text-zinc-500">
                          {invitation.isExpired ? (
                            <span className="text-red-400">Expired</span>
                          ) : (
                            <>
                              Expires{' '}
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const url = `${window.location.origin}/set-password?token=${invitation.id}`;
                            await navigator.clipboard.writeText(url);
                            setCopiedLink(invitation.id);
                            setTimeout(() => setCopiedLink(null), 2000);
                          }}
                          className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="Copy invite link"
                        >
                          {copiedLink === invitation.id ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete invitation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
