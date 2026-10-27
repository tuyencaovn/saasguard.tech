'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Shield,
  Eye,
  Key,
  Loader2,
  CheckCircle2,
  XCircle,
  EyeOff,
  Fingerprint,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listPasskeys,
  registerPasskey,
  deletePasskey,
  browserSupportsWebAuthn,
  type PasskeySummary,
} from '@/lib/webauthn';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AccountPage() {
  const { user: currentUser, refreshUser } = useAuth();

  // Full name editing
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Passkey state
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeySaving, setPasskeySaving] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const webAuthnSupported = typeof window !== 'undefined' && browserSupportsWebAuthn();

  useEffect(() => {
    fetchPasskeys();
  }, []);

  useEffect(() => {
    setNameInput(currentUser?.fullName ?? '');
  }, [currentUser?.fullName]);

  const handleSaveName = async () => {
    setNameSaving(true);
    setNameSaved(false);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName: nameInput.trim() }),
      });
      if (res.ok) {
        await refreshUser();
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setNameSaving(false);
    }
  };

  const fetchPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      setPasskeys(await listPasskeys());
    } catch {
      setPasskeys([]);
    } finally {
      setPasskeysLoading(false);
    }
  };

  const handleAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError('');
    if (!passkeyName.trim()) {
      setPasskeyError('Give your passkey a name');
      return;
    }
    setPasskeySaving(true);
    try {
      await registerPasskey(passkeyName.trim());
      setShowPasskeyModal(false);
      setPasskeyName('');
      await fetchPasskeys();
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPasskeyError('Passkey prompt was cancelled.');
      } else {
        setPasskeyError(err instanceof Error ? err.message : 'Failed to add passkey');
      }
    } finally {
      setPasskeySaving(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      await fetchPasskeys();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to change password');
      }
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-4 pl-14 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Account &amp; Security</h1>
            <p className="text-sm text-white/40">Manage your profile, password and passkeys</p>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border',
                currentUser?.role === 'admin'
                  ? 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/20'
                  : 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/20'
              )}>
                {currentUser?.role === 'admin' ? (
                  <Shield className="w-5 h-5 text-violet-400" />
                ) : (
                  <Eye className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <h2 className="text-lg font-semibold">Account &amp; Security</h2>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
              title="Change Password"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Change password</span>
            </button>
          </div>

          {/* Account fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Full name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving || nameInput.trim() === (currentUser?.fullName ?? '')}
                  className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : nameSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
                  {nameSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-white/50 text-sm">Email</span>
              <span className="text-sm font-medium truncate ml-2 max-w-[260px]">
                {currentUser?.email || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Role</span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                currentUser?.role === 'admin'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              )}>
                {currentUser?.role === 'admin' ? 'Admin' : 'Viewer'}
              </span>
            </div>
          </div>

          {/* Passkeys */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold">Passkeys</h3>
              </div>
              {webAuthnSupported && (
                <button
                  onClick={() => { setPasskeyError(''); setPasskeyName(''); setShowPasskeyModal(true); }}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Add Passkey"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            {!webAuthnSupported ? (
              <p className="text-sm text-white/40">This browser does not support passkeys.</p>
            ) : passkeysLoading ? (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : passkeys.length === 0 ? (
              <p className="text-sm text-white/40">
                No passkeys yet. Add one to sign in without a password.
              </p>
            ) : (
              <div className="space-y-2">
                {passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-white/5 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pk.name}</p>
                      <p className="text-xs text-white/40">
                        {pk.lastUsedAt
                          ? `Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`
                          : `Added ${new Date(pk.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                      title="Remove passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !passwordSaving && setShowPasswordModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <button
                onClick={() => !passwordSaving && setShowPasswordModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Password changed successfully!
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-white/50 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordSaving}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                  >
                    {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Passkey Modal */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !passkeySaving && setShowPasskeyModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Add Passkey</h2>
              </div>
              <button
                onClick={() => !passkeySaving && setShowPasskeyModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPasskey} className="space-y-4">
              {passkeyError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {passkeyError}
                </div>
              )}

              <div>
                <label className="block text-sm text-white/50 mb-2">Passkey Name</label>
                <input
                  type="text"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  required
                  maxLength={50}
                  autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  placeholder="e.g. MacBook Touch ID"
                />
                <p className="mt-2 text-xs text-white/40">
                  Your browser will prompt you to create a passkey on this device.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasskeyModal(false)}
                  disabled={passkeySaving}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passkeySaving}
                  className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                >
                  {passkeySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  Create Passkey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
