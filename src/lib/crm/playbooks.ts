// 문의 유형별 처리 매뉴얼(목 데이터). AI가 만든 내용이 아니라 지식·매뉴얼 데이터로 취급하며,
// 상담사가 확정한 문의 유형에 따라 처리 단계·필수 안내·처리 기능을 고릅니다.
import type { IconName } from "@/design-system";
import type { CategoryId } from "@/lib/categories";
import {
  RETURN_SHIPPING_FEE,
  calendarDaysBetween,
  fmtDate,
  fmtWon,
  maskPay,
  returnDaysLeft,
  returnDeadline,
} from "./format";
import { DEPOSIT_BANKS, FLOW_LABEL, assessRequest, hasRequestFlow, requestFlow, type RequestFlow } from "./returns";
import type { ActionId, Customer, HistoryRecord, Order, OrderStatus, Session } from "./types";

export type Policy = { id: string; name: string; revisedAt: string; text: string };

export const POLICIES: Policy[] = [
  {
    id: "p-return",
    name: "반품·교환 정책 3.2조",
    revisedAt: "2026.08.01",
    text: "단순 변심에 의한 반품·교환은 상품 수령 후 7일 이내에 신청할 수 있습니다. 왕복 배송비 6,000원은 고객이 부담하며 환불 금액에서 차감합니다. 상담사는 회수 접수 전에 배송비 부담 여부를 고객에게 안내해야 합니다.",
  },
  {
    id: "p-defect",
    name: "반품·교환 정책 3.4조 (불량·오배송)",
    revisedAt: "2026.08.01",
    text: "상품 불량이나 오배송은 수령 후 30일 이내에 반품·교환할 수 있으며 배송비는 회사가 부담합니다. 가전 등 품질보증 기간이 정해진 상품은 그 기간(예: 1년) 안의 제품 하자를 교환 또는 AS로 처리합니다. 불량 사진을 요청해 회수 메모에 남기며, 이미 AS가 접수된 상품은 AS를 취소한 뒤 교환을 접수합니다.",
  },
  {
    id: "p-refuse",
    name: "반품·교환 정책 3.3조 (배송 중 취소)",
    revisedAt: "2026.08.01",
    text: "출고 후 배송 중인 주문은 즉시 취소할 수 없어 반품으로 접수합니다. 고객이 배송 기사에게 수취 거부(반송)를 요청하고, 반송 상품이 입고 확인되면 평일 기준 3~4일 내 환불합니다. 단순 변심이면 왕복 배송비 6,000원을 환불 금액에서 차감합니다.",
  },
  {
    id: "p-refund",
    name: "환불 처리 기준 2.1조",
    revisedAt: "2026.06.15",
    text: "신용카드 결제 건은 회수 상품 검수 완료 후 영업일 기준 3~5일 이내에 카드사 승인 취소로 환불됩니다. 간편결제는 1~3영업일이 걸립니다. 환불은 상담사 확인 후에만 요청할 수 있습니다.",
  },
  {
    id: "p-delay",
    name: "배송 지연 대응 기준 1.3조",
    revisedAt: "2026.07.10",
    text: "출고 후 3일이 지나도 배송 조회가 갱신되지 않으면 택배사 확인을 요청합니다. 5일 이상 지연되면 고객 선택에 따라 재배송 또는 주문 취소를 안내합니다.",
  },
  {
    id: "p-payment",
    name: "결제 취소 기준 4.1조",
    revisedAt: "2026.05.02",
    text: "출고 전 주문은 즉시 결제 취소할 수 있습니다. 출고 후 주문은 반품 절차로 진행합니다. 카드사 반영까지 영업일 기준 3~5일이 걸린다고 안내합니다. 결제 수단 변경은 출고 전 주문에 한해 기존 결제를 취소하고 새 결제 수단으로 재결제하는 방식으로 진행하며, 재결제 전까지 출고를 보류합니다. 무통장 입금 주문은 주문 후 24시간 안에 입금하지 않으면 자동 취소되며, 입금 계좌는 본인 확인 후 문자로 다시 보낼 수 있습니다. 주문 수량이 잘못 접수된 경우 입금 전에 수량을 정정해 입금 금액을 다시 안내합니다.",
  },
  {
    id: "p-as",
    name: "AS 접수 기준 5.2조",
    revisedAt: "2026.04.18",
    text: "구매 후 1년 이내 제품 하자는 무상 AS 대상입니다. AS 접수 시 증상, 사용 기간, 회수 주소를 확인합니다.",
  },
  {
    id: "p-complaint",
    name: "고객 불만 응대 기준 6.1조",
    revisedAt: "2026.03.02",
    text: "불만 고객에게는 먼저 불편에 대해 사과하고 사실관계를 확인합니다. 상담사 권한으로 해결할 수 없는 사안은 VOC로 등록하고 담당 부서에 이관합니다.",
  },
  {
    id: "p-privacy",
    name: "개인정보 보호 지침 7.1조",
    revisedAt: "2026.01.05",
    text: "본인 확인 전에는 연락처 전체, 주소, 결제 정보를 안내하거나 변경할 수 없으며 처리 기능을 실행할 수 없습니다. 본인 확인은 생년월일 6자리와 휴대폰 번호 뒤 4자리로 진행합니다.",
  },
];

export const policyById = (id: string) => POLICIES.find((p) => p.id === id);

export type Notice = {
  id: string;
  label: string;
  /** 고객에게 안내할 문구 (매뉴얼 추천 문구) */
  script: string;
  policyId?: string;
  /** 이 안내 없이 실행하면 정책 확인 알림을 띄우는 처리 기능 */
  requiredFor?: ActionId[];
};

export type StepDef = {
  id: string;
  label: string;
  hint: string;
  target?: string;
  optional?: boolean;
  doneWhen:
    | { type: "verified" }
    | { type: "order" }
    /** 환불/교환 요청 구분을 선택함 */
    | { type: "request" }
    /** 처리 조건 판단이 '가능'이거나 이미 접수함 */
    | { type: "eligible" }
    | { type: "manual" }
    | { type: "notice"; id: string }
    | { type: "action"; ids: ActionId[] };
};

export type Playbook = {
  category: CategoryId;
  title: string;
  summary: string;
  steps: StepDef[];
  notices: Notice[];
  actions: ActionId[];
  policies: string[];
  tags: string[];
};

const VERIFY_STEP: StepDef = {
  id: "verify",
  label: "본인 확인",
  hint: "생년월일 6자리와 휴대폰 번호 뒤 4자리를 확인하세요.",
  target: "좌측 · 본인 확인",
  doneWhen: { type: "verified" },
};

const ORDER_STEP: StepDef = {
  id: "order",
  label: "관련 주문 확인",
  hint: "문의 대상 주문이 맞는지 고객에게 확인하세요.",
  target: "좌측 · 대상 주문",
  doneWhen: { type: "order" },
};

const REQUEST_STEP: StepDef = {
  id: "request",
  label: "환불·교환 요청 구분",
  hint: "고객이 환불을 원하는지 교환을 원하는지 확인하세요.",
  target: "중앙 · 환불·교환 요청",
  doneWhen: { type: "request" },
};

const PAY_REQUEST_STEP: StepDef = {
  ...REQUEST_STEP,
  label: "결제 요청 구분",
  hint: "결제 취소인지 결제 수단 변경인지 확인하세요.",
  target: "중앙 · 결제 요청",
};

