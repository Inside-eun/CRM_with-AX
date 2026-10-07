import type { CategoryId } from "@/lib/categories";
import type { ClassifyResult } from "@/lib/useVoiceClassify";

export type Grade = "VIP" | "GOLD" | "SILVER" | "BASIC";

export type Customer = {
  id: string;
  name: string;
  gender: "여" | "남";
  age: number;
  /** 본인 확인용 생년월일 6자리 (YYMMDD) */
  birth: string;
  phone: string;
  email: string;
  grade: Grade;
  since: string;
  orderCount: number;
  ltv: number;
  tags: string[];
  caution?: string;
  address: string;
  /** 본인 확인 전에 보여 주는 구 단위 주소 */
  addressShort: string;
  payMethods: string[];
};

export type OrderStatus =
  | "입금 대기"
  | "결제 완료"
  | "배송 중"
  | "배송 완료"
  | "구매 확정"
  | "반품 접수"
  | "교환 접수"
  | "환불 요청"
  | "결제 취소 요청"
  | "결제 수단 변경 요청"
  | "재배송 요청";

export type TrackingEvent = { title: string; at: string; desc?: string };

/** 상품별 반품·교환 정책. 주문에 없으면 상담사가 매뉴얼에서 확인해야 합니다. */
export type ProductReturnPolicy = {
  /** 단순 변심 반품·교환 허용 여부 (불량·오배송은 기간 내 항상 가능) */
  simpleChange: boolean;
  /** 불량·오배송 반품·교환 가능 기간(수령 후 일수). 없으면 기본 30일. 가전 등 품질보증 기간이 긴 상품에 씁니다. */
  defectWindowDays?: number;
  note: string;
};

/** 교환 가능한 옵션과 재고·판매가(1개 기준) */
export type ExchangeOption = { label: string; stock: number; price: number };

export type Order = {
  no: string;
  customerId: string;
  orderedAt: string;
  item: string;
  option: string;
  qty: number;
  price: number;
  payMethod: string;
  approvalNo: string;
  status: OrderStatus;
  carrier?: string;
  invoice?: string;
  shippedAt?: string;
  deliveredAt?: string;
  tracking?: TrackingEvent[];
  /** 수량 단위 (예: 세트). 없으면 '개' */
  unit?: string;
  /** 이 주문에 진행 중인 AS 접수 */
  openAs?: { receiptNo: string; at: string; symptom: string };
  returnPolicy?: ProductReturnPolicy;
  exchangeOptions?: ExchangeOption[];
};

export type Urgency = "high" | "mid" | "low";

export type QueueItem = {
  id: string;
  customerId: string;
  /** 앱을 연 시점의 대기 시간(초). 화면에서는 경과 시간을 더해 보여 줍니다. */
  waitSeconds: number;
  urgency: Urgency;
  /** ARS에서 고객이 누른 메뉴 */
  arsMenu: string;
};

/** 데모 음성 시나리오 id (src/lib/crm/demo-scenarios.ts) */
export type DemoScenarioId = "cancel_return" | "exchange" | "deposit_info";

/**
 * 접수 음성의 화자 구성.
 * customer = 고객 혼자 남긴 사전 접수, call = 상담원·고객 대화 전체 녹음, unknown = 화자를 알 수 없는 업로드.
 * call·unknown은 화자를 구분하지 못하므로 고객 발화로 표시하지 않습니다.
 */
export type RecordingKind = "customer" | "call" | "unknown";

export type IntakeSource = { kind: "scenario"; scenarioId: DemoScenarioId } | { kind: "record" } | { kind: "upload" };

export type Intake =
  | { status: "none" }
  | { status: "skipped"; at: string }
  | { status: "failed"; error: string; at: string; source?: IntakeSource }
  | {
      status: "done";
      result: ClassifyResult;
      at: string;
      source?: IntakeSource;
      recording?: RecordingKind;
      /** 미리 실행해 저장한 분석 결과를 불러온 경우, 실제로 AI 분석을 실행한 시각 */
      analyzedAt?: string;
    };

export type Stage = "briefing" | "live" | "wrapup";

export type ActionId =
  | "tracking"
  | "return_pickup"
  | "exchange"
  | "refund"
  | "carrier_check"
  | "reship"
  | "payment_cancel"
  | "payment_change"
  | "return_refuse"
  | "order_fix"
  | "deposit_sms"
  | "as"
  | "voc"
  | "transfer"
  | "callback";

export type PerformedAction = {
  id: string;
  actionId: ActionId;
  label: string;
  receiptNo?: string;
  at: string;
  orderNo?: string;
  /** 확정 시 입력값 요약 (예: "반품 사유 단순 변심 · 회수 방문 예정일 10.01") */
  detail?: string;
  values?: Record<string, string>;
};

