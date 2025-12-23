import { Tick, Candle } from '@mini-tradingview/shared';

export function updateCandle(
    symbol: string, 
    tick: Tick,
    prev: Candle | null
): { candle: Candle; rolledOver: boolean } {
    // 1-minute buckets
    const bucket = Math.floor(tick.t / 60_000) * 60_000
    if (!prev || prev.t !== bucket) {
        const candle: Candle = {
            symbol,
            tf: "1m",
            t: bucket,
            o: tick.p,
            h: tick.p,
            l: tick.p,
            c: tick.p,
            v: tick.q,
            final: false
        }

        return {candle, rolledOver: !!prev}
    }

    // in-place update
    prev.h = Math.max(prev.h, tick.p)
    prev.l = Math.min(prev.l, tick.p)
    prev.c = tick.p
    prev.v += tick.q

    return {candle: prev, rolledOver: false}
}