export const PLAYBOOKS: Record<CategoryId, Playbook> = {
  refund_exchange: {
    category: "refund_exchange",
    title: "환불·교환 처리",
    summary:
      "환불(출고 전 취소·배송 후 반품)인지 교환인지 먼저 구분하고, 기간·사유·상품 상태·상품별 정책·중복 접수를 확인한 뒤 비용을 안내하고 접수합니다. 접수는 처리 완료가 아닙니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      REQUEST_STEP,
      {
        id: "eligible",
        label: "처리 조건 확인",
        hint: "기간만으로 가능하다고 안내하지 말고 사유·상품 상태·상품별 정책·중복 접수를 함께 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "fee",
        label: "비용·예상 금액 안내",
        hint: "단순 변심은 왕복 배송비 6,000원이 고객 부담입니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "return_fee" },
      },
      {
        id: "pickup",
        label: "회수 또는 교환 접수",
        hint: "고객 동의를 받은 뒤 확정하세요.",
        target: "하단 · 처리",
        doneWhen: { type: "action", ids: ["return_pickup", "exchange", "payment_cancel"] },
      },
      {
        id: "refund",
        label: "환불 금액·시점 안내",
        hint: "검수 후 3~5영업일 내 카드 승인 취소로 환불됩니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "refund_timing" },
      },
    ],
    notices: [
      {
        id: "return_period",
        label: "반품 가능 기간",
        script:
          "단순 변심은 상품을 받으신 날부터 7일, 불량·오배송은 30일 이내에 신청하실 수 있습니다. 상품 상태와 사유를 확인한 뒤 접수 가능 여부를 안내해 드리겠습니다.",
        policyId: "p-return",
      },
      {
        id: "return_fee",
        label: "반품 배송비 부담 주체",
        script: "단순 변심 반품은 왕복 배송비 6,000원이 환불 금액에서 차감되며, 상품 불량이나 오배송이면 배송비는 저희가 부담합니다.",
        policyId: "p-return",
        requiredFor: ["return_pickup", "exchange"],
      },
      {
        id: "refund_timing",
        label: "환불 금액·시점",
        script: "회수된 상품 검수 후 영업일 기준 3~5일 이내에 결제하신 카드로 환불됩니다.",
        policyId: "p-refund",
        requiredFor: ["refund"],
      },
    ],
    actions: ["return_pickup", "exchange", "refund"],
    policies: ["p-return", "p-refuse", "p-defect", "p-refund"],
    tags: ["사이즈 불만", "배송비 문의", "환불 시점", "색상 교환", "상품 불량"],
  },
  shipping: {
    category: "shipping",
    title: "배송·배송 지연 처리",
    summary: "배송 조회로 현재 위치를 확인하고, 지연이 길면 택배사 확인 요청이나 재배송을 진행합니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      {
        id: "tracking",
        label: "배송 조회",
        hint: "마지막 갱신 시각과 위치를 확인하세요.",
        target: "하단 · 배송 조회",
        doneWhen: { type: "action", ids: ["tracking"] },
      },
      {
        id: "reason",
        label: "지연 사유 안내",
        hint: "확인된 위치와 지연 사유를 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "delay_reason" },
      },
      {
        id: "resolve",
        label: "택배사 확인 요청 또는 재배송",
        hint: "출고 후 3일 이상 갱신이 없으면 택배사 확인을 요청하세요.",
        target: "하단 · 택배사 확인 요청",
        doneWhen: { type: "action", ids: ["carrier_check", "reship"] },
      },
      {
        id: "eta",
        label: "도착 예정 안내",
        hint: "확인 결과를 문자로 안내한다고 전하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "eta" },
      },
    ],
    notices: [
      {
        id: "delay_reason",
        label: "지연 사유와 현재 위치",
        script: "택배사 허브에서 배송 정보가 갱신되지 않고 있어 택배사에 바로 확인을 요청하겠습니다.",
        policyId: "p-delay",
      },
      {
        id: "reship_option",
        label: "재배송·취소 선택",
        script: "지연이 계속되면 새 상품으로 재배송하거나 주문을 취소하실 수 있습니다. 원하시는 방법을 말씀해 주세요.",
        policyId: "p-delay",
        requiredFor: ["reship"],
      },
      {
        id: "eta",
        label: "도착 예정일",
        script: "택배사 확인 결과가 나오는 대로 도착 예정일을 문자로 안내해 드리겠습니다.",
        policyId: "p-delay",
      },
    ],
    actions: ["tracking", "carrier_check", "reship"],
    policies: ["p-delay"],
    tags: ["배송 지연", "조회 미갱신", "재배송 요청"],
  },
  product_inquiry: {
    category: "product_inquiry",
    title: "제품 문의 처리",
    summary: "문의 상품을 확인하고 매뉴얼의 상품 정보로 답변합니다. 제품 하자가 의심되면 AS를 접수합니다.",
    steps: [
      VERIFY_STEP,
      { ...ORDER_STEP, label: "문의 상품 확인" },
      {
        id: "info",
        label: "상품 정보 확인",
        hint: "지식·매뉴얼에서 상품 정보와 사용 안내를 확인하세요.",
        target: "우측 · 관련 정책",
        doneWhen: { type: "manual" },
      },
      {
        id: "answer",
        label: "답변 안내",
        hint: "확인한 내용을 고객에게 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "product_answer" },
      },
      {
        id: "as",
        label: "필요 시 AS 접수",
        hint: "제품 하자가 의심될 때만 접수하세요.",
        target: "하단 · AS 접수",
        optional: true,
        doneWhen: { type: "action", ids: ["as"] },
      },
    ],
    notices: [
      {
        id: "product_answer",
        label: "상품 정보 안내",
        script: "문의하신 내용은 상품 상세의 사용 안내에 따라 확인해 드렸습니다. 추가로 궁금하신 점이 있으신가요?",
      },
      {
        id: "as_scope",
        label: "AS 가능 범위",
        script: "구매 후 1년 이내 제품 하자는 무상 AS 대상이며, 회수 후 점검 결과를 안내해 드립니다.",
        policyId: "p-as",
        requiredFor: ["as"],
      },
    ],
    actions: ["as"],
    policies: ["p-as"],
    tags: ["사용 방법", "사이즈 문의", "제품 하자"],
  },
  payment: {
    category: "payment",
    title: "결제·결제 오류 처리",
    summary: "결제 상태와 출고 여부를 확인하고, 출고 전이면 결제를 취소합니다. 출고 후면 반품 절차로 안내합니다.",
    steps: [
      VERIFY_STEP,
      { ...ORDER_STEP, label: "결제 건 확인" },
      PAY_REQUEST_STEP,
      {
        id: "status",
        label: "결제 상태·출고 여부 확인",
        hint: "출고 전 주문만 즉시 결제 취소할 수 있습니다.",
        target: "좌측 · 관련 주문",
        doneWhen: { type: "manual" },
      },
      {
        id: "rule",
        label: "취소 기준 안내",
        hint: "출고 여부에 따른 취소 방법을 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "cancel_rule" },
      },
      {
        id: "cancel",
        label: "결제 취소 접수",
        hint: "고객 동의를 받은 뒤 확정하세요.",
        target: "하단 · 결제 취소",
        doneWhen: { type: "action", ids: ["payment_cancel"] },
      },
      {
        id: "timing",
        label: "카드사 반영 기간 안내",
        hint: "영업일 기준 3~5일이 걸립니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "card_refund_timing" },
      },
    ],
    notices: [
      {
        id: "cancel_rule",
        label: "결제 취소 기준",
        script: "아직 출고 전이라 지금 바로 결제를 취소해 드릴 수 있습니다.",
        policyId: "p-payment",
        requiredFor: ["payment_cancel"],
      },
      {
        id: "card_refund_timing",
        label: "카드사 반영 기간",
        script: "취소 승인은 바로 되지만 카드사 반영까지 영업일 기준 3~5일이 걸릴 수 있습니다.",
        policyId: "p-refund",
        requiredFor: ["payment_cancel"],
      },
    ],
    actions: ["payment_cancel", "payment_change", "deposit_sms"],
    policies: ["p-payment", "p-refund"],
    tags: ["이중 결제", "결제 취소", "승인 오류", "입금 계좌", "수량 정정"],
  },
  complaint: {
    category: "complaint",
    title: "불만·클레임 처리",
    summary: "먼저 사과하고 사실관계를 확인합니다. 상담사 권한 밖의 사안은 VOC로 등록하고 이관합니다.",
    steps: [
      VERIFY_STEP,
      {
        id: "listen",
        label: "불만 내용 확인",
        hint: "고객이 겪은 불편과 원하는 해결 방법을 확인하세요.",
        target: "중앙 · 대화 기록",
        doneWhen: { type: "manual" },
      },
      {
        id: "apology",
        label: "사과 및 사실 확인",
        hint: "불편에 대해 먼저 사과하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "apology" },
      },
      {
        id: "voc",
        label: "VOC 등록",
        hint: "불만 내용과 고객 요청을 VOC로 남기세요.",
        target: "하단 · VOC 등록",
        doneWhen: { type: "action", ids: ["voc"] },
      },
      {
        id: "process",
        label: "처리 절차 안내",
        hint: "담당 부서 확인 후 연락드린다고 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "voc_process" },
      },
      {
        id: "transfer",
        label: "필요 시 담당자 이관",
        hint: "보상 등 상담사 권한 밖이면 이관하세요.",
        target: "하단 · 담당자 이관",
        optional: true,
        doneWhen: { type: "action", ids: ["transfer"] },
      },
    ],
    notices: [
      {
        id: "apology",
        label: "불편에 대한 사과",
        script: "이용에 불편을 드려 정말 죄송합니다. 어떤 상황이었는지 자세히 확인해 보겠습니다.",
        policyId: "p-complaint",
      },
      {
        id: "voc_process",
        label: "VOC 처리 절차",
        script: "말씀하신 내용은 담당 부서에 전달했고, 확인 결과는 영업일 기준 2일 이내에 연락드리겠습니다.",
        policyId: "p-complaint",
        requiredFor: ["voc", "transfer"],
      },
    ],
    actions: ["voc"],
    policies: ["p-complaint"],
    tags: ["상담 불만", "포장 파손", "보상 요청"],
  },
  other: {
    category: "other",
    title: "일반 상담",
    summary: "문의 내용을 확인해 답변하고, 바로 해결할 수 없으면 담당자 이관이나 콜백을 예약합니다.",
    steps: [
      VERIFY_STEP,
      {
        id: "listen",
        label: "문의 내용 확인",
        hint: "고객이 원하는 것을 다시 확인하세요.",
        target: "중앙 · 대화 기록",
        doneWhen: { type: "manual" },
      },
      {
        id: "answer",
        label: "답변 안내",
        hint: "확인한 내용을 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "general_answer" },
      },
      {
        id: "handoff",
        label: "필요 시 이관·콜백",
        hint: "바로 해결할 수 없을 때 진행하세요.",
        target: "하단 · 담당자 이관",
        optional: true,
        doneWhen: { type: "action", ids: ["transfer", "callback"] },
      },
    ],
    notices: [
      {
        id: "general_answer",
        label: "문의 답변 안내",
        script: "문의하신 내용을 확인해 안내해 드렸습니다. 더 도와드릴 일이 있으신가요?",
      },
    ],
    actions: [],
    policies: ["p-privacy"],
    tags: ["일반 문의", "회원 정보", "이벤트 문의"],
  },
};

