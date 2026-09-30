import { HistoryScreen } from "@/components/crm/screens/HistoryScreen";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const filter = first(params.filter) ?? "all";
  // 상단 검색이나 알림으로 다시 들어오면 새 조건으로 초기화합니다.
  return <HistoryScreen key={`${q}|${filter}`} initialQuery={q} initialFilter={filter} />;
}
