"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CrmBadge, CrmCard, CrmInput, CrmSelect, CrmTable, CrmTabs, Icon } from "@/design-system";
import { CATEGORIES } from "@/lib/categories";
import { calendarDaysBetween, fmtDateTime, fmtDuration } from "@/lib/crm/format";
import { categoryLabel } from "@/lib/crm/operations";
import { useCrm } from "@/lib/crm/store";
import type { CrmState, HistoryRecord } from "@/lib/crm/types";
import { GradeBadge, LoadingScreen, PageHeader } from "../ui";

function matches(state: CrmState, h: HistoryRecord, q: string) {
  if (!q) return true;
  const c = state.customers[h.customerId];
  const digits = q.replace(/\D/g, "");
  const haystack = [
    c?.name,
    categoryLabel(h.category),
    h.orderNo,
    h.summary.request,
    h.summary.told,
    h.summary.result,
    ...h.actions.map((a) => a.receiptNo),
    ...h.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q.toLowerCase())) return true;
  return digits.length >= 4 && !!c && (c.phone.replace(/\D/g, "").includes(digits) || (h.orderNo ?? "").replace(/\D/g, "").includes(digits));
}

export function HistoryScreen({ initialQuery = "", initialFilter = "all" }: { initialQuery?: string; initialFilter?: string }) {
  const router = useRouter();
  const state = useCrm();
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState(initialFilter);

  if (!state) return <LoadingScreen />;

  const pendingOf = (h: HistoryRecord) => h.followups.filter((f) => !f.done).length;
  const rows = state.history.filter(
    (h) =>
      matches(state, h, q.trim()) &&
      (!cat || h.category === cat) &&
      (filter === "all" ||
        (filter === "followup" && pendingOf(h) > 0) ||
        (filter === "today" && calendarDaysBetween(h.startedAt) === 0)),
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="상담 이력" meta={`전체 ${state.history.length}건 · 조건에 맞는 상담 ${rows.length}건`} />

      <CrmCard flush>
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 p-4">
          <CrmInput
            label="검색"
            icon="Search"
            placeholder="고객명, 휴대폰 번호, 주문번호, 접수번호, 요약 내용"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 380 }}
          />
          <CrmSelect
            label="문의 유형"
            value={cat}
            placeholder="전체 유형"
            onChange={(e) => setCat(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
            style={{ width: 180 }}
          />
          <div className="flex-1" />
          <CrmTabs
            variant="segmented"
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "전체" },
              { id: "today", label: "오늘" },
              { id: "followup", label: "후속 조치 남음", count: state.history.filter((h) => pendingOf(h) > 0).length },
            ]}
          />
        </div>
        <CrmTable
          rows={rows}
          emptyText="조건에 맞는 상담 이력이 없습니다."
          onRowClick={(h: HistoryRecord) => router.push(`/history/${h.id}`)}
          columns={[
            {
              key: "date",
              label: "상담 일시",
              width: 150,
              render: (h: HistoryRecord) => <span className="tabular-nums">{fmtDateTime(h.startedAt)}</span>,
            },
            {
              key: "customer",
              label: "고객",
              strong: true,
              render: (h: HistoryRecord) => {
                const c = state.customers[h.customerId];
                return (
                  <span className="flex items-center gap-2">
                    {c?.name}
                    {c && <GradeBadge grade={c.grade} />}
                  </span>
                );
              },
            },
            {
              key: "category",
              label: "문의 유형",
              render: (h: HistoryRecord) => (
                <span className="flex flex-col items-start gap-0.5">
                  <CrmBadge tone="info">{categoryLabel(h.category)}</CrmBadge>
                  {h.aiCategory && (
                    <span className="text-[11px] text-gray-500">
                      AI 분류 {categoryLabel(h.aiCategory)}
                      {h.aiCategory !== h.category && " → 상담사 변경"}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "summary",
              label: "고객 요청",
              render: (h: HistoryRecord) => <span className="line-clamp-2 max-w-90">{h.summary.request}</span>,
            },
            {
              key: "actions",
              label: "처리",
              render: (h: HistoryRecord) =>
                h.actions.length ? (
                  <span className="text-[13px]">{h.actions.map((a) => a.label).join(", ")}</span>
                ) : (
                  <span className="text-[13px] text-gray-400">없음</span>
                ),
            },
            {
              key: "followups",
              label: "후속 조치",
              render: (h: HistoryRecord) => {
                const n = pendingOf(h);
                if (!h.followups.length) return <span className="text-[13px] text-gray-400">없음</span>;
                return n ? (
                  <CrmBadge tone="warning" icon="Clock">
                    {n}건 남음
                  </CrmBadge>
                ) : (
                  <CrmBadge tone="success" icon="Check">
                    완료
                  </CrmBadge>
                );
              },
            },
            { key: "agent", label: "상담사", render: (h: HistoryRecord) => h.agent },
            {
              key: "duration",
              label: "통화",
              align: "right",
              render: (h: HistoryRecord) => (
                <span className="flex items-center justify-end gap-1 tabular-nums">
                  <Icon name="Phone" size={12} style={{ color: "var(--gray-400)" }} />
                  {fmtDuration(h.durationSec)}
                </span>
              ),
            },
          ]}
        />
      </CrmCard>
    </div>
  );
}
