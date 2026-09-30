import { HistoryDetailScreen } from "@/components/crm/screens/HistoryDetailScreen";

export default async function HistoryDetailPage({ params, searchParams }: PageProps<"/history/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  return <HistoryDetailScreen id={id} saved={saved === "1"} />;
}
