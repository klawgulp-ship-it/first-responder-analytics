import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  analyzeWithClaude,
  generateReport,
  predictResources,
  optimizeResponseTimes,
} from '../../ai/claude-service';

const router = Router();
router.use(authenticate);

// POST /api/ai/query — natural language query
const querySchema = z.object({
  query: z.string().min(3).max(1000),
  context: z.string().optional(),
});

router.post('/query', validate(querySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { query: userQuery, context } = req.body;
    const result = await analyzeWithClaude(userQuery, context);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('AI query error:', err);
    res.status(500).json({ success: false, error: 'AI analysis failed' });
  }
});

// GET /api/ai/report/:type — generate automated report
router.get('/report/:type',
  authorize('chief', 'captain', 'analyst', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const reportType = req.params.type as 'daily' | 'weekly' | 'monthly';
      if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
        res.status(400).json({ success: false, error: 'Invalid report type. Use daily, weekly, or monthly.' });
        return;
      }

      const targetDate = req.query.date as string | undefined;
      const result = await generateReport(reportType, targetDate);

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Report generation error:', err);
      res.status(500).json({ success: false, error: 'Report generation failed' });
    }
  }
);

// GET /api/ai/predict — resource prediction
router.get('/predict',
  authorize('chief', 'captain', 'analyst', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const targetDate = (req.query.date as string) || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const district = req.query.district as string | undefined;

      const result = await predictResources(targetDate, district);

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Prediction error:', err);
      res.status(500).json({ success: false, error: 'Prediction failed' });
    }
  }
);

// GET /api/ai/optimize — response time optimization recommendations
router.get('/optimize',
  authorize('chief', 'captain', 'analyst', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const districtId = req.query.district_id as string | undefined;
      const result = await optimizeResponseTimes(districtId);

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('Optimization error:', err);
      res.status(500).json({ success: false, error: 'Optimization analysis failed' });
    }
  }
);

export default router;
