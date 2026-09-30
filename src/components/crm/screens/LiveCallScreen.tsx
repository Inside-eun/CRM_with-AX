"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CrmAILabel,
  CrmAvatar,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmCheckbox,
  CrmInlineAlert,
  CrmInput,
  CrmKeyValue,
  CrmPolicyAlert,
  CrmSidePanel,
  CrmStepGuide,
  CrmSuggestedReply,
  CrmTabs,
  CrmTextarea,
  CrmTimeline,
  Icon,
} from "@/design-system";
import {
  fmtDate,
  fmtDuration,
  fmtTime,
  fmtWon,
  maskEmail,
  maskPay,
  maskPhone,
  returnDaysLeft,
  returnDeadline,
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
  refundAmount,
  resolveSuggestion,
  selectOrder,
  sessionOrder,
  setAlert,
  setMemo,
  toggleHold,
  toggleNotice,
  toggleStep,
  verifyIdentity,
} from "@/lib/crm/operations";
import {
  ACTIONS,
  COMMON_ACTIONS,
  PLAYBOOKS,
  actionBlockedReason,
  policyById,
  stepStates,
  type Playbook,
  type StepState,
} from "@/lib/crm/playbooks";
import type { ActionId, CrmState, Customer, Order, PerformedAction, Session } from "@/lib/crm/types";
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
  const playbook = PLAYBOOKS[session.category ?? "other"];
  const steps = stepStates(playbook, session);
  const current = steps.find((s) => s.status === "current");
  const pending = steps.filter((s) => s.status !== "done" && !s.optional);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 통화 헤더 */}
      <div className="relative flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
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
          <span className="text-base font-semibold">{customer.name}</span>
          <GradeBadge grade={customer.grade} />
          <span className="text-[13px] text-gray-500">{session.verified ? customer.phone : maskPhone(customer.phone)}</span>
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
        <div className="flex-1" />
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
        {/* 좌측: 본인 확인 · 고객 · 주문 */}
        <div className="crm-scroll flex w-[320px] flex-none flex-col gap-3 border-r border-gray-200 bg-gray-50 p-4">
          <IdentityCard session={session} customer={customer} isCurrent={current?.id === "verify"} />
          <CustomerCard customer={customer} verified={session.verified} />
          <LeftTabs state={state} session={session} order={order} currentStepId={current?.id} />
        </div>

        {/* 중앙: 대화 · 메모 · 필수 안내 */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <ConversationCard session={session} hold={hold} />
          <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-3">
            <CrmTextarea
              label="상담 메모"
              rows={5}
              value={session.memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="고객 요청과 안내 내용을 메모하세요. 처리 기능을 실행하면 자동으로 기록됩니다."
              headerRight={<span className="text-xs text-gray-400">입력 즉시 저장됩니다</span>}
            />
            <NoticeChecks playbook={playbook} session={session} current={current} />
          </div>
        </div>

        {/* 우측: 상담 가이드 */}
        <GuidePanel session={session} playbook={playbook} steps={steps} />
      </div>

      {/* 하단 처리 기능 */}
      <div
        className="relative flex flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-6 py-3"
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
            {lastDone.label} 완료{lastDone.receiptNo ? ` · ${lastDone.receiptNo}` : ""}
          </CrmBadge>
        )}
        <div className="flex-1" />
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Icon name={session.verified ? "Info" : "Lock"} size={14} />
          {session.verified
            ? "현재 단계와 관련된 버튼만 강조됩니다"
            : "본인 확인 전에는 담당자 이관·콜백 외 처리 기능을 쓸 수 없습니다"}
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

