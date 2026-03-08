import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/connection';
import { generateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const result = await query(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account disabled' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, email: user.email },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
