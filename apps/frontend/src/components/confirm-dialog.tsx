'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    icon: 'bg-red-500/10 text-red-400',
    button: 'bg-red-500 hover:bg-red-600 text-white',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-400',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  default: {
    icon: 'bg-blue-500/10 text-blue-400',
    button: 'bg-violet-500 hover:bg-violet-600 text-white',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-[#0f0f10] border border-white/10 rounded-2xl shadow-2xl">
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', styles.icon)}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-1">{title}</h3>
              <p className="text-sm text-white/60">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2',
              styles.button
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
