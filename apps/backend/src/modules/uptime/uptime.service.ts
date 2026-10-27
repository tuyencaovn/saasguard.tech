import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { randomUUID } from 'crypto';
import { UptimeMonitor, UptimeStatus } from './entities/uptime-monitor.entity';
import { UptimeHourlyStat } from './entities/uptime-hourly-stat.entity';
import { CreateUptimeMonitorDto } from './dto/create-uptime-monitor.dto';
import { UpdateUptimeMonitorDto } from './dto/update-uptime-monitor.dto';

// Billing is off for now — everyone gets the full limit.
const UPTIME_MONITOR_LIMIT = 50;
// Consecutive failed checks before a monitor is confirmed DOWN (flapping guard).
const CONFIRM_THRESHOLD = 2;
const CHECK_TIMEOUT_MS = 10000;
const DEFAULT_INTERVAL_SECONDS = 60;
const RETENTION_DAYS = 90;
// Tolerance so a monitor due at :03 still runs on the :00 cron tick of its interval.
const DUE_TOLERANCE_SECONDS = 30;
const USER_AGENT = 'SaaSGuard-UptimeMonitor/1.0';

export type UptimeTransition = 'down' | 'recovered' | null;

interface CheckResult {
  up: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

export interface UptimeStats {
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
}

// Per-slot uptime % (null = no data) for the status bars: 24 hourly + 7 daily.
export interface UptimeSeries {
  hourly: { start: string; uptime: number | null }[];
  daily: { date: string; uptime: number | null }[];
}

export type MonitorWithStats = UptimeMonitor & UptimeStats & UptimeSeries;

const HOURLY_SLOTS = 24;
const DAILY_SLOTS = 7;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function toPercent(up: string | number | null, total: string | number | null): number | null {
  const t = Number(total);
  if (!t) return null;
  return Math.round((Number(up) / t) * 10000) / 100;
}

function currentHourBucket(now: Date): Date {
  const bucket = new Date(now);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket;
}

// Day boundaries for the 7-day bar follow the app's timezone (Vietnam), not UTC,
// so an outage near midnight lands on the right local day.
const APP_TIMEZONE = 'Asia/Saigon';

// Offset (ms) of a timezone from UTC at a given instant: localWallClock - utc.
function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(at)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - at.getTime();
}

@Injectable()
export class UptimeService {
  private readonly logger = new Logger(UptimeService.name);

  constructor(
    @InjectRepository(UptimeMonitor)
    private readonly uptimeMonitorRepository: Repository<UptimeMonitor>,
    @InjectRepository(UptimeHourlyStat)
    private readonly hourlyStatRepository: Repository<UptimeHourlyStat>,
  ) {}

  async create(userId: string, dto: CreateUptimeMonitorDto): Promise<MonitorWithStats> {
    const existing = await this.uptimeMonitorRepository.findOne({
      where: { userId, url: dto.url },
    });
    if (existing) {
      throw new BadRequestException(`${dto.url} is already being monitored`);
    }

    const count = await this.uptimeMonitorRepository.count({ where: { userId } });
    if (count >= UPTIME_MONITOR_LIMIT) {
      throw new BadRequestException(`You can monitor up to ${UPTIME_MONITOR_LIMIT} URLs.`);
    }

    const monitor = this.uptimeMonitorRepository.create({
      userId,
      url: dto.url,
      name: dto.name ?? null,
      checkIntervalSeconds: dto.checkIntervalSeconds ?? DEFAULT_INTERVAL_SECONDS,
      status: UptimeStatus.UNKNOWN,
      notifyEmail: dto.notifyEmail ?? true,
      notifyTelegram: dto.notifyTelegram ?? true,
      notifySlack: dto.notifySlack ?? true,
      notifyEmailTo: dto.notifyEmailTo ?? null,
    });
    const saved = await this.uptimeMonitorRepository.save(monitor);

    // Run immediate check (non-blocking)
    this.checkAndUpdate(saved.id).catch((err) =>
      this.logger.error(`Initial check failed for ${dto.url}`, err),
    );

    return {
      ...saved,
      uptime24h: null,
      uptime7d: null,
      uptime30d: null,
      hourly: [],
      daily: [],
    };
  }

  async findAllByUser(userId: string): Promise<MonitorWithStats[]> {
    const monitors = await this.uptimeMonitorRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const ids = monitors.map((m) => m.id);
    const stats = await this.getStatsForMonitors(ids);
    const series = await this.getSeriesForMonitors(ids);
    return monitors.map((m) => ({
      ...m,
      ...this.statsOrEmpty(stats.get(m.id)),
      ...this.seriesOrEmpty(series.get(m.id)),
    }));
  }

