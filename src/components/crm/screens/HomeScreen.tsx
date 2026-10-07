"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CrmAILabel,
  CrmAvatar,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmInlineAlert,
  CrmTable,
  CrmTabs,
  Icon,
} from "@/design-system";
import { fmtDate, fmtDateTime, fmtDuration, fmtToday, maskPhone } from "@/lib/crm/format";
import { LOW_CONFIDENCE, categoryLabel, intakeResult, setAgentStatus, startSession } from "@/lib/crm/operations";
import { useCrm } from "@/lib/crm/store";
import type { AgentStatus, QueueItem } from "@/lib/crm/types";
import {
  AICategoryBadge,
  APP_STARTED_AT,
  ConfirmedCategoryBadge,
  EmptyState,
  GradeBadge,
  LoadingScreen,
  PageHeader,
  STAGE_LABELS,
  STAGE_ROUTES,
  UrgencyBadge,
  useNow,
} from "../ui";

export function HomeScreen() {
  const router = useRouter();
  const state = useCrm();
  const now = useNow();
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  if (!state) return <LoadingScreen />;

  const { agent, agentStatus, queue, session, customers, history } = state;
  const available = agentStatus === "available";
  const next = queue[0];
  const nextCustomer = next ? customers[next.customerId] : undefined;
  const sessionForNext = session && next && session.queueId === next.id ? session : undefined;
  const intake = sessionForNext ? intakeResult(sessionForNext) : undefined;
  const nextOrders = next
    ? state.orders.filter((o) => o.customerId === next.customerId).sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
    : [];
  const nextPast = next ? history.filter((h) => h.customerId === next.customerId) : [];
  const waitOf = (q: QueueItem) => fmtDuration(q.waitSeconds + (now - APP_STARTED_AT) / 1000);

  const openConsult = () => {
    if (session) return router.push(STAGE_ROUTES[session.stage]);
    if (startSession()) router.push(STAGE_ROUTES.briefing);
  };

  const rows = queue.filter((q) => filter === "all" || q.urgency === "high");
  const recent = history.filter((h) => !h.seed).slice(0, 3);

  return (
    <div className="flex max-w-[1200px] flex-col gap-4 p-6">
      <PageHeader
        eyebrow={`${fmtToday(new Date(now))} · 커머스 1팀`}
        title={`안녕하세요, ${agent.name} 님`}
        actions={
          <>
            <CrmTabs
              variant="segmented"
              value={["available", "away", "break"].includes(agentStatus) ? agentStatus : ""}
              onChange={(id) => setAgentStatus(id as AgentStatus)}
              tabs={[
                { id: "available", label: "상담 가능" },
                { id: "away", label: "자리 비움" },
                { id: "break", label: "휴식" },
              ]}
            />
            {session ? (
              <CrmButton variant="primary" icon="PhoneCall" onClick={openConsult}>
                {STAGE_LABELS[session.stage]} 이어가기
              </CrmButton>
            ) : (
              <CrmButton variant="primary" icon="PhoneCall" disabled={!available || !next} onClick={openConsult}>
                상담 시작
              </CrmButton>
            )}
          </>
        }
      />

      {!available && !session && (
        <CrmInlineAlert
          tone="warning"
          icon={agentStatus === "break" ? "Coffee" : "Clock"}
          title={agentStatus === "break" ? "휴식 중입니다" : agentStatus === "away" ? "자리 비움 상태입니다" : "상담 가능 상태가 아닙니다"}
          actions={
            <CrmButton variant="link" size="sm" onClick={() => setAgentStatus("available")}>
              상담 가능으로 전환
            </CrmButton>
          }
        >
          새 상담이 배정되지 않습니다.
        </CrmInlineAlert>
      )}

      {/* 주요 영역: 다음 배정 고객 + 사전 브리핑 미리보기 / 보조 영역: 오늘 현황 */}
      <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-4">
        {next && nextCustomer ? (
          <CrmCard
            title="다음 배정 고객"
            icon="UserCheck"
            tone="info"
            badge={
              <CrmBadge tone="info" dot>
                {sessionForNext ? STAGE_LABELS[sessionForNext.stage] : "배정 확정"}
              </CrmBadge>
            }
            footer={
              <>
                <span className="mr-auto flex items-center gap-1.5 self-center text-xs text-gray-500">
                  <Icon name="Info" size={14} />
                  사전 브리핑에서 문의 유형을 확정한 뒤 고객을 연결합니다
                </span>
                <CrmButton
                  variant="primary"
                  size="lg"
                  iconRight="ArrowRight"
                  disabled={!session && !available}
                  onClick={openConsult}
                >
                  {sessionForNext ? `${STAGE_LABELS[sessionForNext.stage]} 이어가기` : "사전 브리핑 시작"}
                </CrmButton>
              </>
            }
          >
            <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center gap-3">
                  <CrmAvatar name={nextCustomer.name} size="lg" tone="blue" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-semibold">{nextCustomer.name}</span>
                      <GradeBadge grade={nextCustomer.grade} />
                      <UrgencyBadge level={next.urgency} />
                    </div>
                    <div className="text-[13px] text-gray-500">
                      {maskPhone(nextCustomer.phone)} · 대기 <span className="tabular-nums">{waitOf(next)}</span>
                    </div>
                  </div>
                </div>
                <dl className="m-0 grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-[13px]">
                  <dt className="text-gray-500">ARS 메뉴</dt>
                  <dd className="m-0 font-medium text-gray-900">{next.arsMenu}</dd>
                  <dt className="text-gray-500">최근 주문</dt>
                  <dd className="m-0 truncate font-medium text-gray-900">
                    {nextOrders[0] ? `${nextOrders[0].item} · ${nextOrders[0].status}` : "주문 없음"}
                  </dd>
                  <dt className="text-gray-500">이전 상담</dt>
                  <dd className="m-0 truncate font-medium text-gray-900">
                    {nextPast[0]
                      ? `${categoryLabel(nextPast[0].category)} · ${fmtDate(nextPast[0].startedAt)}${nextPast.length > 1 ? ` 외 ${nextPast.length - 1}건` : ""}`
                      : "없음"}
                  </dd>
                </dl>
                {nextCustomer.caution && (
                  <div className="flex items-start gap-1.5 rounded-md bg-(--warning-50) px-2.5 py-1.5 text-xs text-warning-700">
                    <Icon name="AlertTriangle" size={14} className="mt-0.5 flex-none" />
                    {nextCustomer.caution}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="text-xs font-semibold text-gray-500">사전 브리핑 · 접수 내용</div>
                {intake ? (
                  <div className="flex flex-col gap-2 rounded-md border border-teal-200 bg-teal-25 p-3">
                    <CrmAILabel text="AI 분류" confidence={Math.round(intake.confidence * 100)} />
                    {intake.keyRequest && <div className="text-[15px] font-semibold text-gray-900">{intake.keyRequest}</div>}
                    <AICategoryBadge category={intake.category} confidence={intake.confidence} />
                    {intake.confidence < LOW_CONFIDENCE && (
                      <div className="text-[13px] text-warning-700">신뢰도가 낮아 상담사가 유형을 직접 선택해야 합니다.</div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-[13px] text-gray-600">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                      <Icon name="MessageSquare" size={14} />
                      접수된 고객 발화 없음
                    </span>
                    자동 음성 접수 연동 전입니다. 사전 브리핑에서 문의 유형을 직접 선택하거나 데모 음성 입력으로 시연할 수 있습니다.
                  </div>
                )}
                {sessionForNext?.category && (
                  <div>
                    <ConfirmedCategoryBadge category={sessionForNext.category} source={sessionForNext.categorySource} />
                  </div>
                )}
              </div>
            </div>
          </CrmCard>
        ) : (
          <CrmCard>
            <EmptyState icon="Coffee" title="대기 중인 고객이 없습니다">
              새 고객이 배정되면 여기에 표시됩니다.
            </EmptyState>
          </CrmCard>
        )}

        {/* 보조 정보: 시각적 비중을 낮추고 경고색·압박 표현을 쓰지 않습니다 */}
        <CrmCard title="오늘 현황" icon="BarChart2">
          <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
            <div>
              <div className="flex justify-between">
                <dt className="text-gray-500">처리</dt>
                <dd className="m-0 tabular-nums text-gray-700">
                  {agent.handledToday}건 <span className="text-gray-400">/ 목표 {agent.target}건</span>
                </dd>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-400"
                  style={{ width: `${Math.min(100, (agent.handledToday / agent.target) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">평균 처리시간</dt>
              <dd className="m-0 tabular-nums text-gray-700">
                6:42 <span className="text-gray-400">· 팀 평균 7:15</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">첫 통화 해결률</dt>
              <dd className="m-0 tabular-nums text-gray-700">
                91% <span className="text-gray-400">· 최근 7일</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">대기 고객</dt>
              <dd className="m-0 tabular-nums text-gray-700">{queue.length}명</dd>
            </div>
          </dl>
        </CrmCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-4">
        <CrmCard
          title="대기 고객"
          icon="List"
          subtitle={`${queue.length}명 대기 · 배정 순서대로 상담합니다`}
          flush
          actions={
            <CrmTabs
              variant="segmented"
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: "전체" },
                { id: "urgent", label: "긴급", count: queue.filter((q) => q.urgency === "high").length },
              ]}
            />
          }
        >
          {notice && (
            <CrmInlineAlert tone="info" onClose={() => setNotice(null)} style={{ margin: 12 }}>
              {notice}
            </CrmInlineAlert>
          )}
          <CrmTable
            rows={rows}
            selectedId={next?.id}
            emptyText="조건에 맞는 대기 고객이 없습니다."
            onRowClick={(r: QueueItem) => {
              if (r.id === next?.id) {
                if (session || available) openConsult();
                else setNotice("상담 가능 상태로 바꾸면 다음 고객 브리핑을 시작할 수 있습니다.");
              } else {
                setNotice(`배정 순서대로 상담합니다. 다음 고객은 ${nextCustomer?.name} 님입니다.`);
              }
            }}
            columns={[
              {
                key: "name",
                label: "고객",
                strong: true,
                render: (r: QueueItem) => (
                  <span className="flex items-center gap-2">
                    {customers[r.customerId].name}
                    {r.id === next?.id && (
                      <CrmBadge tone="info" square>
                        다음
                      </CrmBadge>
                    )}
                  </span>
                ),
              },
              { key: "grade", label: "등급", render: (r: QueueItem) => <GradeBadge grade={customers[r.customerId].grade} /> },
              { key: "ars", label: "ARS 선택 메뉴", render: (r: QueueItem) => r.arsMenu },
              {
                key: "ai",
                label: "AI 분류 문의",
                render: (r: QueueItem) => {
                  const res = session?.queueId === r.id ? intakeResult(session) : undefined;
                  return res ? (
                    <AICategoryBadge category={res.category} confidence={res.confidence} />
                  ) : (
                    <span className="text-[13px] text-gray-400">접수 내용 없음</span>
                  );
                },
              },
              { key: "urgency", label: "긴급도", render: (r: QueueItem) => <UrgencyBadge level={r.urgency} /> },
              {
                key: "wait",
                label: "대기시간",
                align: "right",
                render: (r: QueueItem) => <span className="tabular-nums text-gray-600">{waitOf(r)}</span>,
              },
            ]}
          />
        </CrmCard>

        <CrmCard
          title="오늘 저장한 상담"
          icon="Clock"
          actions={
            <Link href="/history" className="crm-btn link sm">
              전체 이력
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div className="text-[13px] text-gray-500">아직 저장한 상담이 없습니다. 후처리를 저장하면 여기에 표시됩니다.</div>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {recent.map((h) => (
                <li key={h.id} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/history/${h.id}`}
                    className="flex items-center gap-3 py-2 text-sm text-gray-700 hover:no-underline"
                  >
                    <span className="w-16 font-semibold text-gray-900">{customers[h.customerId]?.name}</span>
                    <CrmBadge tone="info">{categoryLabel(h.category)}</CrmBadge>
                    <span className="min-w-0 flex-1 truncate text-gray-600">{h.summary.request}</span>
                    <span className="whitespace-nowrap text-xs text-gray-400">{fmtDateTime(h.startedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CrmCard>
      </div>
    </div>
  );
}
