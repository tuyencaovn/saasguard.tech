import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type Docker from 'dockerode';
import { DockerService } from '../docker/docker.service';

const REGISTRY = 'https://ghcr.io';
const IMAGE_REPO = 'tuyencaovn/saasguard.tech';
const UPDATER_IMAGE = 'docker:cli';
const STATUS_FILE = '.saasguard-update.json';
const TAGS_TTL_MS = 60_000;
const SEMVER = /^\d+\.\d+\.\d+$/;

export interface UpdateStatus {
  state: 'in_progress' | 'success' | 'failed';
  target: string;
  previous: string;
  error?: string;
}

export interface VersionInfo {
  current: string;
  previous: string | null;
  latest: string | null;
  available: string[];
  updateAvailable: boolean;
  canRollback: boolean;
  status: UpdateStatus | null;
}

@Injectable()
export class UpdatesService {
  private readonly logger = new Logger(UpdatesService.name);
  private tagsCache: { at: number; tags: string[] } | null = null;

  constructor(private readonly dockerService: DockerService) {}

  private get currentVersion(): string {
    return process.env.APP_VERSION || 'latest';
  }

  private get previousVersion(): string | null {
    return process.env.APP_VERSION_PREVIOUS || null;
  }

  async getVersionInfo(): Promise<VersionInfo> {
    const current = this.currentVersion;
    const previous = this.previousVersion;
    let available: string[] = [];
    let latest: string | null = null;

    try {
      const tags = await this.fetchTags();
      available = tags.filter((t) => SEMVER.test(t)).sort(cmpSemverDesc);
      latest = available[0] ?? null;
    } catch (err) {
      this.logger.warn(`Could not list image tags: ${(err as Error).message}`);
    }

    const status = this.readStatus();
    const updateAvailable = !!latest && current !== latest;
    const canRollback = !!previous && previous !== current;

    return { current, previous, latest, available, updateAvailable, canRollback, status };
  }

  getStatus(): UpdateStatus | null {
    return this.readStatus();
  }

  async triggerUpdate(target: string): Promise<{ accepted: true; target: string }> {
    const running = this.readStatus();
    if (running?.state === 'in_progress') {
      throw new ConflictException('An update is already in progress');
    }

    const tags = await this.fetchTags();
    const semverTags = tags.filter((t) => SEMVER.test(t)).sort(cmpSemverDesc);

    // Resolve the "latest" alias to a concrete version so the pin is deterministic.
    const resolved = target === 'latest' ? semverTags[0] : target;
    if (!resolved) {
      throw new BadRequestException('No published version available to update to');
    }
    if (!tags.includes(resolved)) {
      throw new BadRequestException(`Unknown version: ${resolved}`);
    }
    if (resolved === this.currentVersion) {
      throw new BadRequestException(`Already running ${resolved}`);
    }

    await this.spawnUpdater(resolved);
    return { accepted: true, target: resolved };
  }

  private async spawnUpdater(target: string): Promise<void> {
    const docker = this.dockerService.getConnection();
    if (!docker) {
      throw new ServiceUnavailableException('Docker is not available');
    }

    const projectDir = process.env.PROJECT_DIR;
    if (!projectDir) {
      throw new ServiceUnavailableException(
        'PROJECT_DIR is not set — reinstall with the latest install.sh to enable updates',
      );
    }

    await this.ensureImage(docker, UPDATER_IMAGE);

    const container = await docker.createContainer({
      Image: UPDATER_IMAGE,
      Cmd: ['sh', '-c', UPDATER_SCRIPT],
      Env: [
        `PROJECT_DIR=${projectDir}`,
        `TARGET=${target}`,
        `CURRENT=${this.currentVersion}`,
        `REGISTRY=ghcr.io`,
        `REPO=${IMAGE_REPO}`,
        `STATUS_FILE=${STATUS_FILE}`,
      ],
      WorkingDir: projectDir,
      HostConfig: {
        AutoRemove: true,
        Binds: [
          '/var/run/docker.sock:/var/run/docker.sock',
          `${projectDir}:${projectDir}`,
        ],
      },
    });

    await container.start();
    this.logger.log(`Updater container started → ${target}`);
  }

  private async ensureImage(docker: Docker, ref: string): Promise<void> {
    const existing = await docker.listImages({ filters: { reference: [ref] } });
    if (existing.length > 0) return;

    this.logger.log(`Pulling updater image ${ref}`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(ref, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (e: Error | null) =>
          e ? reject(e) : resolve(),
        );
      });
    });
  }

  private readStatus(): UpdateStatus | null {
    const path = this.statusPath();
    if (!path || !existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as UpdateStatus;
    } catch {
      return null;
    }
  }

  // The updater writes into PROJECT_DIR (rw). The backend reads it back through
  // the read-only host mount at /hostfs when running in the container.
  private statusPath(): string | null {
    const dir = process.env.PROJECT_DIR;
    if (!dir) return null;
    const viaHostfs = join('/hostfs', dir, STATUS_FILE);
    if (existsSync('/hostfs')) return viaHostfs;
    return join(dir, STATUS_FILE);
  }

  private async fetchTags(): Promise<string[]> {
    const now = Date.now();
    if (this.tagsCache && now - this.tagsCache.at < TAGS_TTL_MS) {
      return this.tagsCache.tags;
    }

    const repo = `${IMAGE_REPO}/backend`;
    const tokenRes = await fetch(
      `${REGISTRY}/token?scope=repository:${repo}:pull&service=ghcr.io`,
    );
    if (!tokenRes.ok) throw new Error(`token request failed (${tokenRes.status})`);
    const { token } = (await tokenRes.json()) as { token: string };

    const res = await fetch(`${REGISTRY}/v2/${repo}/tags/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`tags request failed (${res.status})`);
    const data = (await res.json()) as { tags?: string[] };
    const tags = data.tags ?? [];

    this.tagsCache = { at: now, tags };
    return tags;
  }
}

function cmpSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

// Runs inside a one-shot docker:cli container. Pulls target images BEFORE
// touching .env, so a failed pull never changes the running version. Writes
// progress to STATUS_FILE, which the backend reads back after it restarts.
const UPDATER_SCRIPT = `set -e
cd "$PROJECT_DIR"
STATUS="$PROJECT_DIR/$STATUS_FILE"
write() { printf '{"state":"%s","target":"%s","previous":"%s","error":"%s"}\\n' "$1" "$TARGET" "$CURRENT" "$2" > "$STATUS"; }
write in_progress ""
docker compose version >/dev/null 2>&1 || apk add --no-cache docker-cli-compose >/dev/null 2>&1
if ! docker pull "$REGISTRY/$REPO/backend:$TARGET" || ! docker pull "$REGISTRY/$REPO/frontend:$TARGET"; then
  write failed "pull failed for $TARGET"
  exit 1
fi
if grep -q '^APP_VERSION_PREVIOUS=' .env; then
  sed -i "s|^APP_VERSION_PREVIOUS=.*|APP_VERSION_PREVIOUS=$CURRENT|" .env
else
  echo "APP_VERSION_PREVIOUS=$CURRENT" >> .env
fi
if grep -q '^APP_VERSION=' .env; then
  sed -i "s|^APP_VERSION=.*|APP_VERSION=$TARGET|" .env
else
  echo "APP_VERSION=$TARGET" >> .env
fi
if docker compose -f docker-compose.prod.yml up -d; then
  write success ""
else
  write failed "compose up failed"
  exit 1
fi
`;
