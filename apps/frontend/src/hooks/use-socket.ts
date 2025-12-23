'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SystemMetrics, DockerEvent, ContainerInfo } from '@/types/metrics';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit('subscribe:metrics');
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onMetricsUpdate = (data: SystemMetrics) => {
      setMetrics(data);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('metrics:update', onMetricsUpdate);

    // If already connected, emit subscribe
    if (socket.connected) {
      setConnected(true);
      socket.emit('subscribe:metrics');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('metrics:update', onMetricsUpdate);
    };
  }, []);

  return { metrics, connected };
}

export function useDockerEvents() {
  const [events, setEvents] = useState<DockerEvent[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/docker/containers`, {
        credentials: 'include',
      });
      const data = await res.json();
      setContainers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch containers:', error);
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      socket.emit('subscribe:docker');
    };

    const onDockerEvent = (event: DockerEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
      // Refetch containers when event occurs
      fetchContainers();
    };

    socket.on('connect', onConnect);
    socket.on('docker:event', onDockerEvent);

    // Initial fetch
    fetchContainers();

    // If already connected, emit subscribe
    if (socket.connected) {
      socket.emit('subscribe:docker');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('docker:event', onDockerEvent);
    };
  }, [fetchContainers]);

  return { events, containers, loading, refetch: fetchContainers };
}

export function useConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return connected;
}
