"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    process.exit(-1);
});
async function query(text, params) {
    const start = Date.now();
    const result = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
}
async function getClient() {
    const client = await exports.pool.connect();
    return client;
}
//# sourceMappingURL=connection.js.map