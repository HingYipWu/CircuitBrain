import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();

function getPrismaClient(): PrismaClient | null {
  try {
    // eslint-disable-next-line no-new
    return new PrismaClient();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auth] PrismaClient init failed:', err);
    return null;
  }
}

interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Register
router.post('/signup', async (req: Request<any, any, SignupRequest>, res: Response) => {
  try {
    const { email, name, password } = req.body;

    const prisma = getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword },
    });

    await prisma.$disconnect();

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request<any, any, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    const prisma = getPrismaClient();
    if (!prisma) return res.status(503).json({ error: 'Database not configured' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    await prisma.$disconnect();
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
