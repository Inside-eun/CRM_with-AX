"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CrmAILabel,
  CrmAvatar,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmCheckbox,
  CrmChecklist,
  CrmInlineAlert,
  CrmInput,
  CrmKeyValue,
  CrmPolicyAlert,
  CrmSelect,
  CrmSidePanel,
  CrmStepGuide,
  CrmSuggestedReply,
  CrmTabs,
  CrmTextarea,
  CrmTimeline,
  Icon,
  type IconName,
} from "@/design-system";
import {
  calendarDaysBetween,
  fmtDate,
  fmtDuration,
  fmtTime,
  fmtWon,
  maskEmail,
  maskPay,
  maskPhone,
} from "@/lib/crm/format";
import {
  addCallTranscript,
  appendMemo,
  callSeconds,
  categoryLabel,
  confirmOrder,
  customerOrders,
  endCall,
  intakeResult,
  markReplyUsed,
  resolveSuggestion,
  selectOrder,
  sessionOrder,
  setAlert,
  setMemo,
  toggleHold,
  toggleNotice,
  toggleStep,
  updateRequest,
  verifyIdentity,
} from "@/lib/crm/operations";
import {
  ACTIONS,
  COMMON_ACTIONS,
  actionBlockedReason,
  playbookFor,
  policyById,
  stepStates,
  type Playbook,
  type StepState,
} from "@/lib/crm/playbooks";
import {
  FLOW_LABEL,
  RETURN_REASONS,
  VERDICT_LABEL,
  assessRequest,
  exchangePriceDiff,
  isDefectReason,
  requestFlow,
  returnDeadlineFor,
  type RequestFlow,
  type Verdict,
} from "@/lib/crm/returns";
import type { ActionId, CrmState, Customer, Order, PerformedAction, ReturnReason, Session } from "@/lib/crm/types";
import { useVoiceClassify } from "@/lib/useVoiceClassify";
import { ActionDialog } from "../ActionDialog";
import { ConsultGuard } from "../ConsultGuard";
import { RecordingIndicator, VoiceCaptureButtons } from "../VoiceCapture";
import { Bubble, ConfirmedCategoryBadge, GradeBadge, MiniLabel, STAGE_ROUTES, useNow } from "../ui";

export function LiveCallScreen() {
  return <ConsultGuard stage="live">{(ctx) => <LiveCall {...ctx} />}</ConsultGuard>;
}

