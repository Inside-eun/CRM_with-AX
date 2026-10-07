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
  CrmConfidence,
  CrmInlineAlert,
  CrmKeyValue,
  CrmSelect,
  CrmSkeleton,
  CrmTimeline,
  Icon,
} from "@/design-system";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { fmtDate, fmtDuration, fmtTime, fmtWon, maskPay, maskPhone, returnDaysLeft, returnDeadline } from "@/lib/crm/format";
import {
  LOW_CONFIDENCE,
  categoryLabel,
  confirmCategory,
  connectCall,
  customerOrders,
  intakeResult,
  selectOrder,
  setIntake,
} from "@/lib/crm/operations";
import { ACTIONS, PLAYBOOKS, briefingChecks, suggestOrder } from "@/lib/crm/playbooks";
import type { CrmState, Customer, Order, Session } from "@/lib/crm/types";
import { useVoiceClassify, type ClassifyResult } from "@/lib/useVoiceClassify";
import { ConsultGuard } from "../ConsultGuard";
import { RecordingIndicator, VoiceCaptureButtons } from "../VoiceCapture";
import {
  AICategoryBadge,
  APP_STARTED_AT,
  Bubble,
  ConfirmedCategoryBadge,
  GradeBadge,
  MiniLabel,
  PageHeader,
  STAGE_ROUTES,
  useNow,
} from "../ui";

export function BriefingScreen() {
  return <ConsultGuard stage="briefing">{(ctx) => <Briefing {...ctx} />}</ConsultGuard>;
}

function Briefing({ state, session }: { state: CrmState; session: Session }) {
  const router = useRouter();
  const now = useNow();
  const customer = state.customers[session.customerId];
  const queueItem = state.queue.find((q) => q.id === session.queueId);
  const intake = intakeResult(session);
  const aiPick = intake && intake.confidence >= LOW_CONFIDENCE ? intake.category : undefined;
  const previewCategory = session.category ?? aiPick;
  const orders = customerOrders(state, customer.id);
  const order = session.orderNo ? orders.find((o) => o.no === session.orderNo) : suggestOrder(previewCategory, orders);
  const past = state.history.filter((h) => h.customerId === customer.id);
  const wait = queueItem ? fmtDuration(queueItem.waitSeconds + (now - APP_STARTED_AT) / 1000) : undefined;

  // 자동 음성 접수(AI 음성봇)는 아직 연동 전이라, 녹음·업로드는 데모 입력 영역에서만 합니다.
  const [demoOpen, setDemoOpen] = useState(false);
  const voice = useVoiceClassify({
    onResult: (result) => setIntake({ status: "done", result, at: new Date().toISOString() }),
    onError: (error) => setIntake({ status: "failed", error, at: new Date().toISOString() }),
  });

  const connect = () => {
    if (!session.orderNo && order) selectOrder(order.no);
    connectCall();
    router.push(STAGE_ROUTES.live);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        eyebrow={
          <>
            <Link href="/">상담 홈</Link>
            <Icon name="ChevronRight" size={14} />
            다음 고객 사전 브리핑
          </>
        }
        title={customer.name}
        meta={`${customer.gender} · ${customer.age}세 · ${maskPhone(customer.phone)} · 가입 ${fmtDate(customer.since)} · 누적 주문 ${customer.orderCount}건`}
        actions={
          <>
            {wait && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600">
                <Icon name="Clock" size={16} />
                고객 대기 <b className="tabular-nums text-gray-900">{wait}</b>
              </span>
            )}
            <Link href="/" className="crm-btn secondary md">
              대기열로
            </Link>
            <CrmButton variant="primary" size="lg" icon="PhoneCall" disabled={!session.category} onClick={connect}>
              고객 연결
            </CrmButton>
          </>
        }
      >
        <GradeBadge grade={customer.grade} />
        {session.category ? (
          <ConfirmedCategoryBadge category={session.category} source={session.categorySource} />
        ) : (
          intake && <AICategoryBadge category={intake.category} confidence={intake.confidence} />
        )}
      </PageHeader>

      {!session.category && (
        <CrmInlineAlert tone="info" title="문의 유형을 확정하면 고객을 연결할 수 있습니다">
          접수 내용과 AI 분류를 확인하고 유형을 확정하세요. AI 분류 결과가 없거나 실패해도 문의 유형을 직접 선택해 상담을 진행할 수 있습니다.
        </CrmInlineAlert>
      )}

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_320px] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <IntakeSummaryCard session={session} voice={voice} onOpenDemo={() => setDemoOpen(true)} />
          <ClassificationCard key={session.intake.status === "none" ? "none" : session.intake.at} session={session} intake={intake} />
          <DemoVoiceInput session={session} voice={voice} open={demoOpen} onToggle={() => setDemoOpen((v) => !v)} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <CrmCard
            title="상담 전 확인 사항"
            icon="Clipboard"
            badge={
              <CrmBadge tone="neutral" icon="BookOpen">
                매뉴얼 기준
              </CrmBadge>
            }
          >
            {previewCategory ? (
              <>
                {!session.category && (
                  <div className="mb-3 text-xs text-gray-500">
                    AI 제안 유형({categoryLabel(previewCategory)}) 기준 미리보기입니다. 유형을 확정하면 반영됩니다.
                  </div>
                )}
                {PLAYBOOKS[previewCategory].actions.length > 0 && (
                  <>
                    <MiniLabel>예상 처리 업무</MiniLabel>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {PLAYBOOKS[previewCategory].actions.map((id) => (
                        <CrmBadge key={id} tone="info" size="md" icon={ACTIONS[id].icon}>
                          {ACTIONS[id].label}
                        </CrmBadge>
                      ))}
                    </div>
                  </>
                )}
                <MiniLabel>필요한 확인 사항</MiniLabel>
                <CrmChecklist items={briefingChecks(previewCategory, customer, order, state.history)} />
              </>
            ) : (
              <div className="text-[13px] text-gray-500">문의 유형을 확정하면 확인 사항과 예상 처리 업무가 표시됩니다.</div>
            )}
          </CrmCard>

          <CrmCard title="이전 상담 이력" icon="Clock" subtitle={`이 고객 · ${past.length}건`}>
            {past.length === 0 ? (
              <div className="text-[13px] text-gray-500">이전 상담 이력이 없습니다.</div>
            ) : (
              <CrmTimeline
                compact
                items={past.slice(0, 3).map((h) => ({
                  title: categoryLabel(h.category),
                  meta: `${fmtDate(h.startedAt)} · ${h.agent}`,
                  desc: h.summary.request,
                  icon: h.actions[0] ? ACTIONS[h.actions[0].actionId].icon : "MessageSquare",
                  tone: h.category === previewCategory ? "info" : "neutral",
                  extra: (
                    <Link href={`/history/${h.id}`} className="text-xs font-medium">
                      상세 보기
                    </Link>
                  ),
                }))}
              />
            )}
          </CrmCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <OrderCard orders={orders} order={order} session={session} highlightReturn={previewCategory === "refund_exchange"} />
          <CustomerNotes customer={customer} />
        </div>
      </div>
    </div>
  );
}