const RX = PLAYBOOKS.refund_exchange;
const rxNotice = (id: string) => RX.notices.find((n) => n.id === id)!;
const payNotice = (id: string) => PLAYBOOKS.payment.notices.find((n) => n.id === id)!;

/** 환불/교환 요청 구분 뒤의 세부 흐름별 매뉴얼. 처리 단계·필수 안내·처리 버튼이 흐름에 따라 바뀝니다. */
export const REQUEST_PLAYBOOKS: Record<RequestFlow, Playbook> = {
  cancel: {
    ...RX,
    title: FLOW_LABEL.cancel,
    summary: "출고 전 주문은 결제 승인을 취소해 환불합니다. 배송비는 없고 카드사 반영까지 영업일 기준 3~5일이 걸립니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      REQUEST_STEP,
      {
        id: "eligible",
        label: "출고 전 여부·중복 접수 확인",
        hint: "출고 전 주문만 즉시 취소할 수 있습니다.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "rule",
        label: "취소 금액·기준 안내",
        hint: "전액 취소되며 배송비가 없다고 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "cancel_rule" },
      },
      {
        id: "cancel",
        label: "결제 취소 접수",
        hint: "고객 동의를 받은 뒤 확정하세요. 접수 후 카드사 반영까지는 완료가 아닙니다.",
        target: "하단 · 결제 취소",
        doneWhen: { type: "action", ids: ["payment_cancel"] },
      },
      {
        id: "timing",
        label: "카드사 반영 기간 안내",
        hint: "영업일 기준 3~5일이 걸립니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "card_refund_timing" },
      },
    ],
    notices: [payNotice("cancel_rule"), payNotice("card_refund_timing")],
    actions: ["payment_cancel"],
    policies: ["p-payment", "p-refund"],
  },
  return: {
    ...RX,
    title: FLOW_LABEL.return,
    summary: "반품 조건을 확인하고 배송비·예상 환불액을 안내한 뒤 회수를 접수합니다. 환불은 회수 접수 후 요청하며, 검수가 끝나야 실제로 환불됩니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      REQUEST_STEP,
      {
        id: "eligible",
        label: "반품 조건 확인",
        hint: "기간·사유·상품 상태·상품별 정책·중복 접수를 모두 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "fee",
        label: "반품 배송비·예상 환불액 안내",
        hint: "단순 변심은 왕복 배송비 6,000원이 환불액에서 차감됩니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "return_fee" },
      },
      {
        id: "pickup",
        label: "반품 회수 접수",
        hint: "고객 동의를 받은 뒤 확정하세요.",
        target: "하단 · 반품 회수 접수",
        doneWhen: { type: "action", ids: ["return_pickup"] },
      },
      {
        id: "refund_req",
        label: "환불 요청",
        hint: "회수 검수가 끝나면 환불되도록 요청합니다.",
        target: "하단 · 환불 요청",
        doneWhen: { type: "action", ids: ["refund"] },
      },
      {
        id: "refund",
        label: "환불 일정 안내",
        hint: "검수 후 3~5영업일(간편결제 1~3영업일) 내 환불됩니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "refund_timing" },
      },
    ],
    notices: [rxNotice("return_period"), rxNotice("return_fee"), rxNotice("refund_timing")],
    actions: ["return_pickup", "refund"],
  },
  exchange: {
    ...RX,
    title: FLOW_LABEL.exchange,
    summary: "희망 옵션의 재고와 가격 차이, 배송비 부담을 확인해 안내한 뒤 교환을 접수합니다. 교환 상품은 회수·검수 후 출고됩니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      REQUEST_STEP,
      {
        id: "eligible",
        label: "교환 조건 확인",
        hint: "기간·사유·상품 상태·상품별 정책·희망 옵션 재고를 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "fee",
        label: "교환 비용·가격 차이 안내",
        hint: "배송비 부담 주체와 옵션 가격 차이를 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "exchange_fee" },
      },
      {
        id: "exchange",
        label: "교환 접수",
        hint: "고객 동의를 받은 뒤 확정하세요.",
        target: "하단 · 교환 접수",
        doneWhen: { type: "action", ids: ["exchange"] },
      },
      {
        id: "timing",
        label: "교환 일정 안내",
        hint: "회수·검수 후 교환 상품이 출고된다고 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "exchange_timing" },
      },
    ],
    notices: [
      {
        id: "exchange_fee",
        label: "교환 배송비·가격 차이",
        script:
          "단순 변심 교환은 왕복 배송비 6,000원이 고객님 부담이며, 불량·오배송이면 저희가 부담합니다. 옵션 가격이 다르면 차액을 추가 결제하거나 환불해 드립니다.",
        policyId: "p-return",
        requiredFor: ["exchange"],
      },
      {
        id: "exchange_timing",
        label: "교환 일정",
        script: "상품을 회수해 검수한 뒤 교환 상품을 보내드리며, 출고되면 문자로 안내해 드리겠습니다.",
        policyId: "p-return",
      },
    ],
    actions: ["exchange"],
  },
  refuse: {
    ...RX,
    title: FLOW_LABEL.refuse,
    summary:
      "출고 후 배송 중인 주문은 즉시 취소할 수 없어 반품으로 접수합니다. 고객이 수취 거부(반송)하면 반송 상품 입고 확인 후 평일 3~4일 내 환불됩니다.",
    steps: [
      VERIFY_STEP,
      ORDER_STEP,
      REQUEST_STEP,
      {
        id: "eligible",
        label: "반품 조건 확인 (배송 중)",
        hint: "배송 상태, 취소 사유, 상품별 정책, 중복 접수를 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "refuse_guide",
        label: "수취 거부 방법·비용 안내",
        hint: "배송 기사 연락 시 반송을 요청하도록 안내하고, 단순 변심이면 배송비 차감을 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "refuse_guide" },
      },
      {
        id: "refuse",
        label: "반품(수취 거부) 접수",
        hint: "고객 동의를 받은 뒤 확정하세요. 반송·입고 전까지 환불은 완료가 아닙니다.",
        target: "하단 · 반품(수취 거부) 접수",
        doneWhen: { type: "action", ids: ["return_refuse"] },
      },
      {
        id: "refund_timing",
        label: "환불 일정 안내",
        hint: "반송 상품 입고 확인 후 평일 3~4일 내 환불됩니다.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "refuse_refund_timing" },
      },
    ],
    notices: [
      {
        id: "refuse_guide",
        label: "수취 거부 방법·배송비",
        script:
          "배송 기사님께 배송 예정 연락이 오면 취소 요청한 상품이니 반송해 달라고 말씀해 주세요. 단순 변심이면 왕복 배송비 6,000원이 환불 금액에서 차감됩니다.",
        policyId: "p-refuse",
        requiredFor: ["return_refuse"],
      },
      {
        id: "refuse_refund_timing",
        label: "환불 일정",
        script: "반송된 상품이 저희 쪽에 정상 입고된 것이 확인되면 평일 기준 3~4일 안에 환불됩니다.",
        policyId: "p-refuse",
      },
    ],
    actions: ["return_refuse"],
    policies: ["p-refuse", "p-return", "p-refund"],
  },
  deposit: {
    ...PLAYBOOKS.payment,
    title: FLOW_LABEL.deposit,
    summary:
      "무통장 입금 주문의 입금 계좌를 다시 안내합니다. 주문 수량이 잘못 접수됐으면 입금 전에 정정하고, 정정된 금액과 입금 기한을 안내한 뒤 계좌를 문자로 보냅니다.",
    steps: [
      VERIFY_STEP,
      { ...ORDER_STEP, label: "주문 내용 확인" },
      PAY_REQUEST_STEP,
      {
        id: "eligible",
        label: "주문·입금 정보 확인",
        hint: "결제 수단(무통장 입금), 입금 대기 상태, 주문 수량, 입금 은행을 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "fix",
        label: "주문 수량 정정",
        hint: "고객이 확인한 수량으로 주문을 정정하세요.",
        target: "하단 · 주문 수량 정정",
        doneWhen: { type: "action", ids: ["order_fix"] },
      },
      {
        id: "amount",
        label: "입금 금액·기한 안내",
        hint: "정정된 금액과 입금 기한(주문 후 24시간)을 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "deposit_amount" },
      },
      {
        id: "sms",
        label: "입금 계좌 문자 발송",
        hint: "고객이 원하는 은행의 입금 계좌를 문자로 보냅니다.",
        target: "하단 · 입금 계좌 문자 발송",
        doneWhen: { type: "action", ids: ["deposit_sms"] },
      },
      {
        id: "after",
        label: "입금 후 진행 안내",
        hint: "입금이 확인되면 출고된다고 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "deposit_after" },
      },
    ],
    notices: [
      {
        id: "deposit_amount",
        label: "입금 금액·기한",
        script: "입금하실 금액과 계좌를 문자로 보내드립니다. 주문 후 24시간 안에 입금하지 않으시면 주문이 자동 취소됩니다.",
        policyId: "p-payment",
        requiredFor: ["deposit_sms"],
      },
      {
        id: "deposit_after",
        label: "입금 후 진행",
        script: "입금이 확인되면 바로 출고 준비를 시작하고, 출고되면 문자로 안내해 드리겠습니다.",
        policyId: "p-payment",
      },
    ],
    actions: ["order_fix", "deposit_sms"],
    policies: ["p-payment"],
  },
  method_change: {
    ...PLAYBOOKS.payment,
    title: FLOW_LABEL.method_change,
    summary:
      "출고 전 주문만 결제 수단을 바꿀 수 있습니다. 기존 결제를 취소하고 새 결제 수단으로 재결제하도록 안내합니다. 접수 후 고객이 재결제해야 변경이 끝납니다.",
    steps: [
      VERIFY_STEP,
      { ...ORDER_STEP, label: "결제 건 확인" },
      PAY_REQUEST_STEP,
      {
        id: "eligible",
        label: "변경 조건 확인",
        hint: "출고 전 여부, 새 결제 수단, 중복 접수를 확인하세요.",
        target: "중앙 · 판단 근거",
        doneWhen: { type: "eligible" },
      },
      {
        id: "rule",
        label: "기존 결제 취소·재결제 안내",
        hint: "결제 수단만 바꾸는 것이 아니라 기존 결제 취소 후 재결제하는 방식임을 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "pay_change_rule" },
      },
      {
        id: "change",
        label: "결제 수단 변경 접수",
        hint: "고객 동의를 받은 뒤 확정하세요. 고객이 재결제해야 변경이 끝납니다.",
        target: "하단 · 결제 수단 변경",
        doneWhen: { type: "action", ids: ["payment_change"] },
      },
      {
        id: "link",
        label: "재결제 방법 안내",
        hint: "재결제 링크 유효 시간과 출고 보류를 안내하세요.",
        target: "중앙 · 필수 안내 체크",
        doneWhen: { type: "notice", id: "pay_change_link" },
      },
    ],
    notices: [
      {
        id: "pay_change_rule",
        label: "기존 결제 취소·재결제",
        script:
          "결제 수단 변경은 기존 결제를 취소하고 새 결제 수단으로 다시 결제하는 방식입니다. 기존 결제 취소는 카드사 반영까지 영업일 기준 3~5일이 걸릴 수 있습니다.",
        policyId: "p-payment",
        requiredFor: ["payment_change"],
      },
      {
        id: "pay_change_link",
        label: "재결제 방법",
        script: "재결제 링크를 문자로 보내드리며, 24시간 안에 결제를 마치시면 주문이 그대로 진행됩니다. 재결제 전까지 출고는 잠시 보류됩니다.",
        policyId: "p-payment",
      },
    ],
    actions: ["payment_change"],
    policies: ["p-payment", "p-refund"],
  },
};

