"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  selectDemoScenario,
  selectOrder,
  setIntake,
} from "@/lib/crm/operations";
import {
  DEMO_SCENARIOS,
  NUMBER_MARK,
  checkAudioAvailable,
  demoScenario,
  savedAnalysis,
  scenarioOrder,
} from "@/lib/crm/demo-scenarios";
import { ACTIONS, PLAYBOOKS, briefingChecks, suggestOrder } from "@/lib/crm/playbooks";
import type { CrmState, Customer, DemoScenarioId, Order, Session } from "@/lib/crm/types";
import type { ClassifyResult } from "@/lib/useVoiceClassify";
import { ConsultGuard } from "../ConsultGuard";
import { DemoGuide } from "../DemoGuide";
import {
  AICategoryBadge,
  APP_STARTED_AT,
  ConfirmedCategoryBadge,
  GradeBadge,
  IntakeTranscript,
  MiniLabel,
  PageHeader,
  STAGE_ROUTES,
  intakeSourceLabel,
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

  // 자동 음성 접수(AI 음성봇)는 아직 연동 전이라 데모 음성으로 접수 과정을 체험합니다.
  // AI 분석은 방문자가 'AI 분석 시작'을 누를 때만, 미리 실행해 저장한 결과를 불러옵니다(크레딧 절약).
  const [testOpen, setTestOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const analyze = (id: DemoScenarioId) => {
    if (loading) return;
    setLoading(true);
    void loadScenarioAnalysis(id).then((ok) => {
      setLoading(false);
      // 결과를 불러오면 테스트 영역을 접어 원문·AI 분류가 바로 보이게 합니다.
      if (ok) setTestOpen(false);
    });
  };

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

      <DemoGuide session={session} />

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_320px] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <IntakeSummaryCard
            state={state}
            session={session}
            loading={loading}
            onAnalyze={analyze}
            testOpen={testOpen}
            onToggleTest={() => setTestOpen((v) => !v)}
          />
          <ClassificationCard key={session.intake.status === "none" ? "none" : session.intake.at} session={session} intake={intake} />
          {session.intake.status === "none" && (
            <CrmButton variant="link" size="sm" onClick={() => setIntake({ status: "skipped", at: new Date().toISOString() })}>
              음성 접수 없이 진행
            </CrmButton>
          )}
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

/** 저장해 둔 데모 음성 분석 결과를 불러옵니다. 실제 API는 호출하지 않습니다. */
async function loadScenarioAnalysis(id: DemoScenarioId): Promise<boolean> {
  const saved = savedAnalysis(id);
  // 결과를 바로 넣으면 단계 전환을 알아보기 어려워 짧게 불러오는 상태를 보여 줍니다.
  await new Promise((r) => setTimeout(r, 700));
  if (!saved) {
    setIntake({
      status: "failed",
      error: "이 음성의 저장된 분석 결과가 없습니다.",
      at: new Date().toISOString(),
      source: { kind: "scenario", scenarioId: id },
    });
    return false;
  }
  setIntake({
    status: "done",
    result: saved.result,
    at: new Date().toISOString(),
    source: { kind: "scenario", scenarioId: id },
    recording: saved.recording,
    analyzedAt: saved.analyzedAt,
  });
  return true;
}

/**
 * 접수 음성. 실제 업무에서는 AI 음성봇이 접수한 내용이 여기에 먼저 보입니다.
 * 고객 단독 음성은 '고객 사전 접수', 화자를 구분하지 못한 녹음은 '상담 녹음 원문'으로 구분합니다.
 */
function IntakeSummaryCard({
  state,
  session,
  loading,
  onAnalyze,
  testOpen,
  onToggleTest,
}: {
  state: CrmState;
  session: Session;
  loading: boolean;
  onAnalyze: (id: DemoScenarioId) => void;
  testOpen: boolean;
  onToggleTest: () => void;
}) {
  const intake = session.intake;
  const recording = intake.status === "done" ? (intake.recording ?? "customer") : undefined;
  const sourceLabel = intake.status === "done" || intake.status === "failed" ? intakeSourceLabel(intake.source) : undefined;
  const failedScenario = intake.status === "failed" && intake.source?.kind === "scenario" ? intake.source.scenarioId : undefined;
  return (
    <CrmCard
      title={recording === "call" ? "상담 녹음 원문" : recording === "unknown" ? "업로드 음성 원문" : "접수된 고객 발화"}
      icon="MessageSquare"
      // 자동 음성 접수 연동 전이라 체험용 입력의 출처(데모 음성 ① 등)를 부제에 함께 적습니다.
      subtitle={
        intake.status === "done"
          ? `${recording === "customer" ? "고객 사전 접수" : "화자 미구분 녹음"} · ${sourceLabel ? `${sourceLabel} · ` : ""}접수 ${fmtTime(intake.at)}`
          : sourceLabel ?? "고객이 상담 연결 전에 남긴 음성 메시지"
      }
      actions={
        <CrmButton size="xs" variant={testOpen ? "tertiary" : "ai"} icon={testOpen ? "ChevronUp" : "Mic"} onClick={onToggleTest}>
          {testOpen ? "테스트 접기" : "고객 음성 분류 테스트하기"}
        </CrmButton>
      }
    >
      <div className="flex flex-col gap-3">
        {testOpen && <ScenarioPicker state={state} session={session} loading={loading} onAnalyze={onAnalyze} />}
        {loading ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <div className="flex items-center gap-2 text-[13px] text-gray-600">
              <Icon name="Loader" size={16} className="crm-spin" />
              저장된 AI 분석 결과(음성 인식·문의 분류)를 불러오는 중입니다.
            </div>
            <CrmSkeleton lines={3} />
          </div>
        ) : intake.status === "done" ? (
          <div className="flex flex-col gap-1.5">
            <IntakeTranscript text={intake.result.transcript} time={fmtTime(intake.at)} recording={recording} />
            {intake.analyzedAt && (
              <div className="text-[11px] text-gray-400">
                이 음성은 {fmtDate(intake.analyzedAt)}에 AI로 분석해 저장한 결과를 보여 줍니다 (방문 시마다 다시 분석하지 않음).
              </div>
            )}
          </div>
        ) : intake.status === "failed" ? (
          <CrmInlineAlert
            tone="danger"
            title="AI 분석 결과를 불러오지 못했습니다"
            actions={
              failedScenario ? (
                <CrmButton size="sm" icon="RefreshCw" disabled={loading} onClick={() => onAnalyze(failedScenario)}>
                  다시 시도
                </CrmButton>
              ) : undefined
            }
          >
            {intake.error} 다시 시도하거나, 아래에서 문의 유형을 직접 선택해 상담을 진행하세요.
          </CrmInlineAlert>
        ) : intake.status === "skipped" ? (
          <CrmInlineAlert tone="neutral" title="음성 접수 없이 진행합니다">
            아래에서 문의 유형을 직접 선택하세요. 고객 연결 후 통화 중에 내용을 확인하면 됩니다.
          </CrmInlineAlert>
        ) : (
          !testOpen && (
            <div className="text-[13px] leading-5 text-gray-600">
              접수된 고객 발화가 없습니다. 자동 음성 접수(AI 음성봇)는 아직 연동되지 않았습니다. &lsquo;고객 음성 분류 테스트하기&rsquo;로
              데모 음성을 분석하거나, 문의 유형을 직접 선택해 진행하세요.
            </div>
          )
        )}
      </div>
    </CrmCard>
  );
}

