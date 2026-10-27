import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

// Tables captured in a backup. Order is the safe INSERT order (parents first).
const BACKUP_TABLES = [
  'users',
  'notification_settings',
  'alert_thresholds',
  'ssl_monitors',
  'uptime_monitors',
  'passkey_credentials',
] as const;

// Replace wipes these first (children → parents). invitations/password_resets
// are not backed up but reference users, so they must be cleared to free the
// foreign keys before users are deleted. Deleting uptime_monitors cascades to
// uptime_hourly_stats (history is not backed up and rebuilds on its own).
const DELETE_ORDER = [
  'passkey_credentials',
  'ssl_monitors',
  'uptime_monitors',
  'alert_thresholds',
  'invitations',
  'password_resets',
  'notification_settings',
  'users',
];

const VALID_COLUMN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface BackupFile {
  app: string;
  type: string;
  version: string;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createBackup(): Promise<BackupFile> {
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const name of BACKUP_TABLES) {
      tables[name] = await this.dataSource.query(`SELECT * FROM "${name}"`);
    }
    return {
      app: 'saasguard',
      type: 'backup',
      version: process.env.APP_VERSION || 'unknown',
      createdAt: new Date().toISOString(),
      tables,
    };
  }

  async restore(backup: BackupFile): Promise<{ restored: Record<string, number> }> {
    if (!backup || backup.app !== 'saasguard' || typeof backup.tables !== 'object') {
      throw new BadRequestException('Not a valid saasguard backup file');
    }

    const users = Array.isArray(backup.tables.users) ? backup.tables.users : [];
    if (!users.some((u) => u.role === 'admin')) {
      throw new BadRequestException(
        'Backup contains no admin user — refusing to restore (it would lock you out)',
      );
    }

    const restored: Record<string, number> = {};

    await this.dataSource.transaction(async (manager) => {
      for (const name of DELETE_ORDER) {
        await manager.query(`DELETE FROM "${name}"`);
      }
      for (const name of BACKUP_TABLES) {
        const rows = backup.tables[name];
        restored[name] = Array.isArray(rows) ? await this.insertRows(manager, name, rows) : 0;
      }
    });

    this.logger.log(`Restore complete: ${JSON.stringify(restored)}`);
    return { restored };
  }

  private async insertRows(
    manager: EntityManager,
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<number> {
    let count = 0;
    for (const row of rows) {
      const cols = Object.keys(row).filter((c) => VALID_COLUMN.test(c));
      if (cols.length === 0) continue;

      const colList = cols.map((c) => `"${c}"`).join(', ');
      const params = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map((c) => row[c]);

      await manager.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${params})`,
        values,
      );
      count++;
    }
    return count;
  }
}
