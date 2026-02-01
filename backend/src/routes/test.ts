import { Router, Request, Response } from 'express';

const router = Router();

// Simple health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Backend is running'
  });
});

// Echo endpoint for testing
router.post('/echo', (req: Request, res: Response) => {
  const { message } = req.body;
  res.json({
    received: message,
    echo: `Echo: ${message}`,
    timestamp: new Date().toISOString()
  });
});

export default router;
