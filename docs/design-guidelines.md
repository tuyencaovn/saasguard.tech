# Design Guidelines - BimNext Server Monitor

**Version:** 1.0.0
**Updated:** 2025-12-23
**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, Recharts

---

## 1. Design Philosophy

**Core Principles:**
- **KISS (Keep It Simple)** - Minimal cognitive load, data-first presentation
- **Dark Mode Primary** - Professional monitoring aesthetic, reduced eye strain
- **Real-time Focus** - Clear status visibility at a glance
- **Information Hierarchy** - Critical metrics prominent, secondary details accessible

**Inspiration:** Grafana, Datadog, Portainer - clean data visualization with functional aesthetics.

---

## 2. Color Palette

### 2.1 Base Colors (Dark Mode)

```css
/* Background Layers */
--bg-base: #0a0a0b;        /* Main background - near black */
--bg-surface: #111113;     /* Card/panel background */
--bg-elevated: #18181b;    /* Elevated elements, modals */
--bg-hover: #27272a;       /* Hover states */

/* Border Colors */
--border-default: #27272a; /* Default borders */
--border-subtle: #1f1f23;  /* Subtle separators */
--border-focus: #3b82f6;   /* Focus rings */
```

### 2.2 Text Colors

```css
--text-primary: #fafafa;   /* Primary text - high contrast */
--text-secondary: #a1a1aa; /* Secondary text - zinc-400 */
--text-muted: #71717a;     /* Muted text - zinc-500 */
--text-disabled: #52525b;  /* Disabled text - zinc-600 */
```

### 2.3 Semantic Colors

```css
/* Success / Running */
--status-success: #22c55e;        /* green-500 */
--status-success-bg: #22c55e1a;   /* green-500/10 */
--status-success-border: #22c55e33; /* green-500/20 */

/* Warning */
--status-warning: #f59e0b;        /* amber-500 */
--status-warning-bg: #f59e0b1a;   /* amber-500/10 */
--status-warning-border: #f59e0b33; /* amber-500/20 */

/* Error / Critical */
--status-error: #ef4444;          /* red-500 */
--status-error-bg: #ef44441a;     /* red-500/10 */
--status-error-border: #ef444433; /* red-500/20 */

/* Info / Stopped */
--status-info: #3b82f6;           /* blue-500 */
--status-info-bg: #3b82f61a;      /* blue-500/10 */
--status-info-border: #3b82f633;  /* blue-500/20 */

/* Neutral / Inactive */
--status-neutral: #71717a;        /* zinc-500 */
--status-neutral-bg: #71717a1a;   /* zinc-500/10 */
```

### 2.4 Accent Colors

```css
/* Primary Accent - Electric Blue */
--accent-primary: #3b82f6;        /* blue-500 */
--accent-primary-hover: #2563eb;  /* blue-600 */
--accent-primary-active: #1d4ed8; /* blue-700 */

/* Metric Colors - For charts/gauges */
--metric-cpu: #8b5cf6;    /* violet-500 - CPU */
--metric-ram: #06b6d4;    /* cyan-500 - RAM */
--metric-disk: #f59e0b;   /* amber-500 - Disk */
--metric-network: #10b981; /* emerald-500 - Network */
```

### 2.5 Tailwind CSS Classes

```html
<!-- Backgrounds -->
<div class="bg-[#0a0a0b]">Base</div>
<div class="bg-zinc-900">Surface</div>
<div class="bg-zinc-800">Elevated</div>

<!-- Text -->
<span class="text-zinc-50">Primary</span>
<span class="text-zinc-400">Secondary</span>
<span class="text-zinc-500">Muted</span>

<!-- Status Badges -->
<span class="bg-green-500/10 text-green-500 border border-green-500/20">Running</span>
<span class="bg-red-500/10 text-red-500 border border-red-500/20">Error</span>
<span class="bg-amber-500/10 text-amber-500 border border-amber-500/20">Warning</span>
<span class="bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">Stopped</span>
```