function IdentityCard({ session, customer, isCurrent }: { session: Session; customer: Customer; isCurrent: boolean }) {
  const [birth, setBirth] = useState("");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (session.verified) {
    return (
      <CrmInlineAlert tone="success" icon="Shield" title="본인 확인 완료">
        {session.verifiedAt && `${fmtTime(session.verifiedAt)} · `}생년월일·휴대폰 뒤 4자리 일치
      </CrmInlineAlert>
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
    <CrmCard title="본인 확인" icon="Lock" tone="warning" stepLabel={isCurrent ? "STEP 1" : undefined}>
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
          <div className="flex items-center gap-2">
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

function CustomerCard({ customer, verified }: { customer: Customer; verified: boolean }) {
  return (
    <CrmCard
      title="고객 정보"
      icon="User"
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
          { label: "이메일", value: verified ? customer.email : maskEmail(customer.email) },
          { label: "배송지", value: verified ? customer.address : customer.addressShort },
          { label: "결제", value: verified ? customer.payMethods.join(", ") : customer.payMethods.map(maskPay).join(", ") },
          { label: "가입", value: fmtDate(customer.since) },
          { label: "누적 주문", value: `${customer.orderCount}건 · ${fmtWon(customer.ltv)}` },
        ]}
      />
      <div className="mt-2.5 flex flex-wrap gap-1">
        {customer.tags.map((t) => (
          <CrmBadge key={t}>{t}</CrmBadge>
        ))}
      </div>
    </CrmCard>
  );
}

function LeftTabs({
  state,
  session,
  order,
  currentStepId,
}: {
  state: CrmState;
  session: Session;
  order?: Order;
  currentStepId?: string;
}) {
  const [tab, setTab] = useState("orders");
  const orders = customerOrders(state, session.customerId);
  const past = state.history.filter((h) => h.customerId === session.customerId);
  const deadline = order ? returnDeadline(order) : undefined;
  const left = order ? returnDaysLeft(order) : undefined;
  const pickupDone = session.actions.some((a) => a.actionId === "return_pickup");

  return (
    <>
      <CrmTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "orders", label: "관련 주문", count: orders.length },
          { id: "calls", label: "상담 이력", count: past.length },
        ]}
      />
      {tab === "orders" ? (
        <>
          {order ? (
            <CrmCard
              title={order.item}
              subtitle={`${order.option} · ${fmtWon(order.price)}`}
              tone="info"
              stepLabel={currentStepId === "order" ? "STEP 2" : "문의 대상"}
              footer={
                session.orderConfirmed ? (
                  <CrmBadge tone="success" icon="Check">
                    고객 확인 완료
                  </CrmBadge>
                ) : (
                  <CrmButton size="sm" variant={currentStepId === "order" ? "primary" : "secondary"} icon="Check" onClick={confirmOrder}>
                    고객에게 주문 확인함
                  </CrmButton>
                )
              }
            >
              <CrmKeyValue
                labelWidth={84}
                items={[
                  { label: "주문번호", value: order.no, mono: true },
                  { label: "주문 상태", value: order.status, highlight: currentStepId === "status" || currentStepId === "tracking" },
                  { label: "결제", value: session.verified ? order.payMethod : maskPay(order.payMethod) },
                  { label: "승인번호", value: session.verified ? order.approvalNo : "본인 확인 후 표시", mono: session.verified },
                  order.deliveredAt
                    ? { label: "배송 완료일", value: fmtDate(order.deliveredAt) }
                    : { label: "출고일", value: order.shippedAt ? fmtDate(order.shippedAt) : "출고 전" },
                  ...(deadline && left !== undefined
                    ? [
                        {
                          label: "반품 기한",
                          value: `${fmtDate(deadline)} (${left < 0 ? "기간 경과" : left === 0 ? "오늘까지" : `D-${left}`})`,
                          highlight: currentStepId === "period",
                          tone: left < 0 ? ("danger" as const) : undefined,
                        },
                      ]
                    : []),
                  ...(session.category === "refund_exchange"
                    ? [
                        {
                          label: "환불 예정",
                          value: pickupDone ? fmtWon(refundAmount(session, order.price)) : "회수 접수 후 산정",
                          highlight: currentStepId === "refund",
                        },
                      ]
                    : []),
                ]}
              />
            </CrmCard>
          ) : (
            <CrmInlineAlert tone="warning">관련 주문이 없습니다. 아래 목록에서 선택하세요.</CrmInlineAlert>
          )}
          {orders
            .filter((o) => o.no !== order?.no)
            .map((o) => (
              <button
                key={o.no}
                type="button"
                onClick={() => selectOrder(o.no)}
                className="crm-row-hover rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left"
                title="이 주문을 문의 대상으로 선택"
              >
                <div className="flex justify-between text-[13px] font-medium">
                  <span>{o.item}</span>
                  <span className="text-gray-500">{fmtDate(o.orderedAt).slice(5)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {fmtWon(o.price)} · {o.status}
                </div>
              </button>
            ))}
        </>
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
    </>
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
      style={{ flex: 1, minHeight: 0 }}
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
      {voice.status === "recording" && <RecordingIndicator />}
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
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3 ${active ? "border-brand-300" : "border-gray-200"}`}
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
    <CrmSidePanel title="상담 가이드" icon="Compass" subtitle="매뉴얼 기반 안내 · 처리는 상담사가 확정합니다">
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
