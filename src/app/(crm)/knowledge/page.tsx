import { KnowledgeScreen } from "@/components/crm/screens/KnowledgeScreen";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function KnowledgePage({ searchParams }: PageProps<"/knowledge">) {
  const params = await searchParams;
  const category = first(params.category);
  const policy = first(params.policy);
  return <KnowledgeScreen key={`${category}|${policy}`} category={category} policy={policy} />;
}