---

## 3. Typography

### 3.1 Font Stack

**Primary Font:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- Monospace font optimized for code and technical data
- Excellent number alignment for metrics display
- Vietnamese character support included

**Secondary Font:** [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans)
- Clean sans-serif for body text and UI elements
- Professional tech aesthetic
- Full Vietnamese character support

```html
<!-- Google Fonts Import -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
/* Tailwind Config */
fontFamily: {
  sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

### 3.2 Type Scale

| Element | Size | Weight | Line Height | Font |
|---------|------|--------|-------------|------|
| h1 | 30px / 1.875rem | 700 | 1.2 | IBM Plex Sans |
| h2 | 24px / 1.5rem | 600 | 1.3 | IBM Plex Sans |
| h3 | 20px / 1.25rem | 600 | 1.4 | IBM Plex Sans |
| h4 | 16px / 1rem | 600 | 1.4 | IBM Plex Sans |
| Body | 14px / 0.875rem | 400 | 1.5 | IBM Plex Sans |
| Small | 12px / 0.75rem | 400 | 1.4 | IBM Plex Sans |
| Metric Value | 32px / 2rem | 600 | 1 | JetBrains Mono |
| Metric Label | 12px / 0.75rem | 500 | 1.4 | IBM Plex Sans |
| Code/Data | 13px / 0.8125rem | 400 | 1.5 | JetBrains Mono |

### 3.3 Tailwind Typography Classes

```html
<!-- Headings -->
<h1 class="text-3xl font-bold">Dashboard</h1>
<h2 class="text-2xl font-semibold">Server Metrics</h2>
<h3 class="text-xl font-semibold">CPU Usage</h3>

<!-- Body -->
<p class="text-sm text-zinc-400">Description text</p>
<span class="text-xs text-zinc-500">Timestamp</span>

<!-- Metrics -->
<span class="font-mono text-3xl font-semibold">87.5%</span>
<span class="text-xs font-medium uppercase tracking-wide text-zinc-500">CPU</span>

<!-- Code/Data -->
<code class="font-mono text-sm">nginx:latest</code>
```

---

## 4. Spacing System

### 4.1 Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Inline element gaps |
| space-2 | 8px | Tight component padding |
| space-3 | 12px | Default component padding |
| space-4 | 16px | Card internal padding |
| space-5 | 20px | Section spacing |
| space-6 | 24px | Card padding |
| space-8 | 32px | Large section gaps |
| space-10 | 40px | Page section margins |
| space-12 | 48px | Major layout gaps |

### 4.2 Common Patterns

```html
<!-- Card Padding -->
<div class="p-6">Card content</div>

<!-- Section Gap -->
<div class="space-y-6">Vertical sections</div>

<!-- Grid Gap -->
<div class="grid gap-4">Grid items</div>

<!-- Inline Spacing -->
<div class="flex items-center gap-2">Inline items</div>

<!-- Page Container -->
<div class="px-6 py-8">Page content</div>
```

---

## 5. Component Styles

### 5.1 Cards

```html
<!-- Base Card -->
<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
  <h3 class="text-lg font-semibold text-zinc-50 mb-4">Card Title</h3>
  <div class="text-sm text-zinc-400">Content</div>
</div>

<!-- Metric Card -->
<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">CPU Usage</span>
    <span class="w-2 h-2 rounded-full bg-green-500"></span>
  </div>
  <div class="font-mono text-4xl font-semibold text-zinc-50">87.5%</div>
  <div class="text-xs text-zinc-500 mt-2">8 cores / 16 threads</div>
</div>

<!-- Status Card -->
<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
  <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
    <svg class="w-5 h-5 text-green-500">...</svg>
  </div>
  <div>
    <div class="font-medium text-zinc-50">Container Name</div>
    <div class="text-xs text-zinc-500">nginx:latest</div>
  </div>
</div>
```

### 5.2 Buttons

```html
<!-- Primary Button -->
<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-colors">
  Save Changes