type Voice = ReturnType<typeof useVoiceClassify>;

/** 이미 접수된 고객 발화. 실제 업무에서는 AI 음성봇이 접수한 내용이 여기에 먼저 보입니다. */
function IntakeSummaryCard({ session, voice, onOpenDemo }: { session: Session; voice: Voice; onOpenDemo: () => void }) {
  const intake = session.intake;
  const processing = voice.status === "recording" || voice.status === "uploading";
  return (
    <CrmCard
      title="접수된 고객 발화"
      icon="MessageSquare"
      subtitle={
        intake.status === "done"
          ? `접수 ${fmtTime(intake.at)} · 음성 인식(STT) 원문을 그대로 보여 줍니다`
          : "고객이 상담 연결 전에 남긴 음성 메시지"
      }
      badge={
        intake.status === "done" ? (
          <CrmBadge tone="neutral" square title="자동 음성 접수 연동 전이라 데모 입력으로 접수한 내용입니다">
            데모 입력
          </CrmBadge>
        ) : undefined
      }
    >
      {processing ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <Icon name="Loader" size={16} className="crm-spin" />
            {voice.status === "recording"
              ? "데모 음성 입력에서 녹음 중입니다."
              : "음성을 텍스트로 변환하고 문의 유형을 분류하는 중입니다."}
          </div>
          {voice.status === "uploading" && <CrmSkeleton lines={3} />}
        </div>
      ) : intake.status === "done" ? (
        <Bubble who="intake" time={fmtTime(intake.at)} text={intake.result.transcript} />
      ) : intake.status === "failed" ? (
        <CrmInlineAlert tone="danger" title="음성 인식에 실패했습니다">
          {intake.error} 아래에서 문의 유형을 직접 선택해 상담을 진행하세요.
        </CrmInlineAlert>
      ) : intake.status === "skipped" ? (
        <CrmInlineAlert tone="neutral" title="음성 접수 없이 진행합니다">
          아래에서 문의 유형을 직접 선택하세요. 고객 연결 후 통화 중에 내용을 확인하면 됩니다.
        </CrmInlineAlert>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <div className="text-[13px] leading-5 text-gray-600">
            접수된 고객 발화가 없습니다. 자동 음성 접수(AI 음성봇)는 아직 연동되지 않아 접수 내용이 자동으로 들어오지 않습니다. 문의 유형을 직접
            선택해 진행하거나, 데모 음성 입력으로 접수 과정을 시연할 수 있습니다.
          </div>
          <CrmButton variant="link" size="sm" icon="Mic" onClick={onOpenDemo}>
            데모 음성 입력 열기
          </CrmButton>
        </div>
      )}
    </CrmCard>
  );
}