  async findOne(id: string, userId: string): Promise<UptimeMonitor> {
    const monitor = await this.uptimeMonitorRepository.findOne({ where: { id, userId } });
    if (!monitor) throw new NotFoundException('Uptime monitor not found');
    return monitor;
  }

  async findOneWithStats(id: string, userId: string): Promise<MonitorWithStats> {
    const monitor = await this.findOne(id, userId);
    const stats = await this.getStatsForMonitors([monitor.id]);
    const series = await this.getSeriesForMonitors([monitor.id]);
    return {
      ...monitor,
      ...this.statsOrEmpty(stats.get(monitor.id)),
      ...this.seriesOrEmpty(series.get(monitor.id)),
    };
  }

  async update(id: string, userId: string, dto: UpdateUptimeMonitorDto): Promise<UptimeMonitor> {
    const monitor = await this.findOne(id, userId);
    Object.assign(monitor, dto);
    return this.uptimeMonitorRepository.save(monitor);
  }

  async remove(id: string, userId: string): Promise<void> {
    const monitor = await this.findOne(id, userId);
    await this.uptimeMonitorRepository.remove(monitor);
  }

  async checkAndUpdate(
    id: string,
  ): Promise<{ monitor: UptimeMonitor; transition: UptimeTransition }> {
    const monitor = await this.uptimeMonitorRepository.findOne({ where: { id } });
    if (!monitor) throw new NotFoundException('Uptime monitor not found');

    const prevStatus = monitor.status;
    const result = await this.performCheck(monitor.url);
    const now = new Date();

    await this.recordHourlyStat(monitor.id, currentHourBucket(now), result.up);

    monitor.lastChecked = now;
    monitor.lastStatusCode = result.statusCode;
    monitor.lastResponseTimeMs = result.responseTimeMs;
    monitor.errorMessage = result.error;

    let transition: UptimeTransition = null;

    if (result.up) {
      monitor.consecutiveFailures = 0;
      monitor.lastUpAt = now;
      monitor.status = UptimeStatus.UP;
      if (prevStatus === UptimeStatus.DOWN) transition = 'recovered';
    } else {
      monitor.consecutiveFailures += 1;
      if (monitor.consecutiveFailures === 1) monitor.lastDownAt = now;
      if (monitor.consecutiveFailures >= CONFIRM_THRESHOLD) {
        if (prevStatus !== UptimeStatus.DOWN) transition = 'down';
        monitor.status = UptimeStatus.DOWN;
      }
      // Below threshold: keep prior status to ride out a single transient failure.
    }

    const saved = await this.uptimeMonitorRepository.save(monitor);
    return { monitor: saved, transition };
  }

  /**
   * Check every monitor whose interval has elapsed since its last check.
   */
  async checkDueMonitors(): Promise<Array<{ monitor: UptimeMonitor; transition: UptimeTransition }>> {
    const monitors = await this.uptimeMonitorRepository.find();
    const now = Date.now();
    const results: Array<{ monitor: UptimeMonitor; transition: UptimeTransition }> = [];

    for (const monitor of monitors) {
      if (!this.isDue(monitor, now)) continue;
      try {
        results.push(await this.checkAndUpdate(monitor.id));
      } catch (err) {
        this.logger.error(`Check failed for ${monitor.url}`, err);
      }
    }

    return results;
  }

