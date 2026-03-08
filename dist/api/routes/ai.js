"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const claude_service_1 = require("../../ai/claude-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// POST /api/ai/query — natural language query
const querySchema = zod_1.z.object({
    query: zod_1.z.string().min(3).max(1000),
    context: zod_1.z.string().optional(),
});
router.post('/query', (0, validation_1.validate)(querySchema), async (req, res) => {
    try {
        const { query: userQuery, context } = req.body;
        const result = await (0, claude_service_1.analyzeWithClaude)(userQuery, context);
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('AI query error:', err);
        res.status(500).json({ success: false, error: 'AI analysis failed' });
    }
});
// GET /api/ai/report/:type — generate automated report
router.get('/report/:type', (0, auth_1.authorize)('chief', 'captain', 'analyst', 'admin'), async (req, res) => {
    try {
        const reportType = req.params.type;
        if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
            res.status(400).json({ success: false, error: 'Invalid report type. Use daily, weekly, or monthly.' });
            return;
        }
        const targetDate = req.query.date;
        const result = await (0, claude_service_1.generateReport)(reportType, targetDate);
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('Report generation error:', err);
        res.status(500).json({ success: false, error: 'Report generation failed' });
    }
});
// GET /api/ai/predict — resource prediction
router.get('/predict', (0, auth_1.authorize)('chief', 'captain', 'analyst', 'admin'), async (req, res) => {
    try {
        const targetDate = req.query.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const district = req.query.district;
        const result = await (0, claude_service_1.predictResources)(targetDate, district);
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('Prediction error:', err);
        res.status(500).json({ success: false, error: 'Prediction failed' });
    }
});
// GET /api/ai/optimize — response time optimization recommendations
router.get('/optimize', (0, auth_1.authorize)('chief', 'captain', 'analyst', 'admin'), async (req, res) => {
    try {
        const districtId = req.query.district_id;
        const result = await (0, claude_service_1.optimizeResponseTimes)(districtId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('Optimization error:', err);
        res.status(500).json({ success: false, error: 'Optimization analysis failed' });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map