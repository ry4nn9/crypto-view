// TODO: 
// Read ticks from Redis streams and aggregate them into 1-minute candles
// Write candles to Redis pub sub
// Store candles in DB

import Redis from 'ioredis';
import { Tick, Candle } from '@mini-tradingview/shared';
import * as process from 'process';
import { updateCandle } from './candles';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const SYMBOLS = (process.env.SYMBOLS ?? "btcusdt")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const GROUP_NAME = "aggregator-group";
const CONSUMER_NAME = `aggregator-consumer-${Math.random().toString(36).substring(2, 15)}`;
const BATCH_SIZE = 100;
const BLOCK_MS = 5000;

async function ensureGroups() {
    for (const symbol of SYMBOLS) {
        const streamKey = `stream:ticks:${symbol}`;
        try {
            await redis.xgroup("CREATE", streamKey, GROUP_NAME, "$", "MKSTREAM");
            console.log(`[aggregator] created consumer group ${GROUP_NAME} for stream ${streamKey}`);
        } catch (err) {
            console.log(`[aggregator] consumer group ${GROUP_NAME} already exists for stream ${streamKey}`);
        }
    }
}

function parseTick(entry: [string, string[]]): {id: string, tick: Tick} {
    const [id, fields] = entry;
    const fields_dict: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
        fields_dict[fields[i]] = fields[i+1]
    }

    const tick: Tick = {
        t: Number(fields_dict["t"]),
        p: Number(fields_dict["p"]),
        q: Number(fields_dict["q"])
    }

    return {id, tick} 
}

const currentCandles = new Map<string, Candle>()
async function processTicks() {
    const streams: string[] = [];
    for (const symbol of SYMBOLS) {
        streams.push(`stream:ticks:${symbol}`, ">");
    }

    const res = await redis.xreadgroup(
        "GROUP", GROUP_NAME, CONSUMER_NAME,
        "COUNT", BATCH_SIZE,
        "BLOCK", BLOCK_MS,
        "STREAMS", ...streams
    )

    if (!res) {
        return;
    }

    for (const [streamKey, entries] of res as [string, [string, string[]][]][]) {
        const symbol = streamKey.replace("stream:ticks:", "");
        for (const entry of entries) {
            // [
            // "1720394850000-0",
            // ["t", "1712345678901", "p", "67420.12", "q", "0.01"]
            // ]
            const {id, tick} = parseTick(entry);
            console.log(`[tick] ${symbol} id=${id} p=${tick.p} q=${tick.q}`);

            const prev = currentCandles.get(`${symbol}`) ?? null;
            const { candle, rolledOver } = updateCandle(symbol, tick, prev)

            if (rolledOver && prev) {
                prev.final = true
                await publishCandle(prev)
                await persistCandle(prev)
            }

            currentCandles.set(symbol, candle)

            await publishCandle(candle)
            await cacheLatestCandle(candle)

            await redis.xack(streamKey, GROUP_NAME, id)
        }
    }  
}

async function publishCandle(candle: Candle) {
    const channel = `candles:${candle.symbol}:${candle.tf}`;
    await redis.publish(channel, JSON.stringify(candle));
}

async function cacheLatestCandle(candle: Candle) {
    const key = `latest-candle:${candle.symbol}:${candle.tf}`;
    await redis.set(key, JSON.stringify(candle));
}

async function persistCandle(candle: Candle) {
  // TODO: insert into Postgres/TimescaleDB
  // for now just log so you can see rollover behavior
  console.log("[aggregator] final candle", candle.symbol, candle.tf, candle);
}

async function main() {
  console.log("[aggregator] starting with symbols:", SYMBOLS.join(","));
  await ensureGroups();

  while (true) {
    try {
      await processTicks();
    } catch (err) {
      console.error("[aggregator] error in processTicks", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main().catch((err) => {
  console.error("[aggregator] fatal", err);
  process.exit(1);
});