/** 데모 음성 3개 중 하나를 골라 듣고 AI 분석(저장된 결과)을 시작합니다. */
function ScenarioPicker({
  state,
  session,
  loading,
  onAnalyze,
}: {
  state: CrmState;
  session: Session;
  loading: boolean;
  onAnalyze: (id: DemoScenarioId) => void;
}) {
  const selected = session.demoScenarioId;
  const sc = selected ? demoScenario(selected) : undefined;
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let alive = true;
    DEMO_SCENARIOS.forEach((d) =>
      void checkAudioAvailable(d.audioSrc).then((ok) => alive && setAvailable((m) => ({ ...m, [d.id]: ok }))),
    );
    return () => {
      alive = false;
    };
  }, []);
  const order = sc ? scenarioOrder(state, sc) : undefined;
  const ready = sc ? available[sc.id] : undefined;
  const hasResult = sc ? !!savedAnalysis(sc.id) : false;
  const analyzed = session.intake.status === "done" && session.intake.source?.kind === "scenario";
  const hasProgress = session.intake.status !== "none" || !!session.category;
  // 음성 파일이 없거나 저장된 분석 결과가 없으면 준비 중으로 표시합니다.
  const statusOf = (id: DemoScenarioId) =>
    available[id] === false ? "음성 준비 중" : available[id] && !savedAnalysis(id) ? "분석 결과 준비 중" : undefined;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-teal-200 bg-teal-25 p-3">
      <div className="text-xs font-semibold text-gray-600">데모 음성 선택</div>
      <div role="radiogroup" aria-label="데모 음성" className="flex flex-col gap-1">
        {DEMO_SCENARIOS.map((d) => {
          const on = d.id === selected;
          const status = statusOf(d.id);
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={loading}
              onClick={() => !on && selectDemoScenario(d.id)}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] ${
                on ? "border-teal-600 bg-white font-semibold text-gray-900" : "border-transparent text-gray-700 hover:bg-white"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="w-4 text-center text-teal-700">{NUMBER_MARK[d.no]}</span>
              <span className="flex-1">{d.label}</span>
              {status && (
                <CrmBadge tone="neutral" square>
                  {status}
                </CrmBadge>
              )}
            </button>
          );
        })}
      </div>
      {hasProgress && !loading && (
        <div className="text-xs text-gray-500">다른 음성을 고르면 지금의 분석 결과·유형 확정·주문 확인 상태가 초기화됩니다.</div>
      )}
      {sc && (
        <div className="flex flex-col gap-2 border-t border-teal-200 pt-2.5">
          <div className="text-[13px] leading-5 text-gray-700">{sc.situation}</div>
          {order && (
            <div className="text-xs text-gray-500">
              연결 데이터: {state.customers[sc.customerId].name} 고객 · {order.item} ({order.option}) · {order.status} · 후보 주문
            </div>
          )}
          {ready === undefined ? (
            <div className="text-xs text-gray-500">음성 파일 확인 중…</div>
          ) : ready ? (
            <audio controls preload="none" src={sc.audioSrc} className="h-9 w-full">
              <track kind="captions" />
            </audio>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Icon name="Clock" size={14} />
              음성 준비 중입니다. 파일이 등록되면 재생과 AI 분석을 할 수 있습니다. 지금은 문의 유형을 직접 선택해 체험할 수 있습니다.
            </div>
          )}
          {ready && !hasResult && (
            <div className="text-xs text-gray-500">이 음성의 AI 분석 결과를 준비하고 있습니다. 문의 유형을 직접 선택해 체험할 수 있습니다.</div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <CrmButton
              size="sm"
              variant="ai"
              icon="Cpu"
              loading={loading}
              disabled={!ready || !hasResult || loading || analyzed}
              onClick={() => onAnalyze(sc.id)}
            >
              {loading ? "분석 중…" : analyzed ? "분석 완료" : "AI 분석 시작"}
            </CrmButton>
            {ready && hasResult && !analyzed && (
              <span className="text-xs text-gray-500">미리 분석해 저장한 결과를 불러옵니다.</span>
            )}
          </div>
        </div>
      )}
    </div>
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
    // 상담원이 통화 중 고객에게 확인하기 전까지는 후보 주문입니다(데모 음성의 연결 주문도 같음).
    <CrmCard title="관련 주문" icon="Package" tone="info" stepLabel={session.orderConfirmed ? "문의 대상" : "후보 · 확인 전"}>
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
