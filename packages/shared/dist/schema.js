"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandleSchema = exports.TickSchema = exports.TimeframeSchema = void 0;
const zod_1 = require("zod");
exports.TimeframeSchema = zod_1.z.union([zod_1.z.literal("1m"), zod_1.z.literal("5m"), zod_1.z.literal("1h")]);
exports.TickSchema = zod_1.z.object({
    t: zod_1.z.number(),
    p: zod_1.z.number(),
    q: zod_1.z.number(),
});
exports.CandleSchema = zod_1.z.object({
    symbol: zod_1.z.string(),
    tf: exports.TimeframeSchema,
    // window start timestamp (ms since epoch)
    t: zod_1.z.number(),
    o: zod_1.z.number(),
    h: zod_1.z.number(),
    l: zod_1.z.number(),
    c: zod_1.z.number(),
    v: zod_1.z.number(),
    final: zod_1.z.boolean(),
});
