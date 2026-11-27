import { NextResponse } from "next/server";
import { getCandlesForTicker, getStockByTicker } from "@/lib/market-data";
import { computeIndicatorSnapshot } from "@/lib/indicators";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  const rl = checkRateLimit(`stock:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  const { ticker } = await context.params;
  const url = new URL(request.url);
  const timeframe = url.searchParams.get("timeframe") ?? "30m";

  const [stock, candleList] = await Promise.all([
    getStockByTicker(ticker),
    getCandlesForTicker(ticker, timeframe),
  ]);

  if (!stock) {
    return NextResponse.json(
      { error: "السهم غير موجود في قاعدة البيانات بعد." },
      { status: 404 }
    );
  }

  const indicators = computeIndicatorSnapshot(candleList);

  return NextResponse.json({
    stock,
    timeframe,
    candles: candleList,
    indicators,
  });
}
