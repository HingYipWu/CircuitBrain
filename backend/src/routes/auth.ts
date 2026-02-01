import { Router, Request, Response } from 'express';

const router = Router();

// Database removed — auth is not available until a DB is configured.
router.post('/signup', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Auth unavailable: database removed' });
});

router.post('/login', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Auth unavailable: database removed' });
});

export default router;
