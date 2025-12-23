// TODO:
// Initialize Redis client
// Establish websocket connection to data source (Binance API)
// Build stream URL requests for ticker groups for API
// Parse incoming messages and extract ticker symbol, price, and quantity from incoming messages
// Populate data into Tick data structure
// Write extracted data to Redis stream (one stream per symbol)

import Redis from 'ioredis';
import WebSocket from 'ws';
import { Tick } from '@mini-tradingview/shared';
import * as process from 'process';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const BINANCE_API_URL = process.env.BINANCE_API_URL || 'wss://stream.binance.us:9443/stream?streams=';
const SYMBOLS = (process.env.SYMBOLS ?? "btcusdt")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const redis = new Redis(REDIS_URL);

/**
 * Construct a Binance API websocket stream URL from the provided SYMBOLS
 * environment variable. The SYMBOLS environment variable is a comma-separated
 * list of ticker symbols to stream, e.g. "btcusdt,ethusdt".
 * The function maps each symbol to the "@trade" stream and joins them with
 * a "/" character, then prepends the Binance API websocket stream URL.
 * @returns {string} A Binance API websocket stream URL for the provided SYMBOLS
 */
function buildStreamUrl(): string {
  // btcsusdt@trade/ethusdt@trade/...
  const streams = SYMBOLS.map((s) => `${s}@aggTrade`).join("/");
  return `${BINANCE_API_URL}${streams}`;
}

/**
 * Normalize a ticker symbol stream name by splitting at the "@" character
 * and returning the upper-cased first component.
 * @example
 * normalizeSymbol("btcusdt@trade") // "BTCUSDT"
 * @param {string} streamName - The stream name to normalize
 * @returns {string} The normalized ticker symbol
 */
function normalizeSymbol(streamName: string): string {
  // "btcusdt@trade" -> "BTCUSDT"
  return streamName.split("@")[0].toUpperCase();
}

/**
 * Starts the collector service which establishes a websocket connection to
 * the Binance API and listens for incoming messages. When a message is
 * received, it is parsed and the extracted data is written to a Redis
 * stream. The stream key is constructed as "stream:ticks:<symbol>" where
 * <symbol> is the upper-cased ticker symbol extracted from the stream name.
 * If the websocket connection is closed, the collector will automatically
 * restart after a 5 second delay.
 */
function startCollector() {
    const stream_url = buildStreamUrl();
    const ws_connection = new WebSocket(stream_url)

    ws_connection.on("open", () => {
        console.log(`Connecting to ${stream_url}`)
    })

    ws_connection.on("message", async (raw) => {
        try {
            // https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
            // stream events wrapped as: {"stream":"<streamName>","data":<rawPayload>}
            const message = JSON.parse(raw.toString())
            const streamName = message.stream
            const data = message.data

            const tick: Tick = {
                t: data.T, // trade time
                p: Number(data.p), // price
                q: Number(data.q) // quantity
            }

            console.log(`[tick] ${streamName} t=${tick.t} p=${tick.p} q=${tick.q}`)

            const symbol = normalizeSymbol(streamName)
            const streamKey = `stream:ticks:${symbol}`

            await redis.xadd(
                streamKey,
                "*",
                "t", String(tick.t),
                "p", String(tick.p),
                "q", String(tick.q)
            );
        } catch (e) {
            console.error('Collector failed to process message', e)
        }
    })

    ws_connection.on("error", (err) => {
        console.error('Collector WebSocket error', err)
    })

    ws_connection.on("close", (code, reason) => {
        console.warn(
        `[collector] WebSocket closed code=${code} reason=${reason.toString()}`
        );
        setTimeout(startCollector, 5_000);
    });
}

startCollector()

