"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CrmAILabel,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmCheckbox,
  CrmChecklist,
  CrmInlineAlert,
  CrmInput,
  CrmKeyValue,
  CrmSelect,
  CrmSkeleton,
  CrmTextarea,
  Icon,
} from "@/design-system";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { fmtDuration, uid } from "@/lib/crm/format";
import {
  LOW_CONFIDENCE,
  buildRecordDraft,
  buildSummaryInput,
  callSeconds,
  categoryLabel,
  confirmCategory,
  intakeResult,
  saveWrapup,
  sessionOrder,
  updateWrapup,
  wrapupValues,
} from "@/lib/crm/operations";
import { TRANSFER_DEPTS, playbookFor } from "@/lib/crm/playbooks";
import { readCrm } from "@/lib/crm/store";
import type { CrmState, Session, SummaryFields } from "@/lib/crm/types";
import { ConsultGuard } from "../ConsultGuard";
import { MiniLabel, PageHeader } from "../ui";

const FIELDS: { id: keyof SummaryFields; label: string }[] = [
  { id: "request", label: "고객 요청사항" },
  { id: "told", label: "상담사가 안내한 내용" },
  { id: "result", label: "실제 처리 결과" },
];

async function fetchSummary(): Promise<SummaryFields> {
  const state = readCrm();
  if (!state?.session) throw new Error("진행 중인 상담이 없습니다.");
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSummaryInput(state)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요약 생성 중 오류가 발생했습니다.");
  return data as SummaryFields;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");

export function WrapUpScreen() {
  return <ConsultGuard stage="wrapup">{(ctx) => <WrapUp {...ctx} />}</ConsultGuard>;
}

function WrapUp({ state, session }: { state: CrmState; session: Session }) {
  const router = useRouter();
  const w = session.wrapup!;
  const customer = state.customers[session.customerId];
  const order = sessionOrder(state);
  const intake = intakeResult(session);
  const playbook = playbookFor(session, order);
  const values = wrapupValues(w);
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFollowup, setNewFollowup] = useState("");
  const requested = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // 후처리에 들어오면 AI 요약 초안을 한 번 요청합니다. 실패하면 상담 기록으로 초안을 만듭니다.
  const hasDraft = !!w.draft;
  useEffect(() => {
    if (hasDraft || requested.current) return;
    requested.current = true;
    fetchSummary()
      .then((draft) => updateWrapup((x) => ({ ...x, draft, draftSource: "ai", draftError: undefined, values: draft })))
      .catch((err) => {
        const st = readCrm();
        if (!st?.session) return;
        const record = buildRecordDraft(st);
        updateWrapup((x) => ({ ...x, draft: record, draftSource: "record", draftError: errorMessage(err), values: record }));
      });
  }, [hasDraft]);

  const retry = async () => {
    setRetrying(true);
    try {
      const draft = await fetchSummary();
      // 상담사가 이미 고친 항목은 유지하고, 고치지 않은 항목만 AI 초안으로 바꿉니다.
      updateWrapup((x) => {
        const cur = wrapupValues(x);
        const merged = Object.fromEntries(
          FIELDS.map(({ id }) => [id, x.draft && cur[id] !== x.draft[id] ? cur[id] : draft[id]]),
        ) as SummaryFields;
        return { ...x, draft, draftSource: "ai", draftError: undefined, values: merged };
      });
    } catch (err) {
      updateWrapup((x) => ({ ...x, draftError: errorMessage(err) }));
    } finally {
      setRetrying(false);
    }
  };

  const edited = w.draft ? FIELDS.filter(({ id }) => values[id] !== w.draft![id]).length : 0;
  const emptyField = FIELDS.some(({ id }) => !values[id].trim());
  const canSave = !!w.draft && w.reviewed && !emptyField && !saving;
  const isAI = w.draftSource === "ai";

  const save = () => {
    setSaving(true);
    timerRef.current = setTimeout(() => {
      const id = saveWrapup();
      if (id) router.push(`/history/${id}?saved=1`);
    }, 700);
  };

  const told = playbook.notices.filter((n) => session.notices.includes(n.id)).length;

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        eyebrow={
          <>
            <Icon name="PhoneOff" size={14} />
            통화 종료 · {fmtDuration(callSeconds(session))} · {customer.name} 고객
          </>
        }
        title="상담 후처리"
        meta="AI 요약을 확인하고 필요한 부분만 수정한 뒤 저장하세요. 저장 전까지 상담 기록은 확정되지 않습니다."
        actions={
          <CrmButton variant="primary" icon="Save" loading={saving} disabled={!canSave} onClick={save}>
            검토 완료 · 저장
          </CrmButton>
        }
      >
        <CrmBadge tone="info" icon="Edit3">
          후처리 중
        </CrmBadge>
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-4">
        {!w.draft ? (
          <CrmCard title="AI 상담 요약" icon="Cpu" tone="ai" badge={<CrmAILabel text="AI 초안" />}>
            <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-600" aria-live="polite">
              <Icon name="Loader" size={16} className="crm-spin" />
              AI가 음성 접수 원문, 상담 메모, 처리 기록을 요약하는 중입니다.
            </div>
            <CrmSkeleton lines={6} />
          </CrmCard>
        ) : (
          <CrmCard
            title="상담 요약"
            icon={isAI ? "Cpu" : "FileText"}
            tone={isAI ? "ai" : undefined}
            badge={
              isAI ? (
                <CrmAILabel text="AI 초안" />
              ) : (
                <CrmBadge tone="neutral" icon="FileText">
                  기록 기반 초안 · AI 아님
                </CrmBadge>
              )
            }
            actions={
              <CrmBadge tone={edited ? "warning" : "neutral"} icon={edited ? "Edit2" : "Minus"}>
                {edited ? `상담사 수정 ${edited}건` : "수정 없음"}
              </CrmBadge>
            }
          >
            <div className="flex flex-col gap-4">
              {!isAI && (
                <CrmInlineAlert
                  tone="warning"
                  title="AI 요약을 만들지 못했습니다"
                  actions={
                    <CrmButton size="sm" variant="ai" icon="RefreshCw" loading={retrying} onClick={retry}>
                      AI 요약 다시 요청
                    </CrmButton>
                  }
                >
                  {w.draftError} 상담 기록으로 만든 초안을 넣었습니다. 내용을 확인하고 수정하세요.
                </CrmInlineAlert>
              )}
              {FIELDS.map(({ id, label }) => {
                const changed = values[id] !== w.draft![id];
                return (
                  <CrmTextarea
                    key={id}
                    label={label}
                    rows={3}
                    ai={isAI && !changed}
                    value={values[id]}
                    error={!values[id].trim() ? "내용을 입력하세요." : undefined}
                    onChange={(e) => updateWrapup((x) => ({ ...x, values: { ...wrapupValues(x), [id]: e.target.value } }))}
                    headerRight={
                      changed ? (
                        <span className="flex items-center gap-2">
                          <CrmBadge tone="warning" icon="Edit2">
                            수정됨
                          </CrmBadge>
                          <CrmButton
                            variant="link"
                            size="xs"
                            onClick={() => updateWrapup((x) => ({ ...x, values: { ...wrapupValues(x), [id]: x.draft![id] } }))}
                          >
                            {isAI ? "AI 원문 복원" : "초안 복원"}
                          </CrmButton>
                        </span>
                      ) : isAI ? (
                        <CrmBadge tone="ai" icon="Cpu">
                          AI 작성
                        </CrmBadge>
                      ) : (
                        <CrmBadge tone="neutral">기록 기반</CrmBadge>
                      )
                    }
                  />
                );
              })}

              <div>
                <MiniLabel>후속 조치</MiniLabel>
                {w.followups.length === 0 ? (
                  <div className="mb-2 text-[13px] text-gray-500">등록된 후속 조치가 없습니다.</div>
                ) : (
                  <CrmChecklist
                    items={w.followups.map((f) => ({
                      id: f.id,
                      label: f.label,
                      hint: f.hint,
                      status: f.done ? "done" : "todo",
                      statusLabel: f.done ? "완료" : "예정",
                    }))}
                    onToggle={(it) =>
                      updateWrapup((x) => ({
                        ...x,
                        followups: x.followups.map((f) => (f.id === it.id ? { ...f, done: !f.done } : f)),
                      }))
                    }
                  />
                )}
                <form
                  className="mt-2 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const label = newFollowup.trim();
                    if (!label) return;
                    updateWrapup((x) => ({ ...x, followups: [...x.followups, { id: uid("F"), label, done: false }] }));
                    setNewFollowup("");
                  }}
                >
                  <CrmInput
                    size="sm"
                    placeholder="후속 조치 직접 추가"
                    value={newFollowup}
                    onChange={(e) => setNewFollowup(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <CrmButton type="submit" size="sm" icon="Plus" disabled={!newFollowup.trim()}>
                    추가
                  </CrmButton>
                </form>
              </div>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <CrmCheckbox
                  checked={w.reviewed}
                  onChange={(v) => updateWrapup((x) => ({ ...x, reviewed: v }))}
                  label="요약 내용을 확인했고 사실과 다른 부분을 수정했습니다"
                  hint="확인해야 저장할 수 있습니다. AI 요약은 상담사 확인 후에만 상담 기록으로 확정됩니다."
                />
              </div>
            </div>
          </CrmCard>
        )}

        <div className="flex flex-col gap-4">
          <CrmCard title="분류" icon="Tag">
            <div className="flex flex-col gap-3">
              <CrmSelect
                label="문의 유형"
                value={session.category ?? "other"}
                onChange={(e) => {
                  const v = e.target.value as CategoryId;
                  confirmCategory(v, intake && intake.confidence >= LOW_CONFIDENCE && v === intake.category ? "ai" : "agent");
                }}
                options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
              />
              {intake && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <CrmAILabel text={`AI 분류 ${categoryLabel(intake.category)}`} confidence={Math.round(intake.confidence * 100)} />
                  {session.category !== intake.category && <span>상담사가 AI 분류와 다른 유형으로 확정했습니다.</span>}
                </div>
              )}
              <div>
                <div className="crm-label mb-1.5">세부 태그</div>
                <div className="flex flex-wrap gap-1.5">
                  {playbook.tags.map((t) => {
                    const on = w.tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          updateWrapup((x) => ({ ...x, tags: on ? x.tags.filter((v) => v !== t) : [...x.tags, t] }))
                        }
                        className={`crm-badge md cursor-pointer ${on ? "info" : "neutral"}`}
                      >
                        <Icon name={on ? "Check" : "Plus"} size={12} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CrmCard>

          <CrmCard title="이관 · 재연락" icon="Share2">
            <div className="flex flex-col gap-3">
              <CrmSelect
                label="담당 부서 이관"
                value={w.transfer}
                placeholder="이관하지 않음"
                onChange={(e) => updateWrapup((x) => ({ ...x, transfer: e.target.value }))}
                options={TRANSFER_DEPTS}
                hint={
                  session.actions.some((a) => a.actionId === "transfer")
                    ? "통화 중 이관한 부서가 선택되어 있습니다."
                    : w.transfer
                      ? "저장하면 상담 요약이 함께 전달됩니다."
                      : undefined
                }
              />
              <CrmCheckbox
                checked={w.recontact}
                onChange={(v) => updateWrapup((x) => ({ ...x, recontact: v }))}
                label="고객 재연락 예정"
              />
              {w.recontact && (
                <CrmInput
                  label="재연락 예정일"
                  type="date"
                  value={w.recontactDate}
                  onChange={(e) => updateWrapup((x) => ({ ...x, recontactDate: e.target.value }))}
                />
              )}
            </div>
          </CrmCard>

          <CrmCard title="처리 요약" icon="FileText">
            <CrmKeyValue
              labelWidth={88}
              items={[
                { label: "통화 시간", value: fmtDuration(callSeconds(session)) },
                { label: "보류 시간", value: fmtDuration(session.heldMs / 1000) },
                {
                  label: "본인 확인",
                  value: session.verified ? "완료" : "미완료",
                  tone: session.verified ? "success" : "danger",
                },
                { label: "관련 주문", value: order ? `${order.item} · ${order.status}` : "없음" },
                { label: "필수 안내", value: `${told}/${playbook.notices.length}건 체크` },
                {
                  label: "처리 기능",
                  value: session.actions.length
                    ? session.actions.map((a) => `${a.label}${a.receiptNo ? ` (${a.receiptNo})` : ""}`).join(", ")
                    : "실행하지 않음",
                },
              ]}
            />
          </CrmCard>
        </div>
      </div>
    </div>
  );
}
