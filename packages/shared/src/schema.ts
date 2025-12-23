import { z } from "zod";
import { Timeframe } from "./types";

export const TimeframeSchema = z.union([z.literal("1m"), z.literal("5m"), z.literal("1h")]);

export const TickSchema = z.object({
  t: z.number(),
  p: z.number(),
  q: z.number(),
});

export const CandleSchema = z.object({
  symbol: z.string(),
  tf: TimeframeSchema,
  // window start timestamp (ms since epoch)
  t: z.number(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
  final: z.boolean(),
});

// don't export a conflicting `Candle` type name here (types.ts already exports it)
export type CandleShape = z.infer<typeof CandleSchema>;
