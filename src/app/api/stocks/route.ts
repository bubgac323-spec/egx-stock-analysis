import { NextResponse } from "next/server";
import { getMarketStatus, listStocks } from "@/lib/market-data";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rl = checkRateLimit(`stocks:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  const [items, status] = await Promise.all([listStocks(), getMarketStatus()]);
  return NextResponse.json({
    stocks: items,
    status,
  });
}