</button>

<!-- Secondary Button -->
<button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium rounded-lg border border-zinc-700 transition-colors">
  Cancel
</button>

<!-- Ghost Button -->
<button class="px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 font-medium rounded-lg transition-colors">
  Learn More
</button>

<!-- Danger Button -->
<button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
  Delete
</button>

<!-- Icon Button -->
<button class="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-50 rounded-lg transition-colors">
  <svg class="w-5 h-5">...</svg>
</button>
```

### 5.3 Inputs

```html
<!-- Text Input -->
<div class="space-y-2">
  <label class="text-sm font-medium text-zinc-300">Email</label>
  <input
    type="email"
    class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    placeholder="you@example.com"
  />
</div>

<!-- Select -->
<select class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

<!-- Input with Icon -->
<div class="relative">
  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500">...</svg>
  <input class="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-50" />
</div>

<!-- Input with Error -->
<input class="w-full px-3 py-2 bg-zinc-900 border border-red-500 rounded-lg text-zinc-50 focus:ring-red-500" />
<p class="text-xs text-red-500 mt-1">Invalid email address</p>
```

### 5.4 Status Indicators

```html
<!-- Status Dot -->
<span class="w-2 h-2 rounded-full bg-green-500"></span>  <!-- Running -->
<span class="w-2 h-2 rounded-full bg-red-500"></span>    <!-- Error -->
<span class="w-2 h-2 rounded-full bg-amber-500"></span>  <!-- Warning -->
<span class="w-2 h-2 rounded-full bg-zinc-500"></span>   <!-- Stopped -->

<!-- Status Badge -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
  <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
  Running
</span>

<!-- Animated Pulse (Live indicator) -->
<span class="relative flex h-2 w-2">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
</span>
```

### 5.5 Gauges

```html
<!-- Circular Gauge (SVG-based) -->
<div class="relative w-32 h-32">
  <svg class="w-full h-full transform -rotate-90">
    <!-- Background circle -->
    <circle
      cx="64" cy="64" r="56"
      stroke-width="8"
      class="stroke-zinc-800 fill-none"
    />
    <!-- Progress circle (stroke-dasharray calculated based on percentage) -->
    <circle
      cx="64" cy="64" r="56"
      stroke-width="8"
      stroke-dasharray="351.86"
      stroke-dashoffset="70.37"  <!-- 80% = 351.86 * 0.2 -->
      stroke-linecap="round"
      class="stroke-violet-500 fill-none transition-all duration-500"
    />
  </svg>
  <div class="absolute inset-0 flex flex-col items-center justify-center">
    <span class="font-mono text-2xl font-semibold text-zinc-50">80%</span>
    <span class="text-xs text-zinc-500">CPU</span>
  </div>
</div>

<!-- Linear Progress Bar -->
<div class="space-y-2">
  <div class="flex justify-between text-sm">
    <span class="text-zinc-400">Disk Usage</span>
    <span class="font-mono text-zinc-50">456 GB / 512 GB</span>
  </div>
  <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
    <div class="h-full bg-amber-500 rounded-full transition-all duration-500" style="width: 89%"></div>
  </div>
</div>
```

### 5.6 Tables

```html
<div class="overflow-hidden rounded-lg border border-zinc-800">
  <table class="w-full">
    <thead class="bg-zinc-900/50">
      <tr>
        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Container</th>
        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">CPU</th>
        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Memory</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-zinc-800">
      <tr class="hover:bg-zinc-800/50 transition-colors">
        <td class="px-4 py-3">
          <div class="font-medium text-zinc-50">nginx</div>
          <div class="text-xs text-zinc-500 font-mono">nginx:latest</div>
        </td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-green-500">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Running
          </span>
        </td>
        <td class="px-4 py-3 font-mono text-sm text-zinc-50">2.3%</td>
        <td class="px-4 py-3 font-mono text-sm text-zinc-50">128 MB</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 5.7 Navigation