function LiveCall({ state, session }: { state: CrmState; session: Session }) {
  const router = useRouter();
  const now = useNow();
  const customer = state.customers[session.customerId];
  const order = sessionOrder(state);
  const playbook = playbookFor(session, order);
  const steps = stepStates(playbook, session, order);
  const current = steps.find((s) => s.status === "current");
  const pending = steps.filter((s) => s.status !== "done" && !s.optional);
  const flow = session.category === "refund_exchange" ? requestFlow(session, order) : undefined;

  const [dialog, setDialog] = useState<ActionId | null>(null);
  const [endConfirm, setEndConfirm] = useState(false);
  const [lastDone, setLastDone] = useState<PerformedAction | null>(null);

  const hold = !!session.holdStartedAt;
  const elapsed = callSeconds(session, now);

  const openAction = (id: ActionId) => {
    // 필수 안내 없이 처리하려 하면 정책 확인 알림을 띄웁니다(규칙 기반).
    playbook.notices
      .filter((n) => n.requiredFor?.includes(id) && !session.notices.includes(n.id) && !session.alerts[n.id])
      .forEach((n) => setAlert(n.id, "open"));
    setDialog(id);
    setEndConfirm(false);
  };

  const finish = () => {
    endCall();
    router.push(STAGE_ROUTES.wrapup);
  };

  const actionIds = [...playbook.actions, ...COMMON_ACTIONS.filter((a) => !playbook.actions.includes(a))];
  const recommended = current?.doneWhen.type === "action" ? current.doneWhen.ids : [];
  const currentIndex = current ? steps.indexOf(current) + 1 : undefined;
  const stepLabelFor = (id: string) => (current?.id === id ? `STEP ${currentIndex}` : undefined);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 통화 헤더 */}
      <div className="relative flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
        {/* 좁은 화면에서는 고객·유형 배지만 다음 줄로 넘기고 통화 버튼은 한 줄을 유지합니다 */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={`flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold ${
              hold ? "border-(--warning-300) bg-(--warning-50) text-warning-700" : "border-(--success-200) bg-(--success-50) text-success-700"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" style={{ animation: hold ? "none" : "crm-pulse 1.4s infinite" }} />
            {hold ? "보류 중" : "통화 중"}
            <span className="tabular-nums text-gray-900">{fmtDuration(elapsed)}</span>
          </span>
          <CrmAvatar name={customer.name} size="sm" tone="blue" />
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-base font-semibold">{customer.name}</span>
            <GradeBadge grade={customer.grade} />
            <span className="whitespace-nowrap text-[13px] text-gray-500">{session.verified ? customer.phone : maskPhone(customer.phone)}</span>
            {session.verified ? (
              <CrmBadge tone="success" icon="Shield">
                본인 확인
              </CrmBadge>
            ) : (
              <CrmBadge tone="warning" icon="Lock">
                본인 확인 전
              </CrmBadge>
            )}
          </div>
          {session.category && <ConfirmedCategoryBadge category={session.category} source={session.categorySource} />}
          {flow && (
            <CrmBadge tone="info" square>
              {FLOW_LABEL[flow]}
            </CrmBadge>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          <CrmButton icon={hold ? "Play" : "Pause"} onClick={toggleHold}>
            {hold ? "보류 해제" : "보류"}
          </CrmButton>
          <CrmButton icon="PhoneForwarded" onClick={() => openAction("transfer")}>
            전환
          </CrmButton>
          <CrmButton
            variant="danger"
            icon="PhoneOff"
            onClick={() => (pending.length > 0 ? setEndConfirm(true) : finish())}
          >
            상담 종료
          </CrmButton>
        </div>
        {endConfirm && (
          <div
            role="dialog"
            aria-label="상담 종료 확인"
            className="absolute right-6 top-[calc(100%+8px)] z-20 w-90 rounded-xl border border-gray-200 bg-white p-4"
            style={{ boxShadow: "var(--shadow-xl)", animation: "crm-slide-in .2s var(--ease-standard)" }}
          >
            <div className="mb-1 text-base font-semibold">상담을 종료할까요?</div>
            <div className="mb-3 text-[13px] text-gray-600">아직 끝나지 않은 처리 단계가 {pending.length}개 있습니다.</div>
            <ul className="m-0 mb-3 flex list-none flex-col gap-1 p-0 text-[13px] text-gray-700">
              {pending.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <Icon name="Circle" size={12} style={{ color: "var(--gray-400)" }} />
                  {s.label}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <CrmButton size="sm" onClick={() => setEndConfirm(false)}>
                계속 상담
              </CrmButton>
              <CrmButton size="sm" variant="danger" onClick={finish}>
                종료하고 후처리
              </CrmButton>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 좌측: 본인 확인 → 대상 주문 → 고객 정보 → 다른 주문·이력 */}
        <div
          className="crm-scroll flex flex-none flex-col gap-3 border-r border-gray-200 bg-gray-50 p-4"
          style={{ width: "clamp(280px, 22vw, 320px)" }}
        >
          <IdentityCard session={session} customer={customer} stepLabel={stepLabelFor("verify")} />
          <TargetOrderCard session={session} order={order} stepLabel={stepLabelFor("order")} currentStepId={current?.id} />
          <CustomerCard customer={customer} verified={session.verified} />
          <LeftTabs state={state} session={session} order={order} />
        </div>

        {/* 중앙: 대화 → 환불·교환 요청 → 메모 → 필수 안내 (세로 배치, 넘치면 스크롤) */}
        <div className="crm-scroll flex min-w-0 flex-1 flex-col gap-3 p-4">
          <ConversationCard session={session} hold={hold} />
          {session.category === "refund_exchange" && (
            <RequestPanel
              session={session}
              order={order}
              stepLabel={stepLabelFor("request") ?? stepLabelFor("eligible")}
            />
          )}
          <CrmTextarea
            label={<span className="whitespace-nowrap">상담 메모</span>}
            rows={7}
            value={session.memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="고객 요청과 안내 내용을 메모하세요. 처리 기능을 실행하면 자동으로 기록됩니다."
            headerRight={<span className="whitespace-nowrap text-xs text-gray-400">입력 즉시 저장됩니다</span>}
            style={{ flexShrink: 0, width: "100%" }}
          />
          <NoticeChecks playbook={playbook} session={session} current={current} />
        </div>

        {/* 우측: 상담 가이드 */}
        <GuidePanel session={session} playbook={playbook} steps={steps} />
      </div>

      {/* 하단 처리 기능 — 화면 흐름 안에 있어 위 콘텐츠를 가리지 않습니다 */}
      <div
        className="relative flex flex-none flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-6 py-3"
        style={{ boxShadow: "0 -4px 8px -2px rgba(16,24,40,0.04)" }}
      >
        <span className="mr-1 text-[13px] font-semibold text-gray-500">처리</span>
        {actionIds.map((id) => {
          const def = ACTIONS[id];
          const blocked = actionBlockedReason(id, session, order);
          const done = session.actions.some((a) => a.actionId === id);
          const rec = recommended.includes(id) && !blocked;
          return (
            <CrmButton
              key={id}
              icon={done ? "CheckCircle" : def.icon}
              variant={rec ? "primary" : "secondary"}
              highlighted={rec}
              step={rec ? currentIndex : undefined}
              disabled={!!blocked}
              title={blocked ?? def.description}
              onClick={() => openAction(id)}
            >
              {def.label}
            </CrmButton>
          );
        })}
        {lastDone && (
          <CrmBadge tone="success" icon="Check">
            {lastDone.label} · {lastDone.receiptNo ? `접수됨 ${lastDone.receiptNo}` : "기록됨"}
          </CrmBadge>
        )}
        <div className="flex-1" />
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Icon name={session.verified ? "Info" : "Lock"} size={14} />
          {!session.verified
            ? "본인 확인 전에는 담당자 이관·콜백 외 처리 기능을 쓸 수 없습니다"
            : session.category === "refund_exchange" && !flow
              ? "환불·교환 요청 구분을 선택하면 해당 처리 버튼이 바뀝니다"
              : "현재 단계와 관련된 버튼만 강조됩니다 · 접수는 처리 완료가 아닙니다"}
        </span>
        {dialog && (
          <ActionDialog
            key={dialog}
            actionId={dialog}
            state={state}
            session={session}
            onClose={() => setDialog(null)}
            onDone={(p) => {
              setDialog(null);
              setLastDone(p);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** 접었다 펴는 보조 정보 영역 */
function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-gray-600 hover:text-gray-800">
        <Icon name="ChevronRight" size={14} className="transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function IdentityCard({ session, customer, stepLabel }: { session: Session; customer: Customer; stepLabel?: string }) {
  const [birth, setBirth] = useState("");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (session.verified) {
    // 확인을 마치면 상태 요약 한 줄로 접어 대상 주문이 먼저 보이게 합니다.
    return (
      <div
        className="flex flex-none items-center gap-2 rounded-lg border border-(--success-200) bg-(--success-50) px-3 py-2"
        role="status"
      >
        <Icon name="Shield" size={16} className="flex-none text-success-700" />
        <span className="whitespace-nowrap text-[13px] font-semibold text-success-700">본인 확인 완료</span>
        <span className="min-w-0 truncate text-xs text-gray-600">
          {session.verifiedAt && `${fmtTime(session.verifiedAt)} · `}생년월일·휴대폰 뒤 4자리 일치
        </span>
      </div>
    );
  }

  const locked = session.verifyFailures >= 3;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(birth.trim()) || !/^\d{4}$/.test(last4.trim())) {
      setError("생년월일 6자리와 휴대폰 뒤 4자리를 숫자로 입력하세요.");
      return;
    }
    if (verifyIdentity(birth, last4)) setError(null);
    else setError(`정보가 일치하지 않습니다 (${session.verifyFailures + 1}/3회).`);
  };

  return (
    <CrmCard title="본인 확인" icon="Lock" tone="warning" stepLabel={stepLabel} style={{ flexShrink: 0 }}>
      {locked ? (
        <CrmInlineAlert tone="danger" title="본인 확인 3회 실패">
          처리 기능 없이 일반 안내만 진행하세요. 필요하면 담당자 이관이나 콜백을 예약할 수 있습니다.
        </CrmInlineAlert>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="text-xs text-gray-600">고객에게 확인한 값을 입력하세요. 확인 전에는 민감 정보와 처리 기능이 제한됩니다.</div>
          <CrmInput size="sm" label="생년월일 6자리" placeholder="YYMMDD" value={birth} onChange={(e) => setBirth(e.target.value)} />
          <CrmInput size="sm" label="휴대폰 번호 뒤 4자리" placeholder="0000" value={last4} onChange={(e) => setLast4(e.target.value)} />
          {error && <div className="crm-hint error">{error}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <CrmButton type="submit" variant="primary" size="sm" icon="Shield">
              본인 확인
            </CrmButton>
            <CrmButton
              variant="link"
              size="xs"
              onClick={() => {
                setBirth(customer.birth);
                setLast4(customer.phone.slice(-4));
              }}
            >
              데모: 고객 응답 채우기
            </CrmButton>
          </div>
        </form>
      )}
    </CrmCard>
  );
}

/** 대상 주문의 핵심 사실 (상품 아래 2열 격자) */
function Fact({
  label,
  value,
  highlight,
  tone,
  wide,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  tone?: "danger" | "warning";
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-md border px-2.5 py-1.5 ${wide ? "col-span-2" : ""} ${
        highlight ? "border-brand-300 bg-brand-25" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-sm font-semibold ${
          tone === "danger" ? "text-error-700" : tone === "warning" ? "text-warning-700" : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TargetOrderCard({
  session,
  order,
  stepLabel,
  currentStepId,
}: {
  session: Session;
  order?: Order;
  stepLabel?: string;
  currentStepId?: string;
}) {
  if (!order) {
    return (
      <CrmInlineAlert tone="warning" title="대상 주문이 없습니다">
        아래 &apos;다른 주문&apos;에서 문의 대상 주문을 선택하세요.
      </CrmInlineAlert>
    );
  }
  const reason = session.request?.reason;
  const deadline = returnDeadlineFor(order, reason);
  const left = deadline ? -calendarDaysBetween(deadline) : undefined;
  const isReturnCase = session.category === "refund_exchange";
  return (
    <CrmCard
      title="대상 주문"
      icon="Package"
      tone="info"
      stepLabel={stepLabel}
      style={{ flexShrink: 0 }}
      actions={
        session.orderConfirmed ? (
          <CrmBadge tone="success" icon="Check">
            고객 확인
          </CrmBadge>
        ) : undefined
      }
      footer={
        session.orderConfirmed ? undefined : (
          <CrmButton size="sm" variant={stepLabel ? "primary" : "secondary"} icon="Check" onClick={confirmOrder}>
            고객에게 주문 확인함
          </CrmButton>
        )
      }
    >
      <div className="text-[15px] font-semibold leading-[22px] text-gray-900">{order.item}</div>
      <div className="mb-3 text-[13px] text-gray-500">
        {order.option} · {order.qty}개 · {fmtWon(order.price)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Fact label="주문 상태" value={order.status} highlight={currentStepId === "status" || currentStepId === "tracking"} />
        <Fact
          label="수령일"
          value={order.deliveredAt ? fmtDate(order.deliveredAt) : order.shippedAt ? "배송 중 · 미수령" : "출고 전"}
        />
        <Fact
          wide
          label={`반품 기한 · ${reason && reason !== "단순 변심" ? "불량·오배송 30일" : "단순 변심 7일"}`}
          value={
            deadline && left !== undefined
              ? `${fmtDate(deadline)} (${left < 0 ? "기간 경과" : left === 0 ? "오늘까지" : `D-${left}`})`
              : "수령 후 계산"
          }
          tone={left !== undefined && left < 0 ? "danger" : left !== undefined && left <= 1 ? "warning" : undefined}
          highlight={isReturnCase && currentStepId === "eligible"}
        />
      </div>
      {isReturnCase && order.returnPolicy && (
        <div className="mt-2 text-xs text-gray-600">
          <Icon name="BookOpen" size={12} className="mr-1 inline align-[-1px] text-gray-400" />
          {order.returnPolicy.note}
        </div>
      )}
      <div className="mt-3">
        <Disclosure summary="주문 상세">
          <CrmKeyValue
            labelWidth={72}
            items={[
              { label: "주문번호", value: order.no, mono: true },
              { label: "주문일", value: fmtDate(order.orderedAt) },
              { label: "결제", value: session.verified ? order.payMethod : maskPay(order.payMethod) },
              { label: "승인번호", value: session.verified ? order.approvalNo : "본인 확인 후 표시", mono: session.verified },
              { label: "출고일", value: order.shippedAt ? fmtDate(order.shippedAt) : "출고 전" },
              ...(order.invoice ? [{ label: "송장", value: `${order.carrier} ${order.invoice}` }] : []),
            ]}
          />
        </Disclosure>
      </div>
    </CrmCard>
  );
}

function CustomerCard({ customer, verified }: { customer: Customer; verified: boolean }) {
  return (
    <CrmCard
      title="고객 정보"
      icon="User"
      style={{ flexShrink: 0 }}
      actions={
        !verified && (
          <CrmBadge tone="neutral" icon="Lock">
            일부 가림
          </CrmBadge>
        )
      }
    >
      <CrmKeyValue
        labelWidth={64}
        items={[
          { label: "휴대폰", value: verified ? customer.phone : maskPhone(customer.phone) },
          { label: "누적 주문", value: `${customer.orderCount}건` },
        ]}
      />
      {customer.caution && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-(--warning-50) px-2.5 py-1.5 text-xs text-warning-700">
          <Icon name="AlertTriangle" size={14} className="mt-0.5 flex-none" />
          {customer.caution}
        </div>
      )}
      <div className="mt-3">
        <Disclosure summary="상세 정보 (이메일·배송지·결제·가입)">
          <CrmKeyValue
            labelWidth={64}
            items={[
              { label: "이메일", value: verified ? customer.email : maskEmail(customer.email) },
              { label: "배송지", value: verified ? customer.address : customer.addressShort },
              { label: "결제", value: verified ? customer.payMethods.join(", ") : customer.payMethods.map(maskPay).join(", ") },
              { label: "가입", value: fmtDate(customer.since) },
              { label: "누적 금액", value: fmtWon(customer.ltv) },
            ]}
          />
          <div className="mt-2.5 flex flex-wrap gap-1">
            {customer.tags.map((t) => (
              <CrmBadge key={t}>{t}</CrmBadge>
            ))}
          </div>
        </Disclosure>
      </div>
    </CrmCard>
  );
}

function LeftTabs({ state, session, order }: { state: CrmState; session: Session; order?: Order }) {
  const [tab, setTab] = useState("orders");
  const others = customerOrders(state, session.customerId).filter((o) => o.no !== order?.no);
  const past = state.history.filter((h) => h.customerId === session.customerId);

  return (
    <div className="flex flex-none flex-col gap-3">
      <CrmTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "orders", label: "다른 주문", count: others.length },
          { id: "calls", label: "상담 이력", count: past.length },
        ]}
      />
      {tab === "orders" ? (
        others.length === 0 ? (
          <div className="text-[13px] text-gray-500">다른 주문이 없습니다.</div>
        ) : (
          others.map((o) => (
            <button
              key={o.no}
              type="button"
              onClick={() => selectOrder(o.no)}
              className="crm-row-hover rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left"
              title="이 주문을 문의 대상으로 선택"
            >
              <div className="flex justify-between gap-2 text-[13px] font-medium">
                <span className="min-w-0 truncate">{o.item}</span>
                <span className="flex-none text-gray-500">{fmtDate(o.orderedAt).slice(5)}</span>
              </div>
              <div className="text-xs text-gray-500">
                {fmtWon(o.price)} · {o.status}
              </div>
            </button>
          ))
        )
      ) : (
        <CrmCard>
          {past.length === 0 ? (
            <div className="text-[13px] text-gray-500">이전 상담 이력이 없습니다.</div>
          ) : (
            <CrmTimeline
              compact
              items={past.map((h) => ({
                title: categoryLabel(h.category),
                meta: fmtDate(h.startedAt),
                desc: h.summary.request,
                icon: "MessageSquare",
                extra: (
                  <Link href={`/history/${h.id}`} target="_blank" className="text-xs font-medium">
                    새 탭에서 보기
                  </Link>
                ),
              }))}
            />
          )}
        </CrmCard>
      )}
    </div>
  );
}

const VERDICT_TONE: Record<Verdict, "success" | "danger" | "warning"> = { ok: "success", no: "danger", check: "warning" };
const VERDICT_ICON: Record<Verdict, IconName> = { ok: "CheckCircle", no: "AlertOctagon", check: "AlertTriangle" };

/** 환불/교환 요청 구분 + 처리 조건 판단 근거 + 비용·일정 + 처리 현황 */
function RequestPanel({ session, order, stepLabel }: { session: Session; order?: Order; stepLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const req = session.request ?? {};
  const a = assessRequest(session, order);
  const flow = a.flow;
  const locked = !!a.submitted;
  const showReturnInputs = flow && flow !== "cancel" && !!order?.deliveredAt;

  return (
    <CrmCard
      title="환불·교환 요청"
      icon="RotateCcw"
      tone={stepLabel ? "info" : undefined}
      stepLabel={stepLabel}
      style={{ flexShrink: 0 }}
      actions={
        <CrmTabs
          variant="segmented"
          value={req.kind ?? ""}
          onChange={(id) => !locked && updateRequest({ kind: id as "refund" | "exchange" })}
          tabs={[
            { id: "refund", label: "환불", disabled: locked && req.kind !== "refund" },
            { id: "exchange", label: "교환", disabled: locked && req.kind !== "exchange" },
          ]}
        />
      }
    >
      {!flow ? (
        <div className="text-[13px] text-gray-600">
          고객이 환불을 원하는지 다른 옵션으로 교환을 원하는지 확인한 뒤 오른쪽에서 선택하세요. 선택에 따라 처리 단계·필수 안내·처리 버튼이
          바뀝니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-600">
            <CrmBadge tone="info" square>
              {FLOW_LABEL[flow]}
            </CrmBadge>
            {flow === "cancel"
              ? "결제 완료(출고 전) 주문 · 결제 승인 취소로 환불"
              : flow === "return"
                ? "출고된 주문 · 회수 후 검수를 거쳐 환불"
                : "회수 후 검수를 거쳐 교환 상품 출고"}
          </div>

          {showReturnInputs && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
              <CrmSelect
                size="sm"
                label="요청 사유"
                placeholder="미확인"
                disabled={locked}
                value={req.reason ?? ""}
                options={RETURN_REASONS}
                onChange={(e) => updateRequest({ reason: (e.target.value || undefined) as ReturnReason | undefined })}
              />
              {isDefectReason(req.reason) ? (
                <CrmSelect
                  size="sm"
                  label="불량·오배송 사진"
                  placeholder="미확인"
                  disabled={locked}
                  value={req.evidence ?? ""}
                  options={[
                    { value: "confirmed", label: "사진·내용 확인함" },
                    { value: "missing", label: "사진 없음" },
                  ]}
                  onChange={(e) => updateRequest({ evidence: (e.target.value || undefined) as "confirmed" | "missing" | undefined })}
                />
              ) : (
                <CrmSelect
                  size="sm"
                  label="상품 사용·훼손"
                  placeholder="미확인"
                  disabled={locked}
                  value={req.condition ?? ""}
                  options={[
                    { value: "intact", label: "미사용 · 훼손 없음" },
                    { value: "damaged", label: "사용·훼손 있음" },
                  ]}
                  onChange={(e) => updateRequest({ condition: (e.target.value || undefined) as "intact" | "damaged" | undefined })}
                />
              )}
              {flow === "exchange" && order && (
                <CrmSelect
                  size="sm"
                  label="희망 옵션"
                  style={{ gridColumn: "1 / -1" }}
                  placeholder={order.exchangeOptions?.length ? "미확인" : "옵션 정보 없음"}
                  disabled={locked || !order.exchangeOptions?.length}
                  value={req.exchangeOption ?? ""}
                  options={(order.exchangeOptions ?? []).map((o) => {
                    const diff = exchangePriceDiff(order, o.label) ?? 0;
                    return {
                      value: o.label,
                      label: `${o.label} · ${o.stock > 0 ? `재고 ${o.stock}` : "품절"}${diff ? ` · ${diff > 0 ? "+" : "−"}${fmtWon(Math.abs(diff))}` : ""}`,
                    };
                  })}
                  onChange={(e) => updateRequest({ exchangeOption: e.target.value || undefined })}
                />
              )}
            </div>
          )}

          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: `var(--${VERDICT_TONE[a.verdict] === "danger" ? "error" : VERDICT_TONE[a.verdict]}-200)`,
              background: `var(--${VERDICT_TONE[a.verdict] === "danger" ? "error" : VERDICT_TONE[a.verdict]}-25)`,
            }}
            aria-live="polite"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CrmBadge tone={VERDICT_TONE[a.verdict]} icon={VERDICT_ICON[a.verdict]} size="md">
                {VERDICT_LABEL[a.verdict]}
              </CrmBadge>
              <span className="text-sm font-semibold text-gray-900">{a.title}</span>
            </div>
            <div className="mb-1 text-xs font-semibold text-gray-500">판단 근거</div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {a.basis.map((b) => (
                <li key={b.id} className="flex items-start gap-2 text-[13px] leading-5">
                  <Icon
                    name={VERDICT_ICON[b.verdict]}
                    size={14}
                    className="mt-[3px] flex-none"
                    style={{ color: `var(--${b.verdict === "ok" ? "success" : b.verdict === "no" ? "error" : "warning"}-600)` }}
                  />
                  <span className="w-24 flex-none font-medium text-gray-700">{b.label}</span>
                  <span className="min-w-0 flex-1 text-gray-600">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {a.costs.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold text-gray-500">비용 · 예상 금액 · 일정</div>
              <CrmKeyValue labelWidth={84} items={a.costs} />
            </div>
          )}

          <CrmSuggestedReply
            context={`안내 문구 · ${VERDICT_LABEL[a.verdict]} 기준${copied ? " · 복사됨" : ""}`}
            text={a.script}
            onInsert={() => appendMemo(`[안내] ${a.script}`)}
            onCopy={() => {
              void navigator.clipboard?.writeText(a.script).then(() => setCopied(true));
            }}
          />

          {a.submitted && <RequestProgress session={session} flow={flow} />}
        </div>
      )}
    </CrmCard>
  );
}

/** 접수 이후 단계. 접수와 실제 환불·교환 완료를 구분해 보여 줍니다. */
function RequestProgress({ session, flow }: { session: Session; flow: RequestFlow }) {
  const find = (id: ActionId) => session.actions.find((a) => a.actionId === id);
  const received = (p?: PerformedAction) => ({ status: "done" as const, statusLabel: "접수됨", hint: p?.receiptNo });
  const items =
    flow === "cancel"
      ? [
          { id: "c1", label: "결제 취소 접수", ...received(find("payment_cancel")) },
          { id: "c2", label: "카드사 승인 취소 반영", hint: "영업일 기준 3~5일", status: "todo" as const, statusLabel: "미완료" },
        ]
      : flow === "return"
        ? [
            { id: "r1", label: "반품 회수 접수", ...received(find("return_pickup")) },
            { id: "r2", label: "회수 · 검수", hint: "회수 1~3일 · 검수 1~2영업일", status: "todo" as const, statusLabel: "예정" },
            find("refund")
              ? { id: "r3", label: "환불 요청", ...received(find("refund")) }
              : { id: "r3", label: "환불 요청", hint: "하단 '환불 요청'으로 접수", status: "current" as const, statusLabel: "요청 전" },
            { id: "r4", label: "환불 완료", hint: "검수 후 결제 수단으로 환불", status: "todo" as const, statusLabel: "미완료" },
          ]
        : [
            { id: "e1", label: "교환 접수", ...received(find("exchange")) },
            { id: "e2", label: "회수 · 검수", hint: "회수 1~3일 · 검수 1~2영업일", status: "todo" as const, statusLabel: "예정" },
            { id: "e3", label: "교환 상품 출고", hint: "출고 시 고객 문자 안내", status: "todo" as const, statusLabel: "미완료" },
          ];
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-gray-500">처리 현황 · 접수는 완료가 아닙니다</div>
      <CrmChecklist items={items} />
    </div>
  );
}

function ConversationCard({ session, hold }: { session: Session; hold: boolean }) {
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voice = useVoiceClassify({
    onStart: () => setVoiceError(null),
    onResult: (r) => addCallTranscript(r),
    onError: (msg) => setVoiceError(msg),
  });
  const intake = intakeResult(session);
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = session.transcripts.length;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, voice.status]);

  const suggestion = session.suggestion?.status === "open" ? session.suggestion : undefined;

  return (
    <CrmCard
      title="대화 기록"
      icon="Mic"
      badge={
        voice.status === "recording" ? (
          <CrmBadge tone="danger" dot>
            녹음 중
          </CrmBadge>
        ) : hold ? (
          <CrmBadge tone="warning" dot>
            보류 중
          </CrmBadge>
        ) : undefined
      }
      actions={<VoiceCaptureButtons voice={voice} size="xs" recordLabel="통화 음성 인식" />}
      // 중앙 컬럼이 스크롤되므로 최소 높이를 두고 남는 공간만 채웁니다.
      style={{ flex: "1 0 260px", minHeight: 260 }}
      bodyStyle={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div ref={scrollRef} className="crm-scroll flex min-h-0 flex-1 flex-col gap-3">
        {intake ? (
          <Bubble
            who="intake"
            time={session.intake.status === "done" ? fmtTime(session.intake.at) : undefined}
            text={intake.transcript}
            extra={intake.keyRequest && <CrmBadge tone="ai" icon="Cpu">AI 핵심 요청: {intake.keyRequest}</CrmBadge>}
          />
        ) : (
          <div className="text-center text-xs text-gray-400">
            {session.intake.status === "failed" ? "음성 접수 인식에 실패해 원문이 없습니다." : "음성 접수 없이 연결된 상담입니다."}
          </div>
        )}
        <div className="text-center text-xs font-medium text-gray-400">
          상담사 연결 {session.callStartedAt ? fmtTime(new Date(session.callStartedAt).toISOString()) : ""}
        </div>
        {session.transcripts.map((t) => (
          <Bubble
            key={t.id}
            who="call"
            time={fmtTime(t.at)}
            text={t.text}
            extra={
              <CrmBadge tone="ai" icon="Cpu">
                AI 분류 {categoryLabel(t.category)} · {Math.round(t.confidence * 100)}%
              </CrmBadge>
            }
          />
        ))}
        {voice.status === "uploading" && (
          <div className="flex items-center gap-2 text-[13px] text-gray-500">
            <Icon name="Loader" size={14} className="crm-spin" />
            통화 음성을 인식하는 중입니다.
          </div>
        )}
        {session.transcripts.length === 0 && voice.status === "idle" && (
          <div className="rounded-md border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500">
            실시간 통화 연동 전입니다. 고객 발화를 녹음하거나 파일로 올리면 텍스트로 변환하고, 문의 유형이 달라지면 AI가 변경을 제안합니다.
          </div>
        )}
      </div>
      {voice.status === "recording" && <RecordingIndicator level={voice.inputLevel} />}
      {voiceError && (
        <CrmInlineAlert tone="danger" title="통화 음성 인식에 실패했습니다" onClose={() => setVoiceError(null)}>
          {voiceError} 메모에 직접 기록하고 상담을 계속하세요.
        </CrmInlineAlert>
      )}
      {suggestion && (
        <CrmInlineAlert
          tone="ai"
          title={`문의 유형 변경 제안: ${categoryLabel(session.category ?? "other")} → ${categoryLabel(suggestion.category)}`}
          actions={
            <>
              <CrmButton size="xs" variant="ai" icon="Check" onClick={() => resolveSuggestion(true)}>
                제안 적용
              </CrmButton>
              <CrmButton size="xs" variant="tertiary" onClick={() => resolveSuggestion(false)}>
                현재 유형 유지
              </CrmButton>
            </>
          }
        >
          <CrmAILabel text="AI 제안" confidence={Math.round(suggestion.confidence * 100)} />
          <div className="mt-1">{suggestion.reason} 적용하면 처리 단계와 필수 안내가 바뀝니다.</div>
        </CrmInlineAlert>
      )}
    </CrmCard>
  );
}

function NoticeChecks({ playbook, session, current }: { playbook: Playbook; session: Session; current?: StepState }) {
  const active = current?.doneWhen.type === "notice";
  return (
    <div
      className={`flex flex-none flex-col gap-2 rounded-xl border bg-white p-3 ${active ? "border-brand-300" : "border-gray-200"}`}
      style={active ? { boxShadow: "0 0 0 1px var(--brand-300)" } : undefined}
    >
      <div className="flex items-center gap-1.5 text-[13px] font-semibold">
        필수 안내 체크
        <span className="font-normal text-gray-500">
          {playbook.notices.filter((n) => session.notices.includes(n.id)).length}/{playbook.notices.length}
        </span>
        {active && (
          <CrmBadge tone="info" square>
            지금
          </CrmBadge>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-2">
        {playbook.notices.map((n) => (
          <CrmCheckbox
            key={n.id}
            checked={session.notices.includes(n.id)}
            onChange={(v) => toggleNotice(n.id, v)}
            label={n.label}
            hint={n.requiredFor ? `${n.requiredFor.map((a) => ACTIONS[a].label).join("·")} 전 필수` : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function GuidePanel({
  session,
  playbook,
  steps,
}: {
  session: Session;
  playbook: Playbook;
  steps: StepState[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const policies = [...new Set([...playbook.policies, "p-privacy"])].map(policyById).filter((p) => !!p);
  const alerts = Object.entries(session.alerts);

  return (
    <CrmSidePanel
      title="상담 가이드"
      icon="Compass"
      subtitle="매뉴얼 기반 안내 · 처리는 상담사가 확정합니다"
      // 1280px 화면에서 중앙(대화·메모) 너비를 확보하도록 좌우 패널을 화면 너비에 맞춰 줄입니다.
      style={{ width: "clamp(300px, 24vw, 360px)" }}
    >
      {alerts.map(([id, st]) => {
        const notice = playbook.notices.find((n) => n.id === id);
        if (!notice) return null;
        const policy = notice.policyId ? policyById(notice.policyId) : undefined;
        const status = session.notices.includes(id) ? "applied" : st;
        return (
          <CrmPolicyAlert
            key={id}
            // 스크롤되는 패널(flex 컬럼) 안에서 overflow:hidden 카드가 눌리지 않게 합니다.
            style={{ flexShrink: 0 }}
            status={status}
            kind="필수 안내 누락"
            title={`${notice.label} 안내가 아직 체크되지 않았습니다`}
            policyName={policy?.name}
            revisedAt={policy?.revisedAt}
            policyText={policy?.text}
            suggestion={notice.script}
            onApply={() => {
              toggleNotice(id, true);
              appendMemo(`[안내] ${notice.script}`);
              setAlert(id, "applied");
            }}
            onLater={() => setAlert(id, "later")}
            onIgnore={() => setAlert(id, "ignored")}
          />
        );
      })}

      <CrmStepGuide
        title={`처리 단계 · ${playbook.title}`}
        detected={`${categoryLabel(playbook.category)} · ${session.categorySource === "ai" ? "AI 분류를 상담사가 확정" : "상담사 선택"}`}
        steps={steps.map((s) => ({
          label: s.optional ? `${s.label} (선택)` : s.label,
          hint: s.doneWhen.type === "manual" ? `${s.hint} 완료하면 눌러서 표시하세요.` : s.hint,
          target: s.target,
          status: s.status,
        }))}
        onStepClick={(_, i) => {
          const s = steps[i];
          if (s.doneWhen.type === "manual") toggleStep(s.id);
        }}
      />

      <div>
        <MiniLabel>고객 안내 문구 (매뉴얼)</MiniLabel>
        <div className="flex flex-col gap-2">
          {playbook.notices.map((n) => (
            <CrmSuggestedReply
              key={n.id}
              context={`${n.label}${session.notices.includes(n.id) ? " · 안내함" : ""}${copied === n.id ? " · 복사됨" : ""}`}
              text={n.script}
              used={session.usedReplies.includes(n.id)}
              onInsert={() => {
                appendMemo(`[안내] ${n.script}`);
                markReplyUsed(n.id);
              }}
              onCopy={() => {
                void navigator.clipboard?.writeText(n.script).then(() => setCopied(n.id));
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <MiniLabel>관련 정책</MiniLabel>
        {policies.map((p) => (
          <details key={p.id} className="border-b border-gray-100 py-2">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-gray-700">
              <Icon name="BookOpen" size={14} style={{ color: "var(--gray-400)" }} />
              <span className="flex-1">{p.name}</span>
              <span className="text-xs text-gray-400">{p.revisedAt}</span>
            </summary>
            <p className="mb-1 mt-2 text-xs leading-4.5 text-gray-700">{p.text}</p>
            <Link href={`/knowledge?policy=${p.id}`} target="_blank" className="text-xs font-medium">
              지식·매뉴얼에서 보기
            </Link>
          </details>
        ))}
      </div>
    </CrmSidePanel>
  );
}