/** 접수하지 않고 끝내는 분기의 안내. 문구는 판단 결과에 맞춰 playbookFor에서 바꿉니다. */
const CLOSURE_NOTICES: Record<"deny_reason" | "alternative" | "handoff_told", Notice> = {
  deny_reason: { id: "deny_reason", label: "불가 사유 안내", script: "확인해 보니 접수 조건에 맞지 않아 접수가 어렵습니다.", policyId: "p-return" },
  alternative: { id: "alternative", label: "대안 안내", script: "다른 방법을 확인해 안내해 드리겠습니다.", policyId: "p-return" },
  handoff_told: {
    id: "handoff_told",
    label: "추가 확인·후속 연락 안내",
    script: "확인이 필요한 부분은 담당 부서에서 확인한 뒤 연락드리겠습니다.",
    policyId: "p-return",
  },
};

/** 전체 매뉴얼(세부 흐름 포함) — 안내 이름 찾기 등에 씁니다. */
export const ALL_PLAYBOOKS: Playbook[] = [
  ...Object.values(PLAYBOOKS),
  ...Object.values(REQUEST_PLAYBOOKS),
  { ...RX, notices: Object.values(CLOSURE_NOTICES) },
];

const HANDOFF_ACTIONS: ActionId[] = ["transfer", "callback"];