```html
<!-- Sidebar Navigation -->
<nav class="w-64 bg-zinc-900 border-r border-zinc-800 h-screen p-4">
  <div class="flex items-center gap-3 px-3 py-2 mb-8">
    <div class="w-8 h-8 bg-blue-600 rounded-lg"></div>
    <span class="font-semibold text-zinc-50">BimNext Monitor</span>
  </div>

  <div class="space-y-1">
    <a href="#" class="flex items-center gap-3 px-3 py-2 text-zinc-50 bg-zinc-800 rounded-lg">
      <svg class="w-5 h-5">...</svg>
      Dashboard
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors">
      <svg class="w-5 h-5">...</svg>
      Containers
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors">
      <svg class="w-5 h-5">...</svg>
      Alerts
    </a>
  </div>
</nav>
```

---

## 6. Status States Reference

| State | Dot Color | Badge Background | Text Color | Use Case |
|-------|-----------|------------------|------------|----------|
| Running | `bg-green-500` | `bg-green-500/10` | `text-green-500` | Container running, healthy |
| Stopped | `bg-zinc-500` | `bg-zinc-500/10` | `text-zinc-500` | Container stopped, inactive |
| Warning | `bg-amber-500` | `bg-amber-500/10` | `text-amber-500` | High usage (70-89%) |
| Error/Critical | `bg-red-500` | `bg-red-500/10` | `text-red-500` | Threshold exceeded (90%+), container error |
| Info | `bg-blue-500` | `bg-blue-500/10` | `text-blue-500` | Informational alerts |

---

## 7. Layout Patterns

### 7.1 Page Structure

```html
<div class="min-h-screen bg-[#0a0a0b]">
  <!-- Sidebar -->
  <aside class="fixed left-0 top-0 w-64 h-screen bg-zinc-900 border-r border-zinc-800">
    <!-- Navigation -->
  </aside>

  <!-- Main Content -->
  <main class="ml-64 p-8">
    <!-- Page Header -->
    <header class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-zinc-50">Dashboard</h1>
        <p class="text-sm text-zinc-500">Real-time server monitoring</p>
      </div>
      <div class="flex items-center gap-4">
        <!-- Actions -->
      </div>
    </header>

    <!-- Content Grid -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Metric Cards -->
      <div class="col-span-3">...</div>
      <div class="col-span-3">...</div>
      <div class="col-span-3">...</div>
      <div class="col-span-3">...</div>

      <!-- Charts -->
      <div class="col-span-8">...</div>
      <div class="col-span-4">...</div>
    </div>
  </main>
</div>
```

### 7.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, collapsed sidebar |
| Tablet | 768px - 1024px | 2 columns, collapsed sidebar |
| Desktop | >= 1024px | Full sidebar, 3-4 columns |
| Large | >= 1280px | Extended dashboard grid |

```html
<!-- Responsive Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Cards -->
</div>

<!-- Responsive Sidebar (Mobile: drawer) -->
<aside class="fixed inset-y-0 left-0 w-64 transform -translate-x-full lg:translate-x-0 transition-transform">
  <!-- Sidebar content -->
</aside>
```

---

## 8. Animation Guidelines

### 8.1 Timing

| Type | Duration | Easing |
|------|----------|--------|
| Micro-interactions | 150ms | ease-out |
| State changes | 200ms | ease-in-out |
| Page transitions | 300ms | ease-in-out |
| Data updates | 500ms | ease-out |

### 8.2 Tailwind Animation Classes

```html
<!-- Hover transitions -->
<button class="transition-colors duration-150">Hover me</button>
<div class="transition-all duration-200">Transform</div>

<!-- Data update animation -->
<span class="transition-all duration-500 ease-out">87.5%</span>

<!-- Loading pulse -->
<div class="animate-pulse bg-zinc-800 h-4 rounded"></div>

<!-- Live indicator ping -->
<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
```

---

## 9. Icons

### 9.1 Recommended Icon Library

