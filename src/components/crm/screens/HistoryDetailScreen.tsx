"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CrmAILabel,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmChecklist,
  CrmInlineAlert,
  CrmKeyValue,
  CrmTimeline,
  Icon,
} from "@/design-system";
import { fmtDate, fmtDateTime, fmtDuration, fmtShortDate, fmtTime, fmtWon, maskPhone } from "@/lib/crm/format";
import { categoryLabel, startSession, toggleHistoryFollowup } from "@/lib/crm/operations";
import { ACTIONS } from "@/lib/crm/playbooks";
import { useCrm } from "@/lib/crm/store";
import type { SummaryFields } from "@/lib/crm/types";
import { Bubble, EmptyState, GradeBadge, HomeLinkButton, LoadingScreen, MiniLabel, PageHeader, STAGE_ROUTES } from "../ui";

const FIELDS: { id: keyof SummaryFields; label: string }[] = [
  { id: "request", label: "고객 요청사항" },
  { id: "told", label: "상담사가 안내한 내용" },
  { id: "result", label: "실제 처리 결과" },
];

export function HistoryDetailScreen({ id, saved }: { id: string; saved: boolean }) {
  const router = useRouter();
  const state = useCrm();
  const [showDraft, setShowDraft] = useState(false);

  if (!state) return <LoadingScreen />;
  const h = state.history.find((x) => x.id === id);
  if (!h) {
    return (
      <div className="p-6">
        <CrmCard>
          <EmptyState
            icon="Search"
            title="상담 이력을 찾을 수 없습니다"
            action={
              <Link href="/history" className="crm-btn secondary md">
                상담 이력으로
              </Link>
            }
          >
            삭제되었거나 다른 브라우저에서 저장한 기록입니다. 상담 기록은 현재 이 브라우저에만 저장됩니다.
          </EmptyState>
        </CrmCard>
      </div>
    );
  }

  const c = state.customers[h.customerId];
  const order = h.orderNo ? state.orders.find((o) => o.no === h.orderNo) : undefined;
  const next = state.queue[0];
  const nextCustomer = next ? state.customers[next.customerId] : undefined;
  const canStartNext = !!next && !state.session && state.agentStatus === "available";

  return (
    <div className="flex flex-col gap-4 p-6">
      {saved && (
        <CrmInlineAlert
          tone="success"
          title="상담 기록을 저장했습니다"
          actions={
            state.session ? (
              <CrmButton variant="link" size="sm" onClick={() => router.push(STAGE_ROUTES[state.session!.stage])}>
                진행 중인 상담으로
              </CrmButton>
            ) : next ? (
              <>
                <CrmButton
                  variant="link"
                  size="sm"
                  disabled={!canStartNext}
                  onClick={() => startSession() && router.push(STAGE_ROUTES.briefing)}
                >
                  다음 고객({nextCustomer?.name}) 사전 브리핑
                </CrmButton>
                <HomeLinkButton label="상담 홈" />
              </>
            ) : (
              <HomeLinkButton label="상담 홈" />
            )
          }
        >
          {h.editedFields.length ? `AI 요약 ${h.editedFields.length}개 항목을 수정해 저장했습니다.` : "요약을 수정 없이 저장했습니다."}{" "}
          남은 후속 조치 {h.followups.filter((f) => !f.done).length}건.
          {!canStartNext && next && !state.session && " 다음 상담을 시작하려면 상태를 상담 가능으로 바꾸세요."}
        </CrmInlineAlert>
      )}

      <PageHeader
        eyebrow={
          <>
            <Link href="/history">상담 이력</Link>
            <Icon name="ChevronRight" size={14} />
            상세
          </>
        }
        title={`${c?.name ?? "고객"} 고객 상담`}
        meta={`${fmtDateTime(h.startedAt)} · 통화 ${fmtDuration(h.durationSec)} · 상담사 ${h.agent}`}
      >
        {c && <GradeBadge grade={c.grade} />}
        <CrmBadge tone="info" icon="Tag">
          {categoryLabel(h.category)}
        </CrmBadge>
        {h.verified ? (
          <CrmBadge tone="success" icon="Shield">
            본인 확인
          </CrmBadge>
        ) : (
          <CrmBadge tone="warning" icon="Lock">
            본인 확인 안 됨
          </CrmBadge>
        )}
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <CrmCard
            title="상담 요약"
            icon="FileText"
            badge={
              h.seed ? undefined : h.draftSource === "ai" ? (
                <CrmBadge tone="info" icon="CheckCircle">
                  AI 초안 · 상담사 검토
                </CrmBadge>
              ) : (
                <CrmBadge tone="neutral">기록 기반 초안 · 상담사 검토</CrmBadge>
              )
            }
            actions={
              h.aiDraft && h.editedFields.length > 0 ? (
                <CrmButton size="xs" variant="tertiary" icon={showDraft ? "EyeOff" : "Eye"} onClick={() => setShowDraft((v) => !v)}>
                  {showDraft ? "AI 초안 숨기기" : "AI 초안과 비교"}
                </CrmButton>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4">
              {FIELDS.map(({ id, label }) => {
                const edited = h.editedFields.includes(id);
                return (
                  <div key={id}>
                    <MiniLabel className="flex items-center gap-2">
                      {label}
                      {edited && (
                        <CrmBadge tone="warning" icon="Edit2">
                          상담사 수정
                        </CrmBadge>
                      )}
                    </MiniLabel>
                    <div className="whitespace-pre-wrap text-sm leading-[22px] text-gray-800">{h.summary[id]}</div>
                    {showDraft && edited && h.aiDraft && (
                      <div className="mt-2 rounded-md border border-teal-200 bg-teal-25 p-2.5">
                        <CrmAILabel text="AI 초안 원문" />
                        <div className="mt-1 whitespace-pre-wrap text-[13px] text-gray-600">{h.aiDraft[id]}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {h.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {h.tags.map((t) => (
                    <CrmBadge key={t}>{t}</CrmBadge>
                  ))}
                </div>
              )}
            </div>
          </CrmCard>

          {!h.seed && (
            <CrmCard title="음성 접수 · AI 분류" icon="Mic">
              {h.intakeTranscript ? (
                <div className="flex flex-col gap-3">
                  <Bubble who="intake" text={h.intakeTranscript} />
                  {h.aiCategory && h.aiConfidence != null && (
                    <div className="flex flex-col gap-2 rounded-md border border-teal-200 bg-teal-25 p-3">
                      <CrmAILabel text={`AI 분류 ${categoryLabel(h.aiCategory)}`} confidence={Math.round(h.aiConfidence * 100)} />
                      {h.keyRequest && <div className="text-sm font-semibold text-gray-900">{h.keyRequest}</div>}
                      <div className="text-xs text-gray-600">
                        상담사 확정: {categoryLabel(h.category)}
                        {h.aiCategory !== h.category
                          ? " · AI 분류와 다른 유형으로 확정"
                          : h.categorySource === "ai"
                            ? " · AI 제안을 확인 후 확정"
                            : " · 상담사가 직접 선택"}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[13px] text-gray-500">음성 접수 원문 없이 진행한 상담입니다. 문의 유형은 상담사가 직접 선택했습니다.</div>
              )}
              {h.transcripts.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4">
                  <MiniLabel className="mb-0">통화 중 음성 인식</MiniLabel>
                  {h.transcripts.map((t) => (
                    <Bubble key={t.id} who="call" time={fmtTime(t.at)} text={t.text} />
                  ))}
                </div>
              )}
            </CrmCard>
          )}

          {h.memo && (
            <CrmCard title="상담 메모" icon="Edit3">
              <pre className="m-0 whitespace-pre-wrap font-sans text-[13px] leading-5 text-gray-700">{h.memo}</pre>
            </CrmCard>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <CrmCard title="고객 · 주문" icon="User">
            <CrmKeyValue
              labelWidth={80}
              items={[
                { label: "고객", value: c ? `${c.name} (${c.id})` : h.customerId },
                { label: "휴대폰", value: c ? maskPhone(c.phone) : "-" },
                ...(order
                  ? [
                      { label: "관련 주문", value: `${order.item} · ${order.option}` },
                      { label: "주문번호", value: order.no, mono: true },
                      { label: "금액", value: fmtWon(order.price) },
                      { label: "현재 상태", value: order.status },
                    ]
                  : [{ label: "관련 주문", value: "없음" }]),
              ]}
            />
          </CrmCard>

          <CrmCard title="처리 내역" icon="List" subtitle={`${h.actions.length}건`}>
            {h.actions.length ? (
              <CrmTimeline
                compact
                items={h.actions.map((a) => ({
                  title: a.label,
                  meta: fmtTime(a.at),
                  desc: [a.receiptNo && `접수번호 ${a.receiptNo}`, a.detail].filter(Boolean).join(" · "),
                  icon: ACTIONS[a.actionId].icon,
                  tone: ACTIONS[a.actionId].consent ? "info" : "neutral",
                }))}
              />
            ) : (
              <div className="text-[13px] text-gray-500">실행한 처리 기능이 없습니다.</div>
            )}
            {h.notices.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <MiniLabel>필수 안내 완료</MiniLabel>
                <div className="flex flex-wrap gap-1.5">
                  {h.notices.map((n) => (
                    <CrmBadge key={n} tone="success" icon="Check">
                      {n}
                    </CrmBadge>
                  ))}
                </div>
              </div>
            )}
          </CrmCard>

          <CrmCard title="후속 조치" icon="CheckSquare">
            {h.followups.length ? (
              <CrmChecklist
                items={h.followups.map((f) => ({
                  id: f.id,
                  label: f.label,
                  hint: f.hint,
                  status: f.done ? "done" : "todo",
                  statusLabel: f.done ? "완료" : "예정",
                }))}
                onToggle={(it) => toggleHistoryFollowup(h.id, it.id)}
              />
            ) : (
              <div className="text-[13px] text-gray-500">후속 조치가 없습니다.</div>
            )}
            {(h.transfer || h.recontactDate) && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <CrmKeyValue
                  labelWidth={80}
                  items={[
                    ...(h.transfer ? [{ label: "이관 부서", value: h.transfer }] : []),
                    ...(h.recontactDate ? [{ label: "재연락", value: `${fmtShortDate(h.recontactDate)} 예정` }] : []),
                  ]}
                />
              </div>
            )}
          </CrmCard>

          {c && (
            <CrmCard title="이 고객의 다른 상담" icon="Clock">
              {(() => {
                const others = state.history.filter((x) => x.customerId === c.id && x.id !== h.id);
                return others.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {others.map((o) => (
                      <li key={o.id}>
                        <Link href={`/history/${o.id}`} className="flex gap-2 text-[13px]">
                          <span className="text-gray-500">{fmtDate(o.startedAt)}</span>
                          {categoryLabel(o.category)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[13px] text-gray-500">다른 상담 이력이 없습니다.</div>
                );
              })()}
            </CrmCard>
          )}
        </div>
      </div>
    </div>
  );
}