/** 고객이 확인한 수량이 접수된 수량과 달라 정정이 필요하거나, 이미 정정했는지 */
function depositNeedsFix(session: Session, order?: Order): boolean {
  if (session.actions.some((a) => a.actionId === "order_fix")) return true;
  const qty = session.request?.confirmedQty;
  return !!order && !!qty && qty !== order.qty;
}

/**
 * 접수 없이 끝내는 분기.
 * denied = 처리 불가 판단, handoff = 추가 확인이 필요한 채로 이관·콜백함. 이미 접수했으면 undefined.
 */
export function requestClosure(session: Session, order?: Order): "denied" | "handoff" | undefined {
  if (!hasRequestFlow(session.category)) return undefined;
  const a = assessRequest(session, order);
  if (!a.flow || a.submitted) return undefined;
  if (a.verdict === "no") return "denied";
  if (a.verdict === "check" && session.actions.some((x) => HANDOFF_ACTIONS.includes(x.actionId))) return "handoff";
  return undefined;
}

/** 상담에 적용할 매뉴얼. 환불/교환·결제는 요청 구분과 주문 상태에 따라 세부 흐름을 고릅니다. */
export function playbookFor(session: Session, order?: Order): Playbook {
  if (hasRequestFlow(session.category)) {
    const flow = requestFlow(session, order);
    if (flow) {
      const flowBase = REQUEST_PLAYBOOKS[flow];
      // 결제 상담에서 고른 결제 취소는 같은 흐름을 쓰되 요청 구분 단계 이름만 결제 기준으로 바꿉니다.
      const base =
        session.category === "payment" && flow === "cancel"
          ? {
              ...flowBase,
              category: "payment" as const,
              steps: flowBase.steps.map((st) => (st.id === "request" ? PAY_REQUEST_STEP : st)),
            }
          : flowBase;
      const closure = requestClosure(session, order);
      if (!closure) {
        // 입금 계좌 안내에서 수량 정정이 필요 없으면 정정 단계와 버튼을 뺍니다.
        if (flow === "deposit" && !depositNeedsFix(session, order)) {
          return { ...base, steps: base.steps.filter((st) => st.id !== "fix"), actions: ["deposit_sms"] };
        }
        return base;
      }
      // 접수할 수 없는 분기에서는 접수·비용 안내 단계 대신 종료 조건(불가 사유·대안·이관)을 둡니다.
      const a = assessRequest(session, order);
      const upToCheck = base.steps.slice(0, base.steps.findIndex((st) => st.id === "eligible") + 1).map((st) =>
        st.id === "eligible"
          ? { ...st, label: closure === "denied" ? `${st.label} · 불가 확인` : `${st.label} · 추가 확인 이관` }
          : st,
      );
      if (closure === "denied") {
        return {
          ...base,
          title: `${base.title} · 접수 불가`,
          summary: "처리 조건에 맞지 않아 접수하지 않습니다. 불가 사유와 대안을 안내하고, 필요하면 추가 확인을 이관합니다.",
          steps: [
            ...upToCheck,
            {
              id: "deny",
              label: "불가 사유 안내",
              hint: a.title,
              target: "중앙 · 필수 안내 체크",
              doneWhen: { type: "notice", id: "deny_reason" },
            },
            {
              id: "alt",
              label: "대안 안내",
              hint: a.next.join(" / "),
              target: "중앙 · 필수 안내 체크",
              doneWhen: { type: "notice", id: "alternative" },
            },
            {
              id: "handoff",
              label: "추가 확인·이관",
              hint: "고객이 이의를 제기하거나 확인이 더 필요하면 VOC 등록·담당자 이관·콜백 예약을 하세요.",
              target: "하단 · 담당자 이관",
              optional: true,
              doneWhen: { type: "action", ids: ["transfer", "callback", "voc"] },
            },
          ],
          notices: [
            { ...CLOSURE_NOTICES.deny_reason, script: a.script },
            { ...CLOSURE_NOTICES.alternative, script: a.alternative ?? CLOSURE_NOTICES.alternative.script },
          ],
          actions: [...base.actions, "voc"],
        };
      }
      return {
        ...base,
        title: `${base.title} · 추가 확인 이관`,
        summary: "처리 조건을 상담 중 확인하지 못해 이관·콜백으로 넘깁니다. 접수는 하지 않습니다.",
        steps: [
          ...upToCheck,
          {
            id: "handoff",
            label: "추가 확인·이관",
            hint: a.next.slice(0, -1).join(" / ") || "확인이 필요한 항목을 이관 메모에 남기세요.",
            target: "하단 · 담당자 이관",
            doneWhen: { type: "action", ids: HANDOFF_ACTIONS },
          },
          {
            id: "handoff_told",
            label: "후속 연락 안내",
            hint: "확인 후 연락드린다고 안내하세요.",
            target: "중앙 · 필수 안내 체크",
            doneWhen: { type: "notice", id: "handoff_told" },
          },
        ],
        notices: [CLOSURE_NOTICES.handoff_told],
      };
    }
  }
  return PLAYBOOKS[session.category ?? "other"];
}

export const COMMON_ACTIONS: ActionId[] = ["transfer", "callback"];

