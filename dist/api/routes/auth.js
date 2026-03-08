"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const connection_1 = require("../../db/connection");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
router.post('/login', (0, validation_1.validate)(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await (0, connection_1.query)('SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }
        const user = result.rows[0];
        if (!user.is_active) {
            res.status(403).json({ success: false, error: 'Account disabled' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }
        await (0, connection_1.query)('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        const token = (0, auth_1.generateToken)({ id: user.id, username: user.username, role: user.role });
        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, username: user.username, role: user.role, email: user.email },
            },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map