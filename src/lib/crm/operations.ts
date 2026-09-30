"use client";

// 상담 흐름의 상태 변경. 처리 기능(회수 접수·환불 등)은 백엔드가 없어 접수번호를 만들어 기록만 합니다.
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import type { ClassifyResult } from "@/lib/useVoiceClassify";
import { RETURN_SHIPPING_FEE, fmtShortDate, fmtWon, isoDaysAgo, receiptNo, toDateInput, uid } from "./format";
import { ACTIONS, PLAYBOOKS, suggestOrder } from "./playbooks";
import { readCrm, updateCrm } from "./store";
import type {
  ActionId,
  AgentStatus,
  AlertStatus,
  CrmState,
  FollowUp,
  HistoryRecord,
  Intake,
  PerformedAction,
  Session,
  SummaryFields,
  WrapUp,
} from "./types";

/** AI 분류를 제안으로 보여 줄 최소 신뢰도. 이보다 낮으면 상담사가 직접 선택합니다. */
export const LOW_CONFIDENCE = 0.65;

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function noticeLabel(id: string): string {
  for (const pb of Object.values(PLAYBOOKS)) {
    const n = pb.notices.find((x) => x.id === id);
    if (n) return n.label;
  }
  return id;
}

const appendLine = (text: string, line: string) => (text && !text.endsWith("\n") ? `${text}\n${line}` : `${text}${line}`);

function updateSession(fn: (s: Session, state: CrmState) => Session) {
  updateCrm((state) => (state.session ? { ...state, session: fn(state.session, state) } : state));
}

export function customerOrders(state: CrmState, customerId: string) {
  return state.orders.filter((o) => o.customerId === customerId);
}

export function sessionOrder(state: CrmState) {
  const s = state.session;
  return s?.orderNo ? state.orders.find((o) => o.no === s.orderNo) : undefined;
}

/** 통화 시간(초). 보류 시간도 통화 시간에 포함합니다. */
export function callSeconds(s: Session, now = Date.now()): number {
  if (!s.callStartedAt) return 0;
  return Math.floor(((s.callEndedAt ?? now) - s.callStartedAt) / 1000);
}

export function setAgentStatus(status: AgentStatus) {
  updateCrm((state) => ({ ...state, agentStatus: status }));
}

/** 대기열의 첫 고객으로 상담을 시작합니다(사전 브리핑 단계). */
export function startSession(): boolean {
  const state = readCrm();
  if (!state || state.session) return !!state?.session;
  const next = state.queue[0];
  if (!next) return false;
  updateCrm((st) => ({
    ...st,
    session: {
      id: uid("S"),
      queueId: next.id,
      customerId: next.customerId,
      stage: "briefing",
      createdAt: new Date().toISOString(),
      intake: { status: "none" },
      orderConfirmed: false,
      verified: false,
      verifyFailures: 0,
      heldMs: 0,
      stepsDone: [],
      notices: [],
      actions: [],
      memo: "",
      transcripts: [],
      alerts: {},
      usedReplies: [],
    },
  }));
  return true;
}

/** 음성 접수 결과를 기록합니다. 새로 접수하면 이전에 확정한 유형은 다시 확인해야 합니다. */
export function setIntake(intake: Intake) {
  updateSession((s) => ({ ...s, intake, category: undefined, categorySource: undefined }));
}

export function intakeResult(s: Session): ClassifyResult | undefined {
  return s.intake.status === "done" ? s.intake.result : undefined;
}

/** 상담사가 문의 유형을 확정합니다. AI 제안을 그대로 확정하면 source = "ai". */
export function confirmCategory(category: CategoryId, source: "ai" | "agent") {
  // 상담사가 이미 고른 주문은 유지하고, 없을 때만 유형에 맞는 주문을 추정해 넣습니다.
  updateSession((s, state) => ({
    ...s,
    category,
    categorySource: source,
    orderNo: s.orderNo ?? suggestOrder(category, customerOrders(state, s.customerId))?.no,
  }));
}

