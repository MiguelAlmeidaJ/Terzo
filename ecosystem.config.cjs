const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const sourceLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const fileEnv = readEnv(path.join(root, '.env'));
const value = (name, fallback) => process.env[name] || fileEnv[name] || fallback;
const apiPort = value('API_PORT', '3001');
const webPort = value('WEB_PORT', '3000');
const databaseUrl = value('DATABASE_URL', '');
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória no arquivo .env.');

const shared = {
  NODE_ENV: 'production',
};

module.exports = {
  apps: [
    {
      name: 'terzo-api',
      cwd: root,
      script: path.join(root, 'api', 'dist', 'main.js'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      time: true,
      env: {
        ...shared,
        PORT: apiPort,
        HOST: value('API_HOST', '127.0.0.1'),
        DATABASE_URL: databaseUrl,
        DATA_DIR: path.resolve(root, value('DATA_DIR', './data')),
        COOKIE_SECURE: value('COOKIE_SECURE', 'false'),
        TRUST_PROXY: value('TRUST_PROXY', '0'),
        SESSION_IDLE_HOURS: value('SESSION_IDLE_HOURS', '8'),
        SESSION_MAX_DAYS: value('SESSION_MAX_DAYS', '7'),
        MAX_UPLOAD_MB: value('MAX_UPLOAD_MB', '25'),
        ALLOWED_MIME: value('ALLOWED_MIME', ''),
        NEXTCLOUD_ENABLED: value('NEXTCLOUD_ENABLED', 'false'),
        NEXTCLOUD_URL: value('NEXTCLOUD_URL', ''),
        NEXTCLOUD_USERNAME: value('NEXTCLOUD_USERNAME', ''),
        NEXTCLOUD_USER_ID: value('NEXTCLOUD_USER_ID', ''),
        NEXTCLOUD_APP_PASSWORD: value('NEXTCLOUD_APP_PASSWORD', ''),
        NEXTCLOUD_BASE_PATH: value('NEXTCLOUD_BASE_PATH', 'Terzo'),
        NEXTCLOUD_SYSTEM_FOLDER: value('NEXTCLOUD_SYSTEM_FOLDER', 'TERCEIRO ANDAR'),
        NEXTCLOUD_READ_TIMEOUT_MS: value('NEXTCLOUD_READ_TIMEOUT_MS', '120000'),
        NEXTCLOUD_WRITE_TIMEOUT_MS: value('NEXTCLOUD_WRITE_TIMEOUT_MS', '30000'),
        NEXTCLOUD_HEALTH_TIMEOUT_MS: value('NEXTCLOUD_HEALTH_TIMEOUT_MS', '10000'),
        NEXTCLOUD_RETRIES: value('NEXTCLOUD_RETRIES', '2'),
        NEXTCLOUD_RECONCILE_INTERVAL_MINUTES: value('NEXTCLOUD_RECONCILE_INTERVAL_MINUTES', '30'),
      },
    },
    {
      name: 'terzo-web',
      cwd: root,
      script: require.resolve('next/dist/bin/next'),
      args: `start web -H 127.0.0.1 -p ${webPort}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      time: true,
      env: {
        ...shared,
        PORT: webPort,
        API_INTERNAL_URL: value('API_INTERNAL_URL', `http://127.0.0.1:${apiPort}`),
      },
    },
  ],
};
