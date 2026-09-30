import { CrmShell } from "@/components/crm/CrmShell";

export default function CrmLayout({ children }: LayoutProps<"/">) {
  return <CrmShell>{children}</CrmShell>;
}