export function selectOrder(orderNo: string) {
  updateSession((s) => ({ ...s, orderNo, orderConfirmed: false }));
}

export function confirmOrder() {
  updateSession((s) => ({ ...s, orderConfirmed: !!s.orderNo }));
}

export function connectCall() {
  updateCrm((state) =>
    state.session
      ? {
          ...state,
          agentStatus: "oncall",
          session: { ...state.session, stage: "live", callStartedAt: Date.now() },
        }
      : state,
  );
}

/** 생년월일 6자리 + 휴대폰 뒤 4자리로 본인 확인 */
export function verifyIdentity(birth: string, last4: string): boolean {
  let ok = false;
  updateSession((s, state) => {
    const c = state.customers[s.customerId];
    ok = c.birth === birth.trim() && c.phone.endsWith(`-${last4.trim()}`);
    return ok
      ? { ...s, verified: true, verifiedAt: new Date().toISOString(), memo: appendLine(s.memo, "[확인] 본인 확인 완료") }
      : { ...s, verifyFailures: s.verifyFailures + 1 };
  });
  return ok;
}

export function toggleHold() {
  updateSession((s) => {
    const now = Date.now();
    return s.holdStartedAt
      ? { ...s, holdStartedAt: undefined, heldMs: s.heldMs + (now - s.holdStartedAt) }
      : { ...s, holdStartedAt: now };
  });
}

export function toggleNotice(id: string, told: boolean) {
  updateSession((s) => ({
    ...s,
    notices: told ? [...new Set([...s.notices, id])] : s.notices.filter((n) => n !== id),
  }));
}

export function toggleStep(id: string) {
  updateSession((s) => ({
    ...s,
    stepsDone: s.stepsDone.includes(id) ? s.stepsDone.filter((x) => x !== id) : [...s.stepsDone, id],
  }));
}

export function setMemo(memo: string) {
  updateSession((s) => ({ ...s, memo }));
}

export function appendMemo(line: string) {
  updateSession((s) => ({ ...s, memo: appendLine(s.memo, line) }));
}

export function markReplyUsed(id: string) {
  updateSession((s) => ({ ...s, usedReplies: [...new Set([...s.usedReplies, id])] }));
}

export function setAlert(id: string, status: AlertStatus) {
  updateSession((s) => ({ ...s, alerts: { ...s.alerts, [id]: status } }));
}

/** 통화 중 추가로 인식한 음성. 분류가 달라지면 제안만 띄우고 자동으로 바꾸지 않습니다. */
export function addCallTranscript(result: ClassifyResult) {
  updateSession((s) => {
    const transcripts = [
      ...s.transcripts,
      {
        id: uid("T"),
        text: result.transcript,
        at: new Date().toISOString(),
        category: result.category,
        confidence: result.confidence,
      },
    ];
    const differs = result.category !== s.category && result.confidence >= LOW_CONFIDENCE;
    return {
      ...s,
      transcripts,
      suggestion: differs
        ? { category: result.category, confidence: result.confidence, reason: result.reason, status: "open" }
        : s.suggestion,
    };
  });
}

export function resolveSuggestion(apply: boolean) {
  updateSession((s) => {
    if (!s.suggestion) return s;
    if (!apply) return { ...s, suggestion: { ...s.suggestion, status: "dismissed" } };
    return {
      ...s,
      category: s.suggestion.category,
      categorySource: "ai",
      suggestion: { ...s.suggestion, status: "applied" },
      memo: appendLine(s.memo, `[분류] 문의 유형 변경 → ${categoryLabel(s.suggestion.category)} (AI 제안 적용)`),
    };
  });
}

