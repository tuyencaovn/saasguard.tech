'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-zinc-500">Configure your monitoring preferences</p>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-zinc-500">
              Settings page coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