export type ActionField =
  | { id: string; label: string; type: "select"; options: string[]; defaultValue: string }
  | { id: string; label: string; type: "date"; defaultDaysLater: number }
  | { id: string; label: string; type: "text"; placeholder: string };

export type ActionDef = {
  id: ActionId;
  label: string;
  icon: IconName;
  /** 환불·반품·취소 등 고객 동의와 상담사 확정이 필요한 기능 */
  consent: boolean;
  receiptPrefix?: string;
  fields: ActionField[];
  /** 실행 후 관련 주문 상태 */
  orderStatus?: OrderStatus;
  description: string;
  /** 실행하면 후처리에 자동으로 추가되는 후속 조치 */
  followup?: string;
};

export const TRANSFER_DEPTS = ["물류팀 (회수·검수)", "배송팀", "결제팀", "상품 MD팀", "AS 센터", "고객 보호팀"];

export const ACTIONS: Record<ActionId, ActionDef> = {
  tracking: {
    id: "tracking",
    label: "배송 조회",
    icon: "MapPin",
    consent: false,
    fields: [],
    description: "택배사 배송 기록을 조회합니다.",
  },
  return_pickup: {
    id: "return_pickup",
    label: "반품 회수 접수",
    icon: "Truck",
    consent: true,
    receiptPrefix: "RT",
    orderStatus: "반품 접수",
    fields: [
      { id: "reason", label: "반품 사유", type: "select", options: ["단순 변심", "상품 불량", "오배송"], defaultValue: "단순 변심" },
      { id: "date", label: "회수 방문 예정일", type: "date", defaultDaysLater: 2 },
    ],
    description: "기본 배송지로 회수 기사 방문을 예약합니다.",
    followup: "회수 완료 후 검수 결과 확인",
  },
  exchange: {
    id: "exchange",
    label: "교환 접수",
    icon: "Repeat",
    consent: true,
    receiptPrefix: "EX",
    orderStatus: "교환 접수",
    fields: [
      { id: "option", label: "교환할 옵션", type: "text", placeholder: "예: 베이지 / S" },
      { id: "date", label: "회수 방문 예정일", type: "date", defaultDaysLater: 2 },
    ],
    description: "기존 상품을 회수하고 선택한 옵션으로 새 상품을 보냅니다.",
    followup: "교환 상품 출고 확인",
  },
  refund: {
    id: "refund",
    label: "환불 요청",
    icon: "RotateCcw",
    consent: true,
    receiptPrefix: "RF",
    orderStatus: "환불 요청",
    fields: [],
    description: "회수 검수 완료 시 자동 환불되도록 요청합니다.",
    followup: "환불 승인 후 고객 안내 문자 확인",
  },
  payment_change: {
    id: "payment_change",
    label: "결제 수단 변경",
    icon: "CreditCard",
    consent: true,
    receiptPrefix: "PM",
    orderStatus: "결제 수단 변경 요청",
    fields: [
      {
        id: "method",
        label: "새 결제 수단",
        type: "select",
        options: ["새 카드 (결제 링크 발송)", "간편결제 (결제 링크 발송)"],
        defaultValue: "새 카드 (결제 링크 발송)",
      },
    ],
    description: "출고 전 주문의 기존 결제를 취소하고 새 결제 수단으로 재결제를 요청합니다.",
    followup: "고객 재결제 완료 여부 확인",
  },
  return_refuse: {
    id: "return_refuse",
    label: "반품(수취 거부) 접수",
    icon: "Truck",
    consent: true,
    receiptPrefix: "RT",
    orderStatus: "반품 접수",
    fields: [
      { id: "reason", label: "반품 사유", type: "select", options: ["단순 변심", "상품 불량", "오배송"], defaultValue: "단순 변심" },
    ],
    description: "배송 중인 주문을 반품으로 접수합니다. 고객이 수취 거부하면 반송 상품 입고 후 환불됩니다.",
    followup: "반송 상품 입고 확인 후 환불 처리 확인",
  },
  order_fix: {
    id: "order_fix",
    label: "주문 수량 정정",
    icon: "Edit3",
    consent: true,
    receiptPrefix: "OC",
    fields: [{ id: "qty", label: "정정 수량", type: "text", placeholder: "예: 1" }],
    description: "고객이 확인한 수량으로 주문을 다시 접수하고 입금 금액을 정정합니다.",
    followup: "정정된 주문 금액으로 입금 확인",
  },
  deposit_sms: {
    id: "deposit_sms",
    label: "입금 계좌 문자 발송",
    icon: "Send",
    consent: false,
    receiptPrefix: "SMS",
    fields: [{ id: "bank", label: "입금 은행", type: "select", options: DEPOSIT_BANKS, defaultValue: DEPOSIT_BANKS[0] }],
    description: "등록된 휴대폰 번호로 입금 계좌·금액·기한을 문자로 보냅니다.",
    followup: "고객 입금 확인 후 출고",
  },
  carrier_check: {
    id: "carrier_check",
    label: "택배사 확인 요청",
    icon: "Send",
    consent: false,
    receiptPrefix: "DL",
    fields: [{ id: "memo", label: "요청 내용", type: "text", placeholder: "예: 허브 하차 후 4일째 미갱신" }],
    description: "택배사에 배송 위치 확인을 요청합니다.",
    followup: "택배사 회신 확인 후 고객 문자 안내",
  },
  reship: {
    id: "reship",
    label: "재배송 요청",
    icon: "Package",
    consent: true,
    receiptPrefix: "RS",
    orderStatus: "재배송 요청",
    fields: [],
    description: "분실·지연 건을 새 상품으로 다시 보냅니다.",
    followup: "재배송 상품 출고 확인",
  },
  payment_cancel: {
    id: "payment_cancel",
    label: "결제 취소",
    icon: "CreditCard",
    consent: true,
    receiptPrefix: "PC",
    orderStatus: "결제 취소 요청",
    fields: [
      { id: "reason", label: "취소 사유", type: "select", options: ["고객 요청", "이중 결제", "결제 오류"], defaultValue: "고객 요청" },
    ],
    description: "출고 전 주문의 결제 승인을 취소합니다.",
    followup: "카드사 취소 반영 확인",
  },
  as: {
    id: "as",
    label: "AS 접수",
    icon: "Tool",
    consent: false,
    receiptPrefix: "AS",
    fields: [
      { id: "symptom", label: "증상", type: "text", placeholder: "예: 전원이 들어오지 않음" },
      { id: "date", label: "회수 방문 예정일", type: "date", defaultDaysLater: 3 },
    ],
    description: "제품 회수 후 AS 센터에서 점검합니다.",
    followup: "AS 점검 결과 고객 안내",
  },
  voc: {
    id: "voc",
    label: "VOC 등록",
    icon: "Flag",
    consent: false,
    receiptPrefix: "VOC",
    fields: [{ id: "content", label: "VOC 내용", type: "text", placeholder: "예: 선물 포장 파손 · 포장 개선 요청" }],
    description: "고객 불만을 VOC로 등록해 담당 부서가 확인하게 합니다.",
    followup: "VOC 처리 결과 고객 안내",
  },
  transfer: {
    id: "transfer",
    label: "담당자 이관",
    icon: "Share2",
    consent: false,
    receiptPrefix: "TR",
    fields: [{ id: "dept", label: "이관 부서", type: "select", options: TRANSFER_DEPTS, defaultValue: TRANSFER_DEPTS[0] }],
    description: "상담 요약과 함께 담당 부서로 이관합니다.",
    followup: "이관 부서 처리 결과 확인",
  },
  callback: {
    id: "callback",
    label: "콜백 예약",
    icon: "PhoneCall",
    consent: false,
    receiptPrefix: "CB",
    fields: [{ id: "date", label: "콜백 날짜", type: "date", defaultDaysLater: 1 }],
    description: "고객에게 다시 전화할 날짜를 예약합니다.",
    followup: "예약한 날짜에 고객 콜백",
  },
};

