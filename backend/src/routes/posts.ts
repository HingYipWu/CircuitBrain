import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: number;
}

// Get all posts
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: req.userId!,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's posts
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: parseInt(req.params.userId) },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
