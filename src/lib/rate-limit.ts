import type { NextRequest } from "next/server";

// 공개 데모에서 API 키 사용량이 몰리지 않도록 IP별 요청 수를 제한합니다.
// 서버 프로세스 메모리에만 두므로 인스턴스가 여러 개면 인스턴스마다 따로 셉니다.
const hits = new Map<string, number[]>();

export function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** windowMs 안에 limit번을 넘으면 false */
export function allowRequest(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // 오래된 키가 쌓이지 않게 가끔 정리합니다.
  if (hits.size > 5000) {
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}
