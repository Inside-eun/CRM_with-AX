"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CrmAppShell, Icon } from "@/design-system";
import { setAgentStatus } from "@/lib/crm/operations";
import { resetCrm, useCrm } from "@/lib/crm/store";
import type { AgentStatus } from "@/lib/crm/types";
import { STAGE_ROUTES } from "./ui";

function activeNav(pathname: string) {
  if (pathname.startsWith("/consult")) return "consult";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/knowledge")) return "knowledge";
  return "home";
}

function ResetDemoButton() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className="crm-nav-item text-[13px]"
      onClick={() => {
        if (!armed) return setArmed(true);
        resetCrm();
        setArmed(false);
        router.push("/");
      }}
      onBlur={() => setArmed(false)}
    >
      <Icon name="RefreshCw" size={18} style={{ color: armed ? "var(--warning-400)" : "var(--gray-400)" }} />
      <span className="flex-1">{armed ? "한 번 더 누르면 초기화합니다" : "데모 데이터 초기화"}</span>
    </button>
  );
}

export function CrmShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const state = useCrm();
  const session = state?.session;

  const pendingFollowups =
    state?.history.reduce((n, h) => n + h.followups.filter((f) => !f.done).length, 0) ?? 0;

  const navItems = [
    { id: "home", label: "상담 홈", icon: "Headphones", badge: state?.queue.length },
    ...(session ? [{ id: "consult", label: "진행 중 상담", icon: "PhoneCall" }] : []),
    { id: "history", label: "상담 이력", icon: "Clock", badge: pendingFollowups || undefined },
    { id: "knowledge", label: "지식·매뉴얼", icon: "BookOpen" },
  ];

  const routes: Record<string, string> = {
    home: "/",
    consult: session ? STAGE_ROUTES[session.stage] : "/",
    history: "/history",
    knowledge: "/knowledge",
  };

  return (
    <CrmAppShell
      active={activeNav(pathname)}
      onNavigate={(id) => router.push(routes[id] ?? "/")}
      navItems={navItems}
      navFooter={
        <div className="flex flex-col gap-1 border-t border-gray-800 pt-3">
          <ResetDemoButton />
        </div>
      }
      topBarProps={{
        status: state?.agentStatus ?? "available",
        onStatusChange: (id: string) => setAgentStatus(id as AgentStatus),
        notifications: pendingFollowups,
        onNotificationsClick: () => router.push("/history?filter=followup"),
        onSearch: (q: string) => router.push(q ? `/history?q=${encodeURIComponent(q)}` : "/history"),
        agentName: state?.agent.name ?? "김하늘",
        agentRole: state?.agent.role ?? "상담사 · 커머스 1팀",
      }}
    >
      {children}
    </CrmAppShell>
  );
}