  async pruneOldStats(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.hourlyStatRepository
      .createQueryBuilder()
      .delete()
      .where('"hourBucket" < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }

  private isDue(monitor: UptimeMonitor, nowMs: number): boolean {
    if (!monitor.lastChecked) return true;
    const elapsed = (nowMs - new Date(monitor.lastChecked).getTime()) / 1000;
    return elapsed >= monitor.checkIntervalSeconds - DUE_TOLERANCE_SECONDS;
  }

  private async recordHourlyStat(monitorId: string, hourBucket: Date, up: boolean): Promise<void> {
    await this.hourlyStatRepository.query(
      `INSERT INTO uptime_hourly_stats (id, "monitorId", "hourBucket", "totalChecks", "upChecks")
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT ("monitorId", "hourBucket")
       DO UPDATE SET "totalChecks" = uptime_hourly_stats."totalChecks" + 1,
                     "upChecks" = uptime_hourly_stats."upChecks" + EXCLUDED."upChecks"`,
      [randomUUID(), monitorId, hourBucket, up ? 1 : 0],
    );
  }

  private statsOrEmpty(stats: UptimeStats | undefined): UptimeStats {
    return stats ?? { uptime24h: null, uptime7d: null, uptime30d: null };
  }

  private seriesOrEmpty(series: UptimeSeries | undefined): UptimeSeries {
    return series ?? { hourly: [], daily: [] };
  }

  /**
   * Build the last-24-hour (hourly) and last-7-day (daily) uptime series for the
   * status bars, from the hourly rollup. Slots are UTC-aligned; a slot with no
   * data is null (rendered as a gap).
   */
  private async getSeriesForMonitors(monitorIds: string[]): Promise<Map<string, UptimeSeries>> {
    const map = new Map<string, UptimeSeries>();
    if (monitorIds.length === 0) return map;

    const now = new Date();
    const since = new Date(now.getTime() - DAILY_SLOTS * DAY_MS);
    const rows = await this.hourlyStatRepository.find({
      where: { monitorId: In(monitorIds), hourBucket: MoreThanOrEqual(since) },
    });

    const perMonitor = new Map<string, Map<number, { total: number; up: number }>>();
    for (const id of monitorIds) perMonitor.set(id, new Map());
    for (const r of rows) {
      perMonitor
        .get(r.monitorId)
        ?.set(new Date(r.hourBucket).getTime(), { total: r.totalChecks, up: r.upChecks });
    }

    const currentHour = new Date(now);
    currentHour.setUTCMinutes(0, 0, 0);

    // Start of "today" in the app timezone, expressed as a real UTC instant.
    const tzOffset = tzOffsetMs(APP_TIMEZONE, now);
    const localMidnight = new Date(now.getTime() + tzOffset);
    localMidnight.setUTCHours(0, 0, 0, 0);
    const currentDayStartUtc = localMidnight.getTime() - tzOffset;

    for (const id of monitorIds) {
      const hours = perMonitor.get(id) ?? new Map<number, { total: number; up: number }>();

      const hourly: UptimeSeries['hourly'] = [];
      for (let i = HOURLY_SLOTS - 1; i >= 0; i--) {
        const slot = new Date(currentHour.getTime() - i * HOUR_MS);
        const e = hours.get(slot.getTime());
        hourly.push({ start: slot.toISOString(), uptime: e ? toPercent(e.up, e.total) : null });
      }

      const daily: UptimeSeries['daily'] = [];
      for (let d = DAILY_SLOTS - 1; d >= 0; d--) {
        const dayStart = currentDayStartUtc - d * DAY_MS;
        const dayEnd = dayStart + DAY_MS;
        let total = 0;
        let up = 0;
        for (const [k, v] of hours) {
          if (k >= dayStart && k < dayEnd) {
            total += v.total;
            up += v.up;
          }
        }
        daily.push({
          // Label with the local (app-timezone) calendar date.
          date: new Date(dayStart + tzOffset).toISOString().slice(0, 10),
          uptime: total ? toPercent(up, total) : null,
        });
      }

      map.set(id, { hourly, daily });
    }

    return map;
  }

  private async getStatsForMonitors(monitorIds: string[]): Promise<Map<string, UptimeStats>> {
    const map = new Map<string, UptimeStats>();
    if (monitorIds.length === 0) return map;

    const rows = await this.hourlyStatRepository
      .createQueryBuilder('s')
      .select('s.monitorId', 'monitorId')
      .addSelect(`COALESCE(SUM("s"."totalChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '24 hours'), 0)`, 'total24')
      .addSelect(`COALESCE(SUM("s"."upChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '24 hours'), 0)`, 'up24')
      .addSelect(`COALESCE(SUM("s"."totalChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '7 days'), 0)`, 'total7')
      .addSelect(`COALESCE(SUM("s"."upChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '7 days'), 0)`, 'up7')
      .addSelect(`COALESCE(SUM("s"."totalChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '30 days'), 0)`, 'total30')
      .addSelect(`COALESCE(SUM("s"."upChecks") FILTER (WHERE "s"."hourBucket" >= NOW() - INTERVAL '30 days'), 0)`, 'up30')
      .where('s.monitorId IN (:...monitorIds)', { monitorIds })
      .groupBy('s.monitorId')
      .getRawMany<{
        monitorId: string;
        total24: string;
        up24: string;
        total7: string;
        up7: string;
        total30: string;
        up30: string;
      }>();

    for (const r of rows) {
      map.set(r.monitorId, {
        uptime24h: toPercent(r.up24, r.total24),
        uptime7d: toPercent(r.up7, r.total7),
        uptime30d: toPercent(r.up30, r.total30),
      });
    }
    return map;
  }

  private async performCheck(url: string): Promise<CheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT },
      });
      const responseTimeMs = Date.now() - start;
      try {
        await res.body?.cancel();
      } catch {
        // ignore body teardown errors
      }
      const up = res.status >= 200 && res.status < 400;
      return {
        up,
        statusCode: res.status,
        responseTimeMs,
        error: up ? null : `HTTP ${res.status}`,
      };
    } catch (err) {
      const responseTimeMs = Date.now() - start;
      let error = 'Request failed';
      if (err instanceof Error) {
        error = err.name === 'TimeoutError' ? 'Connection timeout' : err.message;
      }
      return { up: false, statusCode: null, responseTimeMs, error };
    }
  }
}
