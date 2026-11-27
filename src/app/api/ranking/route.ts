import { NextResponse } from "next/server";
import { getCandlesForTicker, listStocks } from "@/lib/market-data";
import { DEFAULT_RANKING_WEIGHTS, RankingWeights, rankStocks } from "@/lib/ranking";
import { StrategyKey } from "@/lib/backtest";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rl = checkRateLimit(`ranking:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const weights: RankingWeights = {
      winRateWeight: Number(body.winRateWeight ?? DEFAULT_RANKING_WEIGHTS.winRateWeight),
      avgReturnWeight: Number(body.avgReturnWeight ?? DEFAULT_RANKING_WEIGHTS.avgReturnWeight),
      drawdownWeight: Number(body.drawdownWeight ?? DEFAULT_RANKING_WEIGHTS.drawdownWeight),
      volumeWeight: Number(body.volumeWeight ?? DEFAULT_RANKING_WEIGHTS.volumeWeight),
    };
    const strategy = (body.strategy as StrategyKey) ?? "sma_crossover";

    const allStocks = await listStocks();
    const withCandles = await Promise.all(
      allStocks.map(async (s) => ({
        ticker: s.ticker,
        nameAr: s.nameAr,
        lastPrice: s.lastPrice,
        candles: await getCandlesForTicker(s.ticker, "30m"),
      }))
    );

    const ranked = rankStocks(withCandles, weights, { strategy });
    return NextResponse.json({
      strategy,
      weights,
      items: ranked,
      totalEvaluated: allStocks.length,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذّر حساب الترتيب التاريخي." },
      { status: 500 }
    );
  }
}