/** 데모용 음성 입력 (녹음·파일 업로드). 실제 업무 흐름과 구분해 접어 둡니다. */
function DemoVoiceInput({
  session,
  voice,
  open,
  onToggle,
}: {
  session: Session;
  voice: Voice;
  open: boolean;
  onToggle: () => void;
}) {
  const intake = session.intake;
  const busy = voice.status === "recording" || voice.status === "uploading";
  const expanded = open || busy;
  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={expanded}
        onClick={busy ? undefined : onToggle}
      >
        <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={16} style={{ color: "var(--gray-500)" }} />
        <span className="text-[13px] font-semibold text-gray-700">데모 음성 입력</span>
        <CrmBadge tone="neutral" square>
          DEMO
        </CrmBadge>
        <span className="min-w-0 flex-1 truncate text-xs text-gray-500">자동 음성 접수 연동 전 시연용 · 녹음 또는 오디오 파일</span>
        {voice.status === "recording" && (
          <CrmBadge tone="danger" dot>
            녹음 중
          </CrmBadge>
        )}
      </button>
      {expanded && (
        <div className="flex flex-col items-start gap-3 border-t border-dashed border-gray-300 px-4 py-3">
          <p className="m-0 text-xs leading-[18px] text-gray-600">
            실제 업무에서는 AI 음성봇이 접수한 내용이 위에 자동으로 표시됩니다. 지금은 연동 전이라 고객 음성 메시지를 직접 녹음하거나 파일로
            올려 텍스트 변환(Whisper)과 AI 분류를 시연합니다.
          </p>
          {voice.status === "recording" && <RecordingIndicator level={voice.inputLevel} />}
          <VoiceCaptureButtons voice={voice} size="sm" recordLabel={intake.status === "done" ? "다시 녹음" : "녹음 시작"} />
          {voice.audioUrl && voice.status === "idle" && (
            <audio controls src={voice.audioUrl} className="h-9 w-full">
              <track kind="captions" />
            </audio>
          )}
          {intake.status === "none" && (
            <CrmButton variant="link" size="sm" onClick={() => setIntake({ status: "skipped", at: new Date().toISOString() })}>
              음성 접수 없이 진행
            </CrmButton>
          )}
        </div>
      )}
    </section>
  );
}

