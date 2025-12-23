'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Settings, Bell, Monitor } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-500">Configure your monitoring preferences</p>
      </header>

      <div className="p-8 space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-xs text-zinc-500">Receive alerts via email</div>
                </div>
                <div className="text-zinc-500 text-sm">Coming soon</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="font-medium">Telegram Notifications</div>
                  <div className="text-xs text-zinc-500">Receive alerts via Telegram</div>
                </div>
                <div className="text-zinc-500 text-sm">Coming soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-cyan-500" />
              Monitoring Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="font-medium">Refresh Interval</div>
                  <div className="text-xs text-zinc-500">How often to update metrics</div>
                </div>
                <div className="text-zinc-400 text-sm">3 seconds</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="font-medium">Data Retention</div>
                  <div className="text-xs text-zinc-500">How long to keep metrics history</div>
                </div>
                <div className="text-zinc-400 text-sm">24 hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-500" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2">
                <span className="text-zinc-500">Version</span>
                <span className="text-zinc-300">1.0.0</span>
              </div>
              <div className="flex justify-between p-2">
                <span className="text-zinc-500">API Endpoint</span>
                <span className="text-zinc-300 font-mono text-xs">localhost:3005</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
