import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { initSchema } from './db.ts';
import { seedDatabaseIfEmpty } from './seed.ts';
import { projectsRouter } from './routes/projects.ts';
import { checklistRouter } from './routes/checklist.ts';
import { ordinancesRouter } from './routes/ordinances.ts';
import { notesRouter } from './routes/notes.ts';
import { desktopRouter } from './routes/desktop.ts';
import { sitePlansRouter, seedSampleSitePlanIfEmpty } from './routes/sitePlans.ts';

async function startServer() {
  initSchema();
  seedDatabaseIfEmpty();
  seedSampleSitePlanIfEmpty();

  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '2mb' }));

  // Tag every genuine backend API response so the frontend can distinguish
  // real IndeeCheck API responses from upstream cloud-proxy blocks.
  app.use('/api', (_req, res, next) => {
    res.setHeader('X-IndeeCheck-Server', '1');
    next();
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'IndeeCheck — City of Independence, IA Planning & Zoning API',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes (no authentication required)
  app.use('/api/desktop', desktopRouter);
  app.use('/api', sitePlansRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/ordinances', ordinancesRouter);
  app.use('/api', checklistRouter);
  app.use('/api', notesRouter);

  // Catch-all for unknown /api routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`IndeeCheck server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start IndeeCheck server:', err);
  process.exit(1);
});
