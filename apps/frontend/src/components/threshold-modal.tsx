'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Cpu, Server, HardDrive, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ThresholdFormData) => Promise<void>;
  initialData?: ThresholdFormData & { id?: string };
}

export interface ThresholdFormData {
  metricName: 'cpu' | 'ram' | 'disk';
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  value: number;
  channels: ('email' | 'telegram')[];
  enabled: boolean;
  cooldownMs: number;
}

const metricOptions = [
  { value: 'cpu', label: 'CPU Usage', icon: Cpu, color: 'text-violet-400' },
  { value: 'ram', label: 'RAM Usage', icon: Server, color: 'text-cyan-400' },
  { value: 'disk', label: 'Disk Usage', icon: HardDrive, color: 'text-amber-400' },
];

const operatorOptions = [
  { value: '>', label: 'Greater than (>)' },
  { value: '>=', label: 'Greater or equal (>=)' },
  { value: '<', label: 'Less than (<)' },
  { value: '<=', label: 'Less or equal (<=)' },
  { value: '=', label: 'Equal (=)' },
  { value: '!=', label: 'Not equal (!=)' },
];

const cooldownOptions = [
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
  { value: 1800000, label: '30 minutes' },
  { value: 3600000, label: '1 hour' },
];

const defaultFormData: ThresholdFormData = {
  metricName: 'cpu',
  operator: '>',
  value: 80,
  channels: ['email'],
  enabled: true,
  cooldownMs: 300000,
};

export function ThresholdModal({ isOpen, onClose, onSave, initialData }: ThresholdModalProps) {
  const [formData, setFormData] = useState<ThresholdFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      setFormData({
        metricName: initialData.metricName,
        operator: initialData.operator,
        value: initialData.value,
        channels: initialData.channels,
        enabled: initialData.enabled,
        cooldownMs: initialData.cooldownMs,
      });
    } else {
      setFormData(defaultFormData);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save threshold');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: 'email' | 'telegram') => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Alert Rule' : 'Create Alert Rule'}</h2>
              <p className="text-sm text-white/40">Configure when to trigger an alert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-3">Metric</label>
            <div className="grid grid-cols-3 gap-3">
              {metricOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.metricName === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, metricName: option.value as ThresholdFormData['metricName'] }))}
                    className={cn(
                      'p-4 rounded-xl border transition-all flex flex-col items-center gap-2',
                      isSelected
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <Icon className={cn('w-6 h-6', option.color)} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Condition</label>
              <select
                value={formData.operator}
                onChange={(e) => setFormData((prev) => ({ ...prev, operator: e.target.value as ThresholdFormData['operator'] }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
              >
                {operatorOptions.map((op) => (
                  <option key={op.value} value={op.value} className="bg-[#1a1a2e]">
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Value (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, value: val === '' ? 0 : parseFloat(val) }));
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-3">Notify via</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={cn(
                  'flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2',
                  formData.channels.includes('email')
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                )}
              >
                <Mail className="w-5 h-5" />
                <span className="font-medium">Email</span>
              </button>
              <button
                type="button"
                onClick={() => toggleChannel('telegram')}
                className={cn(
                  'flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2',
                  formData.channels.includes('telegram')
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                )}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span className="font-medium">Telegram</span>
              </button>
            </div>
            {formData.channels.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">Select at least one notification channel</p>
            )}
          </div>

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Cooldown Period</label>
            <select
              value={formData.cooldownMs}
              onChange={(e) => setFormData((prev) => ({ ...prev, cooldownMs: Number(e.target.value) }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
            >
              {cooldownOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-2">Minimum time between repeated alerts for this rule</p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <span className="font-medium">Enable Rule</span>
              <p className="text-sm text-white/40">Start monitoring immediately after saving</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={cn('relative w-12 h-7 rounded-full p-1', formData.enabled && 'toggle-active')}
            >
              <span className="toggle-track absolute inset-0 rounded-full bg-white/10" />
              <span
                className={cn(
                  'toggle-thumb relative block w-5 h-5 rounded-full shadow-lg',
                  formData.enabled ? 'bg-white' : 'bg-white/50'
                )}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formData.channels.length === 0}
              className="flex-1 btn-gradient px-5 py-3 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