function ClassificationCard({ session, intake }: { session: Session; intake?: ClassifyResult }) {
  const pct = intake ? Math.round(intake.confidence * 100) : 0;
  const low = !!intake && intake.confidence < LOW_CONFIDENCE;
  const [pick, setPick] = useState<CategoryId | "">(session.category ?? (intake && !low ? intake.category : ""));
  const confirmed = !!session.category && session.category === pick;
  const source: "ai" | "agent" = intake && !low && pick === intake.category ? "ai" : "agent";

  return (
    <CrmCard
      title={intake ? "AI 문의 분류 · 요약" : "문의 유형"}
      icon={intake ? "Cpu" : "Tag"}
      tone={intake ? "ai" : undefined}
      badge={intake ? <CrmAILabel text="AI 생성" /> : undefined}
      actions={intake ? <CrmConfidence value={pct} label="분류 신뢰도" /> : undefined}
    >
      {intake ? (
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold leading-7 text-gray-900">{intake.keyRequest ?? intake.reason}</div>
          {intake.details && intake.details.length > 0 && (
            <ul className="m-0 list-disc pl-[18px] text-sm leading-[22px] text-gray-700">
              {intake.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            AI 제안 유형 <AICategoryBadge category={intake.category} confidence={intake.confidence} />
            <span>분류 근거: {intake.reason}</span>
          </div>
          {low && (
            <CrmInlineAlert tone="warning" title={`AI 분류 신뢰도가 낮습니다 (${pct}%)`}>
              AI 제안({categoryLabel(intake.category)})을 자동으로 선택하지 않았습니다. 원문을 읽고 문의 유형을 직접 선택하세요.
            </CrmInlineAlert>
          )}
        </div>
      ) : (
        <div className="text-[13px] text-gray-600">
          {session.intake.status === "none"
            ? "AI 분류 결과가 없습니다. 접수 내용이 들어오면 AI가 문의 유형과 핵심 요청을 제안합니다. 지금은 문의 유형을 직접 선택해 진행하세요."
            : "AI 분류 결과가 없습니다. 문의 유형을 직접 선택하면 해당 유형의 처리 단계로 상담을 진행할 수 있습니다."}
        </div>
      )}

      <div className={`mt-4 flex flex-wrap items-end gap-3 border-t pt-4 ${intake ? "border-teal-200" : "border-gray-200"}`}>
        <CrmSelect
          label="문의 유형"
          ai={!!intake && !low && pick === intake.category && !confirmed}
          value={pick}
          placeholder="유형 선택"
          onChange={(e) => setPick(e.target.value as CategoryId | "")}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          style={{ width: 200 }}
        />
        {confirmed ? (
          <CrmBadge tone="success" size="md" icon="CheckCircle">
            확정됨 · {session.categorySource === "ai" ? "AI 제안 확정" : "상담사 선택"}
          </CrmBadge>
        ) : (
          <CrmButton variant="primary" icon="Check" disabled={!pick} onClick={() => pick && confirmCategory(pick, source)}>
            {session.category ? "이 유형으로 변경" : "이 유형으로 확정"}
          </CrmButton>
        )}
        <span className="pb-2.5 text-xs text-gray-500">
          {intake ? "AI 분류는 제안입니다. 틀리면 바꾼 뒤 확정하세요." : "선택한 유형으로 처리 단계와 확인 사항이 정해집니다."}
        </span>
      </div>
    </CrmCard>
  );
}

function OrderCard({
  orders,
  order,
  session,
  highlightReturn,
}: {
  orders: Order[];
  order?: Order;
  session: Session;
  highlightReturn: boolean;
}) {
  const deadline = order ? returnDeadline(order) : undefined;
  const left = order ? returnDaysLeft(order) : undefined;
  return (
    <CrmCard title="관련 주문" icon="Package" tone="info" stepLabel="문의 대상">
      {!order ? (
        <div className="text-[13px] text-gray-500">주문 내역이 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-md bg-gray-100 text-gray-400">
              <Icon name="Image" size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">{order.item}</div>
              <div className="text-[13px] text-gray-500">
                {order.option} · {order.qty}개 · {fmtWon(order.price)}
              </div>
            </div>
          </div>
          <CrmKeyValue
            labelWidth={84}
            items={[
              { label: "주문번호", value: order.no, mono: true },
              { label: "주문 상태", value: order.status },
              { label: "결제", value: maskPay(order.payMethod) },
              order.deliveredAt
                ? { label: "배송 완료일", value: fmtDate(order.deliveredAt), highlight: highlightReturn }
                : { label: "출고일", value: order.shippedAt ? fmtDate(order.shippedAt) : "출고 전" },
              ...(deadline && left !== undefined
                ? [
                    {
                      label: "반품 기한",
                      value: `${fmtDate(deadline)} (${left < 0 ? "기간 경과" : left === 0 ? "오늘까지" : `D-${left}`})`,
                      highlight: highlightReturn,
                      tone: left < 0 ? ("danger" as const) : undefined,
                    },
                  ]
                : []),
            ]}
          />
          {orders.length > 1 && (
            <CrmSelect
              label="다른 주문 선택"
              size="sm"
              value={order.no}
              onChange={(e) => selectOrder(e.target.value)}
              options={orders.map((o) => ({ value: o.no, label: `${o.item} · ${o.status}` }))}
            />
          )}
          <div className="text-xs text-gray-500">
            {session.orderNo ? "통화 중 고객에게 문의 대상 주문이 맞는지 확인하세요." : "문의 유형 기준으로 추정한 주문입니다. 통화 중 고객에게 확인하세요."}
          </div>
        </div>
      )}
    </CrmCard>
  );
}

function CustomerNotes({ customer }: { customer: Customer }) {
  return (
    <>
      {customer.caution ? (
        <CrmInlineAlert tone="warning" title="주의 사항">
          {customer.caution}
        </CrmInlineAlert>
      ) : (
        <CrmInlineAlert tone="neutral" title="특이사항 없음">
          주의 고객 이력과 미해결 VOC가 없습니다.
        </CrmInlineAlert>
      )}
      <CrmInlineAlert tone="neutral" icon="Lock" title="본인 확인 전입니다">
        연락처 전체, 주소, 결제 정보는 고객 연결 후 본인 확인을 마치면 표시됩니다.
      </CrmInlineAlert>
    </>
  );
}