/** 처리 기능을 지금 실행할 수 없는 이유. 실행할 수 있으면 undefined */
export function actionBlockedReason(actionId: ActionId, session: Session, order?: Order): string | undefined {
  // 담당자 이관·콜백은 고객 정보를 바꾸지 않아 본인 확인 전에도 쓸 수 있습니다.
  if (!session.verified && actionId !== "transfer" && actionId !== "callback") return "본인 확인 후 사용할 수 있습니다.";
  const done = (id: ActionId) => session.actions.some((a) => a.actionId === id);
  const needsOrder: ActionId[] = [
    "tracking",
    "return_pickup",
    "return_refuse",
    "exchange",
    "refund",
    "reship",
    "payment_cancel",
    "payment_change",
    "order_fix",
    "deposit_sms",
    "as",
  ];
  if (needsOrder.includes(actionId) && !order) return "관련 주문을 먼저 선택하세요.";
  // 환불/교환·결제 상담은 요청 구분과 처리 조건 판단이 끝나야 접수할 수 있습니다.
  const submitActions: ActionId[] = ["return_pickup", "return_refuse", "exchange", "payment_cancel", "payment_change", "deposit_sms"];
  if (hasRequestFlow(session.category) && [...submitActions, "refund"].includes(actionId)) {
    if (!session.request?.kind) return session.category === "payment" ? "결제 요청 구분을 먼저 선택하세요." : "환불·교환 요청 구분을 먼저 선택하세요.";
    if (submitActions.includes(actionId) && !done(actionId)) {
      const a = assessRequest(session, order);
      if (a.verdict === "no") return `접수 불가 조건이 있습니다: ${a.title}`;
      if (a.verdict === "check") return `처리 조건 확인이 끝나지 않았습니다: ${a.title}`;
    }
  }
  switch (actionId) {
    case "tracking":
      return order?.invoice ? undefined : "출고 전 주문이라 송장이 없습니다.";
    case "return_pickup":
    case "exchange": {
      if (done("return_pickup") || done("exchange")) return "이미 회수가 접수되었습니다.";
      if (!order?.deliveredAt) return "배송 완료 후 접수할 수 있습니다.";
      return undefined;
    }
    case "refund": {
      if (done("refund")) return "이미 환불이 요청되었습니다.";
      if (!done("return_pickup")) return "반품 회수 접수 후 요청할 수 있습니다.";
      return undefined;
    }
    case "reship":
      if (done("reship")) return "이미 재배송이 요청되었습니다.";
      return order?.status === "배송 중" ? undefined : "배송 중인 주문만 재배송할 수 있습니다.";
    case "payment_cancel":
      if (done("payment_cancel")) return "이미 결제 취소가 접수되었습니다.";
      return order?.status === "결제 완료" ? undefined : "출고 후 주문은 반품 절차로 진행하세요.";
    case "return_refuse":
      if (done("return_refuse")) return "이미 반품이 접수되었습니다.";
      return order?.status === "배송 중" ? undefined : "배송 중인 주문만 수취 거부 반품으로 접수할 수 있습니다.";
    case "order_fix": {
      if (done("order_fix")) return "이미 주문 수량을 정정했습니다.";
      const qty = session.request?.confirmedQty;
      if (!qty) return "고객이 확인한 주문 수량을 먼저 선택하세요.";
      return order && qty !== order.qty ? undefined : "주문 수량이 고객 확인 수량과 같아 정정할 필요가 없습니다.";
    }
    case "deposit_sms":
      if (done("deposit_sms")) return "이미 입금 계좌 문자를 보냈습니다.";
      return depositNeedsFix(session, order) && !done("order_fix") ? "주문 수량 정정을 먼저 접수하세요." : undefined;
    case "payment_change":
      if (done("payment_change")) return "이미 결제 수단 변경이 접수되었습니다.";
      return order?.status === "결제 완료" ? undefined : "출고 후 주문은 결제 수단을 바꿀 수 없습니다.";
    default:
      return undefined;
  }
}

/** 문의 유형에 맞는 관련 주문 추정 (규칙 기반 · 상담사 확인 필요) */
export function suggestOrder(category: CategoryId | undefined, orders: Order[]): Order | undefined {
  const sorted = [...orders].sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  const first = (pred: (o: Order) => boolean) => sorted.find(pred);
  switch (category) {
    case "refund_exchange":
      return first((o) => (returnDaysLeft(o) ?? -1) >= 0) ?? first((o) => !!o.deliveredAt) ?? sorted[0];
    case "shipping":
      return first((o) => o.status === "배송 중") ?? sorted[0];
    case "payment":
      return first((o) => o.status === "결제 완료" || o.status === "입금 대기") ?? sorted[0];
    case "product_inquiry":
      return first((o) => o.status === "구매 확정" || o.status === "배송 완료") ?? sorted[0];
    default:
      return sorted[0];
  }
}

export type CheckItem = {
  id: string;
  label: string;
  hint?: string;
  status: "done" | "todo" | "warning" | "blocked";
  statusLabel?: string;
};

