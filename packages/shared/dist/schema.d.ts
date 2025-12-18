import { z } from "zod";
export declare const TimeframeSchema: z.ZodUnion<readonly [z.ZodLiteral<"1m">, z.ZodLiteral<"5m">, z.ZodLiteral<"1h">]>;
export declare const TickSchema: z.ZodObject<{
    t: z.ZodNumber;
    p: z.ZodNumber;
    q: z.ZodNumber;
}, z.core.$strip>;
export declare const CandleSchema: z.ZodObject<{
    symbol: z.ZodString;
    tf: z.ZodUnion<readonly [z.ZodLiteral<"1m">, z.ZodLiteral<"5m">, z.ZodLiteral<"1h">]>;
    t: z.ZodNumber;
    o: z.ZodNumber;
    h: z.ZodNumber;
    l: z.ZodNumber;
    c: z.ZodNumber;
    v: z.ZodNumber;
    final: z.ZodBoolean;
}, z.core.$strip>;
export type CandleShape = z.infer<typeof CandleSchema>;
