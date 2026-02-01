import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import testRoutes from './routes/test';
import simulateRoutes from './routes/simulate';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();

// Determine allowed CORS origins (comma-separated list)
const rawFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawFrontend.split(',').map((s) => s.trim()).filter(Boolean);

// Middleware - allow requests from allowed origins or from localhost/dev tools
app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser requests (curl, server-to-server) when origin is undefined
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return callback(null, true);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
}));
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
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Export for Vercel serverless functions
export default app;

