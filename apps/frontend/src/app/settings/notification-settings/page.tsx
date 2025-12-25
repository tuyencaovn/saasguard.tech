'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Mail,
  MessageSquare,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface EmailSettings {
  id?: string;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

interface TelegramSettings {
  id?: string;
  enabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
}

type TabType = 'email' | 'telegram';

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = user?.role === 'admin';

  // Read tab from URL query param, default to 'email'
  const initialTab = (searchParams.get('tab') as TabType) || 'email';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFromName: 'BimNext Monitor',
    smtpFromEmail: '',
  });

  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    enabled: false,
    telegramBotToken: '',
    telegramChatId: '',
  });

  const [testEmail, setTestEmail] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/settings');
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notification-settings`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          setEmailSettings({
            id: data.email.id,
            enabled: data.email.enabled,
            smtpHost: data.email.smtpHost || '',
            smtpPort: data.email.smtpPort || 587,
            smtpUser: data.email.smtpUser || '',
            smtpPass: '', // Don't show masked password
            smtpFromName: data.email.smtpFromName || 'BimNext Monitor',
            smtpFromEmail: data.email.smtpFromEmail || '',
          });
        }
        if (data.telegram) {
          setTelegramSettings({
            id: data.telegram.id,
            enabled: data.telegram.enabled,
            telegramBotToken: '', // Don't show masked token
            telegramChatId: data.telegram.telegramChatId || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Only send non-empty password (empty means keep existing)
      const payload: Partial<EmailSettings> = {
        enabled: emailSettings.enabled,
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpUser: emailSettings.smtpUser,
        smtpFromName: emailSettings.smtpFromName,
        smtpFromEmail: emailSettings.smtpFromEmail,
      };
      if (emailSettings.smtpPass) {
        payload.smtpPass = emailSettings.smtpPass;
      }

      const res = await fetch(`${API_URL}/notification-settings/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Email settings saved!' });
        setEmailSettings(prev => ({ ...prev, smtpPass: '' })); // Clear password field
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const saveTelegramSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Partial<TelegramSettings> = {
        enabled: telegramSettings.enabled,
        telegramChatId: telegramSettings.telegramChatId,
      };
      if (telegramSettings.telegramBotToken) {
        payload.telegramBotToken = telegramSettings.telegramBotToken;
      }

      const res = await fetch(`${API_URL}/notification-settings/telegram`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Telegram settings saved!' });
        setTelegramSettings(prev => ({ ...prev, telegramBotToken: '' }));
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfig = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Enter an email address to test' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/notification-settings/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  const testTelegramConfig = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/notification-settings/telegram/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test message' });
    } finally {
      setTesting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Notification Settings</h1>
              <p className="text-sm text-white/40">Configure email and Telegram notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto">
        {/* Message */}
        {message && (
          <div className={cn(
            'mb-6 p-4 rounded-xl border flex items-center gap-3',
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          )}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              'px-5 py-2.5 rounded-xl font-medium border border-transparent transition-all flex items-center gap-2',
              activeTab === 'email'
                ? 'tab-active'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            <Mail className="w-4 h-4" />
            Email (SMTP)
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={cn(
              'px-5 py-2.5 rounded-xl font-medium border border-transparent transition-all flex items-center gap-2',
              activeTab === 'telegram'
                ? 'tab-active'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Telegram
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/40">Loading settings...</div>
        ) : (
          <>
            {/* Email Settings */}
            {activeTab === 'email' && (
              <div className="glass-card rounded-2xl p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold">Enable Email Notifications</h3>
                    <p className="text-sm text-white/40">Send alerts via SMTP email</p>
                  </div>
                  <button
                    onClick={() => setEmailSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      'relative w-12 h-7 rounded-full p-1 transition-all',
                      emailSettings.enabled && 'toggle-active'
                    )}
                  >
                    <span className="toggle-track absolute inset-0 rounded-full bg-white/10" />
                    <span
                      className={cn(
                        'toggle-thumb relative block w-5 h-5 rounded-full shadow-lg transition-transform',
                        emailSettings.enabled ? 'bg-white' : 'bg-white/50'
                      )}
                    />
                  </button>
                </div>

                {/* SMTP Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/50 mb-2">SMTP Host</label>
                    <input
                      type="text"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">SMTP Port</label>
                    <input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                      placeholder="587"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">SMTP Username</label>
                    <input
                      type="text"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                      placeholder="your-email@gmail.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">SMTP Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={emailSettings.smtpPass}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPass: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-white/30 mt-1">Leave empty to keep existing password</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">From Name</label>
                    <input
                      type="text"
                      value={emailSettings.smtpFromName}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpFromName: e.target.value }))}
                      placeholder="BimNext Monitor"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">From Email</label>
                    <input
                      type="email"
                      value={emailSettings.smtpFromEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpFromEmail: e.target.value }))}
                      placeholder="alerts@example.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                {/* Test Email */}
                <div className="pt-4 border-t border-white/10">
                  <label className="block text-sm text-white/50 mb-2">Test Email</label>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter email to receive test"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                    <button
                      onClick={testEmailConfig}
                      disabled={testing}
                      className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center gap-2"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Test
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveEmailSettings}
                    disabled={saving}
                    className="btn-gradient px-6 py-3 text-white font-medium rounded-xl flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Email Settings
                  </button>
                </div>
              </div>
            )}

            {/* Telegram Settings */}
            {activeTab === 'telegram' && (
              <div className="glass-card rounded-2xl p-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold">Enable Telegram Notifications</h3>
                    <p className="text-sm text-white/40">Send alerts via Telegram bot</p>
                  </div>
                  <button
                    onClick={() => setTelegramSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      'relative w-12 h-7 rounded-full p-1 transition-all',
                      telegramSettings.enabled && 'toggle-active'
                    )}
                  >
                    <span className="toggle-track absolute inset-0 rounded-full bg-white/10" />
                    <span
                      className={cn(
                        'toggle-thumb relative block w-5 h-5 rounded-full shadow-lg transition-transform',
                        telegramSettings.enabled ? 'bg-white' : 'bg-white/50'
                      )}
                    />
                  </button>
                </div>

                {/* Telegram Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Bot Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={telegramSettings.telegramBotToken}
                        onChange={(e) => setTelegramSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                        placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                        className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-white/30 mt-1">Get token from @BotFather on Telegram</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/50 mb-2">Chat ID</label>
                    <input
                      type="text"
                      value={telegramSettings.telegramChatId}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      placeholder="-1001234567890"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                    <p className="text-xs text-white/30 mt-1">Group/Channel ID or your personal chat ID</p>
                  </div>
                </div>

                {/* Test Button */}
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={testTelegramConfig}
                    disabled={testing}
                    className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center gap-2"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test Message
                  </button>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveTelegramSettings}
                    disabled={saving}
                    className="btn-gradient px-6 py-3 text-white font-medium rounded-xl flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Telegram Settings
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
