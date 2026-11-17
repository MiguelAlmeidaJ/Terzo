import path from 'node:path';

const env = process.env;

export const config = {
  port: Number(env.PORT || 3001),
  host: env.HOST || '0.0.0.0',
  dataDir: path.resolve(env.DATA_DIR || path.resolve(__dirname, '../../../data')),
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE !== 'false' : env.NODE_ENV === 'production',
  idleHours: Number(env.SESSION_IDLE_HOURS || 8),
  maxDays: Number(env.SESSION_MAX_DAYS || 7),
  maxUploadMB: Number(env.MAX_UPLOAD_MB || 25),
  trustProxy: env.TRUST_PROXY === '1',
  nextcloud: {
    enabled: env.NEXTCLOUD_ENABLED === 'true' || env.NEXTCLOUD_ENABLED === '1',
    url: (env.NEXTCLOUD_URL || '').replace(/\/+$/, ''),
    username: env.NEXTCLOUD_USERNAME || '',
    userId: env.NEXTCLOUD_USER_ID || env.NEXTCLOUD_USERNAME || '',
    appPassword: env.NEXTCLOUD_APP_PASSWORD || '',
    basePath: env.NEXTCLOUD_BASE_PATH || 'Terzo',
    systemFolder: env.NEXTCLOUD_SYSTEM_FOLDER || 'TERCEIRO ANDAR',
    readTimeoutMs: Number(env.NEXTCLOUD_READ_TIMEOUT_MS || 120_000),
    writeTimeoutMs: Number(env.NEXTCLOUD_WRITE_TIMEOUT_MS || 30_000),
    healthTimeoutMs: Number(env.NEXTCLOUD_HEALTH_TIMEOUT_MS || 10_000),
    retries: Math.max(0, Math.min(5, Number(env.NEXTCLOUD_RETRIES || 2))),
    reconcileIntervalMinutes: Math.max(0, Number(env.NEXTCLOUD_RECONCILE_INTERVAL_MINUTES || 30)),
  },
  allowedMime: (env.ALLOWED_MIME || 'image/png,image/jpeg,image/gif,image/webp,application/pdf,video/mp4,video/webm,text/plain,text/csv,text/markdown,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation')
    .split(',').map((value) => value.trim()).filter(Boolean),
};

export const now = () => BigInt(Date.now());
export const toNumber = (value: bigint | null | undefined) => value == null ? null : Number(value);
