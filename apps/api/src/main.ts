import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config';
import { HttpExceptionFilter } from './http-exception.filter';
import express, { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com https://www.loom.com; object-src 'none'; base-uri 'self'; form-action 'self'",
};

async function bootstrap() {
  await fs.mkdir(path.join(config.dataDir, 'blobs'), { recursive: true });
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', config.trustProxy);
  server.use((req: Request, res: Response, next: NextFunction) => { for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value); next(); });
  server.use('/api/assets', (req: Request, res: Response, next: NextFunction) => req.method === 'POST' && req.path === '/'
    ? express.raw({ type: '*/*', limit: `${config.maxUploadMB}mb` })(req, res, next)
    : next());
  server.use(express.json({ limit: '1.5mb' }));
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers['x-terzo'] !== '1' || req.headers['sec-fetch-site'] === 'cross-site')
        return res.status(403).json({ error: 'csrf' });
      const origin = req.headers.origin;
      if (origin) {
        const host = config.trustProxy ? String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim() : req.headers.host;
        const scheme = config.trustProxy
          ? String(req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).split(',')[0].trim()
          : (req.secure ? 'https' : 'http');
        try {
          if (!host || new URL(origin).origin !== `${scheme}://${host}`)
            return res.status(403).json({ error: 'csrf' });
        } catch { return res.status(403).json({ error: 'csrf' }); }
      }
    }
    next();
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  console.log(JSON.stringify({ level: 'info', message: `Terzo API em http://${config.host}:${config.port}` }));
}
void bootstrap();