/** 사전 브리핑의 상담 전 확인 사항 (주문·고객 데이터로 계산) */
export function briefingChecks(
  category: CategoryId,
  customer: Customer,
  order: Order | undefined,
  history: HistoryRecord[],
): CheckItem[] {
  const items: CheckItem[] = [
    {
      id: "verify",
      label: "본인 확인",
      hint: "생년월일 6자리 · 휴대폰 번호 뒤 4자리",
      status: "todo",
      statusLabel: "연결 후",
    },
  ];
  if (!order && category !== "complaint" && category !== "other") {
    items.push({ id: "order", label: "관련 주문", hint: "주문 내역이 없습니다.", status: "warning", statusLabel: "확인 필요" });
    return items;
  }
  switch (category) {
    case "refund_exchange": {
      const left = order ? returnDaysLeft(order) : undefined;
      const deadline = order ? returnDeadline(order) : undefined;
      items.push(
        order?.deliveredAt
          ? { id: "delivered", label: "배송 완료일 확인", hint: `${fmtDate(order.deliveredAt)} 배송 완료`, status: "done", statusLabel: "자동 확인" }
          : order?.status === "배송 중"
            ? {
                id: "delivered",
                label: "배송 상태",
                hint: "출고 후 배송 중 · 즉시 취소 불가, 반품 접수 후 수취 거부로 진행",
                status: "warning",
                statusLabel: "배송 중",
              }
            : { id: "delivered", label: "배송 완료일 확인", hint: "아직 배송 완료 전입니다.", status: "warning", statusLabel: "배송 전" },
      );
      if (order?.openAs) {
        items.push({
          id: "as",
          label: "진행 중 AS",
          hint: `${order.openAs.receiptNo} · ${order.openAs.symptom} · AS 취소 후 교환할지 확인`,
          status: "warning",
          statusLabel: "확인 필요",
        });
      }
      if (left !== undefined && deadline && order) {
        // 기간은 조건 중 하나일 뿐이라 '반품 가능'으로 확정하지 않습니다.
        const window = order.returnPolicy?.defectWindowDays ?? 30;
        items.push({
          id: "period",
          label: "반품·교환 기간 (단순 변심 7일 기준)",
          hint:
            left < 0
              ? `${fmtDate(deadline)} 경과 · 불량·오배송이면 수령 후 ${window >= 365 ? "1년(품질보증 기간)" : `${window}일`}까지 가능`
              : `${fmtDate(deadline)}까지 · 기간 조건만 충족, 다른 조건은 통화 중 확인`,
          status: left <= 1 ? "warning" : "done",
          statusLabel: left < 0 ? "단순 변심 기간 경과" : left === 0 ? "오늘까지" : `D-${left}`,
        });
      }
      items.push({
        id: "request",
        label: "환불·교환 구분, 요청 사유, 상품 사용·훼손 여부",
        hint: "단순 변심과 불량·오배송은 기한·배송비가 다릅니다.",
        status: "todo",
        statusLabel: "통화 중 확인",
      });
      if (order) {
        items.push({
          id: "policy",
          label: "상품별 정책·중복 접수",
          hint: order.returnPolicy ? order.returnPolicy.note : "상품 정책 정보 없음 · 지식·매뉴얼 확인 필요",
          status: order.returnPolicy ? (order.returnPolicy.simpleChange ? "done" : "warning") : "warning",
          statusLabel: order.returnPolicy ? (order.returnPolicy.simpleChange ? "자동 확인" : "단순 변심 불가") : "확인 필요",
        });
        items.push({
          id: "refund",
          label: "비용·예상 환불액 안내",
          hint: `단순 변심 ${fmtWon(order.price - RETURN_SHIPPING_FEE)} (배송비 ${fmtWon(RETURN_SHIPPING_FEE)} 차감) · 불량·오배송 ${fmtWon(order.price)}`,
          status: "todo",
          statusLabel: "필수 안내",
        });
      }
      break;
    }
    case "shipping": {
      if (order) {
        const since = order.shippedAt ? calendarDaysBetween(order.shippedAt) : undefined;
        items.push({
          id: "status",
          label: "현재 배송 상태",
          hint: [order.status, order.carrier, order.invoice].filter(Boolean).join(" · "),
          status: "done",
          statusLabel: "자동 확인",
        });
        if (order.status === "배송 중" && since !== undefined) {
          items.push({
            id: "delay",
            label: "출고 후 경과일",
            hint: `출고 ${since}일째 · 3일 이상이면 택배사 확인 요청`,
            status: since >= 3 ? "warning" : "done",
            statusLabel: since >= 3 ? "지연" : "정상",
          });
        }
      }
      items.push({ id: "eta", label: "도착 예정일 안내", hint: "택배사 확인 후 문자 안내", status: "todo", statusLabel: "필수 안내" });
      break;
    }
    case "payment": {
      if (order) {
        items.push({
          id: "pay",
          label: "결제 수단·금액",
          hint: `${maskPay(order.payMethod)} · ${fmtWon(order.price)}`,
          status: "done",
          statusLabel: "자동 확인",
        });
        items.push(
          order.status === "입금 대기"
            ? { id: "ship", label: "입금 상태", hint: "무통장 입금 대기 · 입금 계좌 재안내 가능", status: "warning", statusLabel: "입금 대기" }
            : order.status === "결제 완료"
              ? { id: "ship", label: "출고 여부", hint: "출고 전 · 즉시 결제 취소 가능", status: "done", statusLabel: "출고 전" }
              : { id: "ship", label: "출고 여부", hint: `${order.status} · 결제 취소 대신 반품 절차`, status: "warning", statusLabel: "출고 후" },
        );
        if (order.status === "입금 대기") {
          items.push({
            id: "qty",
            label: "주문 수량·금액 확인",
            hint: `접수 ${order.qty}${order.unit ?? "개"} · ${fmtWon(order.price)} · 고객이 주문한 수량과 같은지 확인`,
            status: "todo",
            statusLabel: "통화 중 확인",
          });
        }
      }
      items.push(
        order?.status === "입금 대기"
          ? { id: "rule", label: "입금 금액·기한 안내", hint: "주문 후 24시간 내 미입금 시 자동 취소", status: "todo", statusLabel: "필수 안내" }
          : { id: "rule", label: "결제 취소 기준 안내", hint: "카드사 반영 3~5영업일", status: "todo", statusLabel: "필수 안내" },
      );
      break;
    }
    case "product_inquiry": {
      if (order) {
        const days = order.deliveredAt ? calendarDaysBetween(order.deliveredAt) : undefined;
        items.push({ id: "item", label: "문의 상품", hint: `${order.item} · ${order.option}`, status: "done", statusLabel: "자동 확인" });
        if (days !== undefined) {
          items.push({
            id: "warranty",
            label: "무상 AS 기간",
            hint: `수령 후 ${days}일 · 1년 이내 무상`,
            status: days <= 365 ? "done" : "warning",
            statusLabel: days <= 365 ? "무상 대상" : "유상",
          });
        }
      }
      items.push({ id: "info", label: "상품 정보 확인", hint: "지식·매뉴얼에서 확인", status: "todo", statusLabel: "상담 중" });
      break;
    }
    case "complaint": {
      const past = history.filter((h) => h.customerId === customer.id);
      items.push({
        id: "past",
        label: "이전 상담 이력",
        hint: past.length ? `${past.length}건 · 최근 ${fmtDate(past[0].startedAt)}` : "이력 없음",
        status: "done",
        statusLabel: "자동 확인",
      });
      items.push(
        customer.caution
          ? { id: "caution", label: "주의 사항", hint: customer.caution, status: "warning", statusLabel: "확인 필요" }
          : { id: "caution", label: "주의 사항", hint: "특이사항 없음", status: "done", statusLabel: "없음" },
      );
      items.push({ id: "apology", label: "사과 및 사실 확인", hint: "먼저 불편에 대해 사과", status: "todo", statusLabel: "필수 안내" });
      break;
    }
    default:
      items.push({ id: "listen", label: "문의 내용 확인", hint: "음성 접수 원문을 먼저 읽어 보세요.", status: "todo", statusLabel: "상담 중" });
  }
  return items;
}

export type StepState = StepDef & { status: "done" | "current" | "todo" };

export function stepStates(playbook: Playbook, session: Session, order?: Order): StepState[] {
  const isDone = (s: StepDef) => {
    const w = s.doneWhen;
    switch (w.type) {
      case "verified":
        return session.verified;
      case "order":
        return session.orderConfirmed;
      case "request":
        return !!session.request?.kind;
      case "eligible": {
        // 가능·불가가 정해졌거나, 추가 확인 사항을 이관했으면 조건 확인 단계는 끝난 것으로 봅니다.
        const a = assessRequest(session, order);
        return a.verdict !== "check" || !!a.submitted || requestClosure(session, order) === "handoff";
      }
      case "notice":
        return session.notices.includes(w.id);
      case "action":
        return session.actions.some((a) => w.ids.includes(a.actionId));
      case "manual":
        return session.stepsDone.includes(s.id);
    }
  };
  let currentAssigned = false;
  return playbook.steps.map((s) => {
    if (isDone(s)) return { ...s, status: "done" as const };
    if (!currentAssigned && !s.optional) {
      currentAssigned = true;
      return { ...s, status: "current" as const };
    }
    return { ...s, status: "todo" as const };
  });
}
