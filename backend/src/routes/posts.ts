import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Temporary in-memory sample posts so frontend can render without a database.
const samplePosts = [
  {
    id: 1,
    title: 'Welcome to CircuitBrain',
    content: 'This is a sample post. Database is disabled.',
    published: true,
    author: { id: 0, name: 'System' },
    createdAt: new Date().toISOString(),
  },
];

// Get all posts (returns sample data)
router.get('/', (_req: Request, res: Response) => {
  res.json(samplePosts);
});

// Create post (not available without DB)
router.post('/', verifyToken, (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Create post unavailable: database removed' });
});

// Get user's posts (returns empty list)
router.get('/user/:userId', (_req: Request, res: Response) => {
  res.json([]);
});

export default router;
