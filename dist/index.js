"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./api/routes/auth"));
const dashboard_1 = __importDefault(require("./api/routes/dashboard"));
const incidents_1 = __importDefault(require("./api/routes/incidents"));
const units_1 = __importDefault(require("./api/routes/units"));
const analytics_1 = __importDefault(require("./api/routes/analytics"));
const ai_1 = __importDefault(require("./api/routes/ai"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001');
// Trust proxy (Railway, Render, etc.)
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disabled for dashboard SPA
}));
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : true,
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);
// AI endpoints get a more generous limit
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 10,
    message: { success: false, error: 'AI query rate limit reached. Please wait.' },
});
app.use('/api/ai/', aiLimiter);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/incidents', incidents_1.default);
app.use('/api/units', units_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/ai', ai_1.default);
// Serve React dashboard in production
const dashboardPath = path_1.default.join(__dirname, '../dashboard/dist');
app.use(express_1.default.static(dashboardPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        next();
        return;
    }
    const indexPath = path_1.default.join(dashboardPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(500).send('Dashboard not built. Run: cd dashboard && npm run build');
        }
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   First Responder Analytics Platform v1.0.0      ║
║   Server running on port ${PORT}                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
╚══════════════════════════════════════════════════╝
  `);
});
exports.default = app;
//# sourceMappingURL=index.js.map