export type ReturnReason = "단순 변심" | "상품 불량" | "오배송";

/** 요청 구분. 환불/교환 상담은 refund·exchange, 결제 상담은 cancel·method_change */
export type RequestKind = "refund" | "exchange" | "cancel" | "method_change" | "deposit_info";

/** 환불/교환·결제 상담에서 상담사가 고객에게 확인한 값. 비어 있으면 아직 확인하지 않은 것입니다. */
export type ReturnRequest = {
  kind?: RequestKind;
  /** 결제 수단 변경 시 고객이 원하는 새 결제 수단 */
  newPayMethod?: string;
  /** 진행 중 AS가 있을 때 고객 선택: AS 취소 후 진행 / AS 유지 */
  asDecision?: "cancel_as" | "keep_as";
  /** 입금 계좌 안내: 고객이 확인해 준 주문 수량 */
  confirmedQty?: number;
  /** 입금 계좌 안내: 고객이 원하는 입금 은행 */
  depositBank?: string;
  reason?: ReturnReason;
  /** 상품 사용·훼손 여부 */
  condition?: "intact" | "damaged";
  /** 불량·오배송 사진(증빙) 확인 여부 */
  evidence?: "confirmed" | "missing";
  /** 교환 희망 옵션 (ExchangeOption.label) */
  exchangeOption?: string;
};

export type CallTranscript = {
  id: string;
  text: string;
  at: string;
  category: CategoryId;
  confidence: number;
};

export type CategorySuggestion = {
  category: CategoryId;
  confidence: number;
  reason: string;
  status: "open" | "applied" | "dismissed";
};

export type AlertStatus = "open" | "applied" | "ignored" | "later";

export type SummaryFields = { request: string; told: string; result: string };

export type FollowUp = { id: string; label: string; hint?: string; done: boolean };

export type WrapUp = {
  draft?: SummaryFields;
  /** ai: /api/summarize 결과, record: 상담 기록으로 만든 초안(AI 아님) */
  draftSource?: "ai" | "record";
  draftError?: string;
  values?: SummaryFields;
  tags: string[];
  followups: FollowUp[];
  transfer: string;
  recontact: boolean;
  recontactDate: string;
  reviewed: boolean;
};

export type Session = {
  id: string;
  queueId: string;
  customerId: string;
  stage: Stage;
  createdAt: string;
  intake: Intake;
  /** 사전 브리핑에서 고른 데모 음성 시나리오 */
  demoScenarioId?: DemoScenarioId;
  /** 상담사가 확정한 문의 유형 */
  category?: CategoryId;
  categorySource?: "ai" | "agent";
  orderNo?: string;
  orderConfirmed: boolean;
  verified: boolean;
  verifyFailures: number;
  verifiedAt?: string;
  callStartedAt?: number;
  holdStartedAt?: number;
  heldMs: number;
  callEndedAt?: number;
  stepsDone: string[];
  notices: string[];
  actions: PerformedAction[];
  memo: string;
  /** 환불/교환 요청 구분과 처리 조건 확인 값 */
  request?: ReturnRequest;
  transcripts: CallTranscript[];
  suggestion?: CategorySuggestion;
  alerts: Record<string, AlertStatus>;
  usedReplies: string[];
  wrapup?: WrapUp;
};

export type HistoryRecord = {
  id: string;
  customerId: string;
  startedAt: string;
  durationSec: number;
  agent: string;
  category: CategoryId;
  categorySource: "ai" | "agent";
  aiCategory?: CategoryId;
  aiConfidence?: number;
  intakeTranscript?: string;
  intakeRecording?: RecordingKind;
  keyRequest?: string;
  orderNo?: string;
  verified: boolean;
  summary: SummaryFields;
  aiDraft?: SummaryFields;
  draftSource?: "ai" | "record";
  editedFields: (keyof SummaryFields)[];
  actions: PerformedAction[];
  notices: string[];
  memo: string;
  transcripts: CallTranscript[];
  tags: string[];
  followups: FollowUp[];
  transfer?: string;
  recontactDate?: string;
  /** 목 데이터로 넣은 과거 이력 */
  seed?: boolean;
};

export type AgentStatus = "available" | "oncall" | "wrapup" | "away" | "break";

export type CrmState = {
  version: number;
  agent: { name: string; role: string; handledToday: number; target: number };
  agentStatus: AgentStatus;
  customers: Record<string, Customer>;
  orders: Order[];
  queue: QueueItem[];
  session?: Session;
  history: HistoryRecord[];
};