**Lucide Icons** - Consistent, clean icons that match the dashboard aesthetic.

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

### 9.2 Common Icons

| Purpose | Icon Name | Usage |
|---------|-----------|-------|
| Dashboard | `layout-dashboard` | Navigation |
| Containers | `box` | Docker containers |
| Alerts | `bell` | Notifications |
| Settings | `settings` | Configuration |
| CPU | `cpu` | Processor metrics |
| Memory | `memory-stick` | RAM metrics |
| Disk | `hard-drive` | Storage metrics |
| Network | `wifi` | Network metrics |
| Play | `play` | Start container |
| Stop | `square` | Stop container |
| Restart | `refresh-cw` | Restart action |
| Delete | `trash-2` | Remove item |
| Add | `plus` | Create new |
| Check | `check` | Success state |
| X | `x` | Error/close |
| Alert | `alert-triangle` | Warning |
| Info | `info` | Information |

---

## 10. Chart Guidelines (Recharts)

### 10.1 Color Scheme

```javascript
const chartColors = {
  cpu: '#8b5cf6',      // violet-500
  ram: '#06b6d4',      // cyan-500
  disk: '#f59e0b',     // amber-500
  network: '#10b981',  // emerald-500
  grid: '#27272a',     // zinc-800
  text: '#a1a1aa',     // zinc-400
  tooltip: '#18181b',  // zinc-900
};
```

### 10.2 Chart Styling

```jsx
<LineChart>
  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
  <XAxis
    stroke="#71717a"
    fontSize={12}
    tickLine={false}
    axisLine={{ stroke: '#27272a' }}
  />
  <YAxis
    stroke="#71717a"
    fontSize={12}
    tickLine={false}
    axisLine={{ stroke: '#27272a' }}
  />
  <Tooltip
    contentStyle={{
      backgroundColor: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '8px'
    }}
  />
  <Line
    type="monotone"
    dataKey="cpu"
    stroke="#8b5cf6"
    strokeWidth={2}
    dot={false}
  />
</LineChart>
```

---

## 11. Accessibility

### 11.1 Color Contrast

All text must meet WCAG 2.1 AA standards:
- **Normal text:** 4.5:1 minimum contrast ratio
- **Large text (18px+):** 3:1 minimum contrast ratio

| Combination | Contrast Ratio | Status |
|-------------|----------------|--------|
| zinc-50 on zinc-900 | 15.1:1 | Pass |
| zinc-400 on zinc-900 | 5.4:1 | Pass |
| zinc-500 on zinc-900 | 3.9:1 | Large text only |
| green-500 on zinc-900 | 4.8:1 | Pass |
| red-500 on zinc-900 | 4.6:1 | Pass |

### 11.2 Focus States

```html
<!-- Focus visible ring -->
<button class="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
  Button
</button>
```

### 11.3 Screen Reader Support

```html
<!-- Status with aria-label -->
<span class="w-2 h-2 rounded-full bg-green-500" aria-label="Status: Running"></span>

<!-- Icon-only buttons need labels -->
<button aria-label="Restart container">
  <svg class="w-5 h-5">...</svg>
</button>

<!-- Live regions for real-time updates -->
<div aria-live="polite" aria-atomic="true">
  CPU: 87.5%
</div>
```

---

## 12. Dark Mode Considerations

Since dark mode is the primary (and only) theme:

1. **Avoid pure black (#000)** - Use `#0a0a0b` for softer appearance
2. **Layer with subtle grays** - Create depth with zinc-900, zinc-800, zinc-700
3. **Use transparency for overlays** - `bg-black/50` for modals
4. **Maintain sufficient contrast** - Test all text combinations
5. **Consider glow effects** - Subtle shadows can add depth in dark mode

```html
<!-- Subtle glow on cards -->
<div class="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/20">
  Content
</div>

<!-- Modal overlay -->
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm">
  <div class="bg-zinc-900 rounded-lg">Modal content</div>
</div>
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-23 | Initial design system |
