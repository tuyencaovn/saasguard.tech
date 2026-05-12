'use client';

import { useEffect, useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface CrashStatus {
  id: string;
  name: string;
  type: 'docker' | 'pm2';
  restartCount: number;
  inCrashLoop: boolean;
}

export function useCrashStatus(pollInterval = 10000) {
  const [statuses, setStatuses] = useState<CrashStatus[]>([]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/alerts/crash-status`, {
        credentials: 'include',
      });
      if (res.ok) {
        setStatuses(await res.json());
      }
    } catch {
      // Silently fail — crash status is non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  // Helper to get crash status for a specific container/process
  const getCrashStatus = useCallback(
    (id: string, type: 'docker' | 'pm2') => {
      const prefix = `${type}:`;
      return statuses.find((s) => s.id === `${prefix}${id}`) || null;
    },
    [statuses],
  );

  return { statuses, getCrashStatus, refetch: fetchStatus };
}
