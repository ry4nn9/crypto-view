export type Timeframe = "1m" | "5m" | "1h";

export type Tick = {
  t: number;
  p: number;
  q: number;
};

// add Candle etc here too
export type Candle = {
  symbol: string;
  tf: Timeframe;
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  final: boolean;
};