function describeValues(actionId: ActionId, values: Record<string, string>): string | undefined {
  const def = ACTIONS[actionId];
  const parts = def.fields
    .map((f) => {
      const v = values[f.id]?.trim();
      if (!v) return undefined;
      return `${f.label} ${f.type === "date" ? fmtShortDate(v) : v}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

/** 반품 회수 사유를 반영한 환불 예정 금액 */
export function refundAmount(session: Session, price: number): number {
  const pickup = session.actions.find((a) => a.actionId === "return_pickup");
  const simpleChange = (pickup?.values?.reason ?? "단순 변심") === "단순 변심";
  return price - (simpleChange ? RETURN_SHIPPING_FEE : 0);
}

/** 처리 기능 실행(목). 접수번호를 만들고 주문 상태·상담 메모를 갱신합니다. */
export function performAction(actionId: ActionId, values: Record<string, string>): PerformedAction | undefined {
  let performed: PerformedAction | undefined;
  updateCrm((state) => {
    const s = state.session;
    if (!s) return state;
    const def = ACTIONS[actionId];
    const order = sessionOrder(state);
    let detail = describeValues(actionId, values);
    if (actionId === "refund" && order) detail = `환불 예정 ${fmtWon(refundAmount(s, order.price))}`;
    if (actionId === "tracking" && order?.tracking?.[0]) {
      detail = `${order.tracking[0].title} · ${order.tracking[0].desc ?? ""}`.trim();
    }
    performed = {
      id: uid("A"),
      actionId,
      label: def.label,
      receiptNo: def.receiptPrefix ? receiptNo(def.receiptPrefix) : undefined,
      at: new Date().toISOString(),
      orderNo: order?.no,
      detail,
      values,
    };
    const orders =
      def.orderStatus && order
        ? state.orders.map((o) => (o.no === order.no ? { ...o, status: def.orderStatus! } : o))
        : state.orders;
    const line = `[처리] ${def.label}${performed.receiptNo ? ` (${performed.receiptNo})` : ""}${detail ? ` · ${detail}` : ""}`;
    return { ...state, orders, session: { ...s, actions: [...s.actions, performed], memo: appendLine(s.memo, line) } };
  });
  return performed;
}

function initialFollowups(s: Session): FollowUp[] {
  const items: FollowUp[] = s.actions
    .filter((a) => ACTIONS[a.actionId].followup)
    .map((a) => ({
      id: uid("F"),
      label: ACTIONS[a.actionId].followup!,
      hint: [a.receiptNo, a.detail].filter(Boolean).join(" · ") || undefined,
      done: false,
    }));
  if (!s.verified) {
    items.unshift({ id: uid("F"), label: "본인 확인 후 재상담", hint: "본인 확인을 하지 못해 처리 기능을 실행하지 않았습니다.", done: false });
  }
  return items;
}

export function endCall() {
  updateCrm((state) => {
    const s = state.session;
    if (!s) return state;
    const now = Date.now();
    const callback = s.actions.find((a) => a.actionId === "callback");
    const transfer = s.actions.find((a) => a.actionId === "transfer");
    const wrapup: WrapUp = {
      tags: [],
      followups: initialFollowups(s),
      transfer: transfer?.values?.dept ?? "",
      recontact: !!callback,
      recontactDate: callback?.values?.date ?? toDateInput(isoDaysAgo(-1)),
      reviewed: false,
    };
    return {
      ...state,
      agentStatus: "wrapup",
      session: {
        ...s,
        stage: "wrapup",
        callEndedAt: now,
        heldMs: s.heldMs + (s.holdStartedAt ? now - s.holdStartedAt : 0),
        holdStartedAt: undefined,
        wrapup,
      },
    };
  });
}

export function updateWrapup(fn: (w: WrapUp) => WrapUp) {
  updateSession((s) => (s.wrapup ? { ...s, wrapup: fn(s.wrapup) } : s));
}

/** /api/summarize 요청 본문. 이름·연락처 등 개인정보는 보내지 않습니다. */
export function buildSummaryInput(state: CrmState) {
  const s = state.session!;
  const order = sessionOrder(state);
  const intake = intakeResult(s);
  return {
    category: categoryLabel(s.category ?? "other"),
    intakeTranscript: intake?.transcript ?? null,
    keyRequest: intake?.keyRequest ?? null,
    callTranscripts: s.transcripts.map((t) => t.text),
    memo: s.memo,
    verified: s.verified,
    order: order ? { item: order.item, option: order.option, price: order.price, status: order.status } : null,
    notices: s.notices.map((id) => noticeLabel(id)),
    actions: s.actions.map((a) => ({ label: a.label, receiptNo: a.receiptNo ?? null, detail: a.detail ?? null })),
  };
}

/** AI 요약을 받지 못했을 때 쓰는 기록 기반 초안(AI 아님) */
export function buildRecordDraft(state: CrmState): SummaryFields {
  const s = state.session!;
  const order = sessionOrder(state);
  const intake = intakeResult(s);
  const cat = categoryLabel(s.category ?? "other");
  const request =
    intake?.keyRequest ?? `${order ? `${order.item} 관련 ` : ""}${cat} 문의입니다.`;
  const told = s.notices.length
    ? `안내한 내용: ${s.notices.map(noticeLabel).join(", ")}.`
    : "필수 안내 체크 기록이 없습니다.";
  const result = s.actions.length
    ? s.actions.map((a) => `${a.label}${a.receiptNo ? ` (${a.receiptNo})` : ""}${a.detail ? ` · ${a.detail}` : ""}`).join("\n")
    : s.verified
      ? "처리 기능을 실행하지 않았습니다."
      : "본인 확인을 하지 못해 처리 기능을 실행하지 않았습니다.";
  return { request, told, result };
}

export function wrapupValues(w: WrapUp): SummaryFields {
  return w.values ?? w.draft ?? { request: "", told: "", result: "" };
}

let lastSavedRecordId: string | undefined;

/** 이 탭에서 마지막으로 저장한 상담 이력 id (저장 직후 화면 전환용) */
export const getLastSavedRecordId = () => lastSavedRecordId;

/** 후처리 저장 → 상담 이력으로 옮기고 대기열에서 뺍니다. 새 이력 id를 돌려줍니다. */
export function saveWrapup(): string | undefined {
  let id: string | undefined;
  updateCrm((state) => {
    const s = state.session;
    if (!s?.wrapup) return state;
    const w = s.wrapup;
    const values = wrapupValues(w);
    const intake = intakeResult(s);
    const editedFields = (["request", "told", "result"] as const).filter((k) => w.draft && values[k] !== w.draft[k]);
    const record: HistoryRecord = {
      id: uid("H"),
      customerId: s.customerId,
      startedAt: new Date(s.callStartedAt ?? Date.parse(s.createdAt)).toISOString(),
      durationSec: callSeconds(s),
      agent: state.agent.name,
      category: s.category ?? "other",
      categorySource: s.categorySource ?? "agent",
      aiCategory: intake?.category,
      aiConfidence: intake?.confidence,
      intakeTranscript: intake?.transcript,
      keyRequest: intake?.keyRequest,
      orderNo: s.orderNo,
      verified: s.verified,
      summary: values,
      aiDraft: w.draftSource === "ai" ? w.draft : undefined,
      draftSource: w.draftSource,
      editedFields: [...editedFields],
      actions: s.actions,
      notices: s.notices.map(noticeLabel),
      memo: s.memo,
      transcripts: s.transcripts,
      tags: w.tags,
      followups: w.followups,
      transfer: w.transfer || undefined,
      recontactDate: w.recontact ? w.recontactDate : undefined,
    };
    id = record.id;
    lastSavedRecordId = record.id;
    return {
      ...state,
      history: [record, ...state.history],
      queue: state.queue.filter((q) => q.id !== s.queueId),
      session: undefined,
      agent: { ...state.agent, handledToday: state.agent.handledToday + 1 },
      agentStatus: "available",
    };
  });
  return id;
}

export function toggleHistoryFollowup(recordId: string, followupId: string) {
  updateCrm((state) => ({
    ...state,
    history: state.history.map((h) =>
      h.id === recordId
        ? { ...h, followups: h.followups.map((f) => (f.id === followupId ? { ...f, done: !f.done } : f)) }
        : h,
    ),
  }));
}
