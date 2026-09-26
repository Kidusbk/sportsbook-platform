import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { authService } from '../../services/auth.service.js';
import { userService } from '../../services/user.service.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function getAuthContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent'), requestId: req.requestId };
}

router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body, getAuthContext(req));
    res.status(201).json({
      success: true, data: result,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body.email, req.body.password, getAuthContext(req));
    res.json({
      success: true, data: result,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await authService.logout(refreshToken, req.user.sub, getAuthContext(req));
    }
    res.json({
      success: true, data: { message: 'Logged out successfully' },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken, getAuthContext(req));
    res.json({
      success: true, data: { tokens },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' } }); return; }
    const user = await userService.getPublicProfile(req.user.sub);
    const roles = await userService.getUserRoles(req.user.sub);
    res.json({
      success: true, data: { user, roles },
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) { next(err); }
});

export { router as authRouter };
