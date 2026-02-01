import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import testRoutes from './routes/test';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();

// Determine CORS origin
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({ 
  origin: corsOrigin,
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

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

