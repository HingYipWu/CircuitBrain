import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import testRoutes from './routes/test';
import simulateRoutes from './routes/simulate';
dotenv.config();

const app: Express = express();

// Determine allowed CORS origins (comma-separated list).
// If `FRONTEND_URL` is not set, default to '*' to allow browser testing.
const rawFrontend = process.env.FRONTEND_URL ?? '*';
const allowedOrigins = rawFrontend.split(',').map((s) => s.trim()).filter(Boolean);

// Middleware - allow requests from allowed origins or from localhost/dev tools
// Log incoming requests for debugging
app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[request] ${req.method} ${req.url} - origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow-all shortcut when FRONTEND_URL is set to '*'
    if (allowedOrigins.includes('*')) return callback(null, true);
    // allow non-browser requests (curl, server-to-server) when origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true);
    // Deny without throwing to avoid 500s; browser will enforce CORS.
    return callback(null, false);
  },
  credentials: true,
}));

// Generic error handler to log errors and return JSON
app.use((err: any, _req: Request, res: Response, _next: any) => {
  // eslint-disable-next-line no-console
  console.error('[error]', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal server error', details: String(err && err.message ? err.message : err) });
});
app.use(express.json());

// Routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/simulate', simulateRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running' });
});

// For local development
if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });

  // Graceful shutdown for local development
  process.on('SIGINT', () => {
    process.exit(0);
  });
}

// Export for Vercel serverless functions
export default app;

