import { NextResponse } from "next/server";
import { getCandlesForTicker, getStockByTicker } from "@/lib/market-data";
import { BacktestConfig, StrategyKey, runBacktest } from "@/lib/backtest";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_STRATEGIES: StrategyKey[] = [
  "sma_crossover",
  "rsi_oversold",
  "macd_crossover",
  "bollinger_reversion",
];

export async function POST(request: Request) {
  const rl = checkRateLimit(`backtest:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ticker = String(body.ticker ?? "").trim().toUpperCase();
    const strategy = String(body.strategy ?? "sma_crossover") as StrategyKey;
    const timeframe = String(body.timeframe ?? "30m");

    if (!ticker || !ALLOWED_STRATEGIES.includes(strategy)) {
      return NextResponse.json(
        { error: "بيانات الاختبار غير صالحة." },
        { status: 400 }
      );
    }

    const [stock, candleList] = await Promise.all([
      getStockByTicker(ticker),
      getCandlesForTicker(ticker, timeframe),
    ]);

    if (!stock || candleList.length < 5) {
      return NextResponse.json(
        {
          error:
            "لا توجد شموع تاريخية كافية لهذا السهم في قاعدة البيانات حالياً لإجراء الاختبار.",
          candleCount: candleList.length,
        },
        { status: 422 }
      );
    }

    const config: BacktestConfig = {
      strategy,
      fastPeriod: Number(body.fastPeriod) || 10,
      slowPeriod: Number(body.slowPeriod) || 25,
      rsiPeriod: Number(body.rsiPeriod) || 14,
      rsiBuyBelow: Number(body.rsiBuyBelow) || 30,
      rsiSellAbove: Number(body.rsiSellAbove) || 70,
      commissionPct: body.commissionPct ? Number(body.commissionPct) : 0,
      feeFixed: body.feeFixed ? Number(body.feeFixed) : 0,
    };

    const result = runBacktest(candleList, config);

    return NextResponse.json({
      ticker,
      stockName: stock.nameAr,
      candleCount: candleList.length,
      result,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذّر تشغيل الاختبار التاريخي." },
      { status: 500 }
    );
  }
}
