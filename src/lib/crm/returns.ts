// 환불/교환·결제 요청 처리 조건 판단 (규칙 기반). 확인하지 않은 값은 추측하지 않고 "추가 확인 필요"로 둡니다.
// 판단 결과는 상담사 안내용이며, 최종 접수는 상담사가 고객 동의를 받은 뒤 확정합니다.
import {
  RETURN_SHIPPING_FEE,
  RETURN_WINDOW_DAYS,
  calendarDaysBetween,
  fmtDate,
  fmtWon,
  maskPay,
} from "./format";
import type { CategoryId } from "@/lib/categories";
import type {
  ActionId,
  Customer,
  Order,
  OrderStatus,
  PerformedAction,
  RequestKind,
  ReturnReason,
  ReturnRequest,
  Session,
} from "./types";

/** 불량·오배송 반품·교환 가능 기간(수령 후) */
export const DEFECT_WINDOW_DAYS = 30;
/** 상담사가 직접 접수할 수 있는 환불·취소 금액 한도. 넘으면 담당자 이관합니다. */
export const AGENT_AMOUNT_LIMIT = 300000;

export const RETURN_REASONS: ReturnReason[] = ["단순 변심", "상품 불량", "오배송"];

export type Verdict = "ok" | "no" | "check";

export const VERDICT_LABEL: Record<Verdict, string> = { ok: "가능", no: "불가", check: "추가 확인 필요" };

export type Basis = { id: string; label: string; verdict: Verdict; text: string };

/** cancel = 출고 전 결제 취소, return = 배송 후 반품, exchange = 교환, method_change = 결제 수단 변경 */
export type RequestFlow = "cancel" | "return" | "exchange" | "method_change";

export const FLOW_LABEL: Record<RequestFlow, string> = {
  cancel: "출고 전 결제 취소(환불)",
  return: "환불 · 배송 후 반품",
  exchange: "교환",
  method_change: "결제 수단 변경",
};

/** 이 흐름에서 접수하는 처리 기능 */
export const FLOW_SUBMIT_ACTION: Record<RequestFlow, ActionId> = {
  cancel: "payment_cancel",
  return: "return_pickup",
  exchange: "exchange",
  method_change: "payment_change",
};

/** 요청 구분을 고르는 문의 유형과 그 선택지 */
export const REQUEST_KINDS: Partial<Record<CategoryId, { id: RequestKind; label: string }[]>> = {
  refund_exchange: [
    { id: "refund", label: "환불" },
    { id: "exchange", label: "교환" },
  ],
  payment: [
    { id: "cancel", label: "결제 취소" },
    { id: "method_change", label: "결제 수단 변경" },
  ],
};

export const hasRequestFlow = (category?: CategoryId) => !!category && !!REQUEST_KINDS[category];

export const requestKindLabel = (kind: RequestKind) =>
  Object.values(REQUEST_KINDS)
    .flat()
    .find((k) => k?.id === kind)?.label ?? kind;

/** 결제 수단 변경 선택지. 등록된 다른 결제 수단(번호는 가림)과 결제 링크 방식 */
export function payChangeOptions(customer: Customer, order: Order): string[] {
  const registered = customer.payMethods
    .map((m) => m.replace(/\s*\(기본\)$/, ""))
    .filter((m) => !order.payMethod.startsWith(m))
    .map((m) => `${maskPay(m)} (등록 결제 수단)`);
  return [...registered, "새 카드 (결제 링크 발송)", "간편결제 (결제 링크 발송)"];
}

export type Assessment = {
  flow?: RequestFlow;
  verdict: Verdict;
  title: string;
  basis: Basis[];
  /** 판단 결과에 맞춘 고객 안내 문구 (매뉴얼 기준 문장 조합) */
  script: string;
  costs: { label: string; value: string; highlight?: boolean }[];
  /** 상담사가 이어서 할 일 (판단 결과에 따라 다름) */
  next: string[];
  /** 불가일 때 고객에게 안내할 대안 문구 */
  alternative?: string;
  /** 이번 상담에서 이미 접수한 처리 */
  submitted?: PerformedAction;
};

/** 불가 근거별 고객 안내 표현 */
const NO_REASON_PHRASE: Record<string, string> = {
  period: "반품·교환 가능 기간이 지나",
  condition: "사용하시거나 훼손된 상품은 단순 변심으로",
  policy: "이 상품은 상품별 정책상 단순 변심으로",
  dup: "이미 접수된 건이 있어 새로",
  option: "희망하신 옵션의 재고가 없어 해당 옵션으로는",
};

/** 추가 확인이 필요한 근거별 상담사 할 일 */
function checkAction(b: Basis, order: Order): string {
  switch (b.id) {
    case "reason":
      return "요청 사유(단순 변심 / 상품 불량 / 오배송) 확인";
    case "condition":
      return "상품 사용·훼손 여부(착용 흔적, 택·포장 상태) 확인";
    case "evidence":
      return "불량 부위·오배송 상품 사진 요청 후 확인";
    case "policy":
      return order.returnPolicy ? "요청 사유 확인 (단순 변심이면 상품별 정책상 불가)" : "지식·매뉴얼에서 상품별 반품 정책 확인";
    case "period":
      return "불량·오배송인지 확인 (30일 기준 적용)";
    case "option":
      return order.exchangeOptions?.length ? "고객 희망 옵션 확인" : "상품 MD팀에 교환 옵션·재고 확인 (담당자 이관)";
    default:
      return `${b.label} 확인`;
  }
}

export const HANDOFF_HINT = "바로 확인하기 어려우면 담당자 이관 또는 콜백 예약";

const PENDING_STATUSES: OrderStatus[] = ["반품 접수", "교환 접수", "환불 요청", "결제 취소 요청", "결제 수단 변경 요청"];
const SIMPLE_PAY = /페이/;

export const isDefectReason = (r?: ReturnReason) => r === "상품 불량" || r === "오배송";

export function requestFlow(session: Session, order?: Order): RequestFlow | undefined {
  const kind = session.request?.kind;
  if (!kind) return undefined;
  if (session.category === "payment") {
    return kind === "method_change" ? "method_change" : kind === "cancel" ? "cancel" : undefined;
  }
  if (session.category !== "refund_exchange") return undefined;
  if (kind === "exchange") return "exchange";
  if (kind !== "refund") return undefined;
  if (session.actions.some((a) => a.actionId === "payment_cancel")) return "cancel";
  return order?.status === "결제 완료" ? "cancel" : "return";
}

/** 사유별 반품 기한. 사유를 모르면 단순 변심 기준(짧은 기한)으로 보여 줍니다. */
export function returnDeadlineFor(order: Order, reason?: ReturnReason): string | undefined {
  if (!order.deliveredAt) return undefined;
  const days = isDefectReason(reason) ? DEFECT_WINDOW_DAYS : RETURN_WINDOW_DAYS;
  return new Date(new Date(order.deliveredAt).getTime() + days * 86400000).toISOString();
}

function refundSchedule(order: Order): string {
  return SIMPLE_PAY.test(order.payMethod) ? "결제사 반영 1~3영업일" : "카드사 반영 3~5영업일";
}

export function exchangeOptionOf(order: Order, label?: string) {
  return label ? order.exchangeOptions?.find((o) => o.label === label) : undefined;
}

/** 교환 옵션의 가격 차이 (양수 = 고객 추가 결제, 음수 = 차액 환불) */
export function exchangePriceDiff(order: Order, label?: string): number | undefined {
  const opt = exchangeOptionOf(order, label);
  if (!opt) return undefined;
  return opt.price * order.qty - order.price;
}

function periodBasis(order: Order, reason?: ReturnReason): Basis {
  const since = calendarDaysBetween(order.deliveredAt!);
  const simpleLeft = RETURN_WINDOW_DAYS - since;
  const defectLeft = DEFECT_WINDOW_DAYS - since;
  const simpleEnd = fmtDate(returnDeadlineFor(order, "단순 변심")!);
  const defectEnd = fmtDate(returnDeadlineFor(order, "상품 불량")!);
  const label = "반품·교환 기간";
  if (reason === "단순 변심") {
    return simpleLeft >= 0
      ? { id: "period", label, verdict: "ok", text: `수령 후 ${since}일 · 단순 변심 기한 ${simpleEnd}까지` }
      : { id: "period", label, verdict: "no", text: `수령 후 ${since}일 · 단순 변심 기한(${RETURN_WINDOW_DAYS}일) ${simpleEnd} 경과` };
  }
  if (isDefectReason(reason)) {
    return defectLeft >= 0
      ? { id: "period", label, verdict: "ok", text: `수령 후 ${since}일 · 불량·오배송 기한 ${defectEnd}까지` }
      : { id: "period", label, verdict: "no", text: `수령 후 ${since}일 · 불량·오배송 기한(${DEFECT_WINDOW_DAYS}일) ${defectEnd} 경과` };
  }
  // 사유 미확인: 기한이 사유마다 달라 확정하지 않습니다.
  if (simpleLeft >= 0) {
    return { id: "period", label, verdict: "ok", text: `수령 후 ${since}일 · 단순 변심 기한 ${simpleEnd}까지 (가장 짧은 기한 기준 충족)` };
  }
  if (defectLeft >= 0) {
    return {
      id: "period",
      label,
      verdict: "check",
      text: `단순 변심 기한 ${simpleEnd} 경과 · 불량·오배송이면 ${defectEnd}까지 가능`,
    };
  }
  return { id: "period", label, verdict: "no", text: `수령 후 ${since}일 · 모든 반품·교환 기한 경과` };
}

function returnBases(order: Order, req: ReturnRequest): Basis[] {
  const bases: Basis[] = [periodBasis(order, req.reason)];
  const reason = req.reason;

  bases.push(
    reason
      ? {
          id: "reason",
          label: "요청 사유",
          verdict: "ok",
          text: isDefectReason(reason) ? `${reason} · 배송비 회사 부담 정책(3.4조)` : "단순 변심 · 왕복 배송비 고객 부담 정책(3.2조)",
        }
      : { id: "reason", label: "요청 사유", verdict: "check", text: "단순 변심인지 불량·오배송인지 확인 필요 (기한·배송비가 달라집니다)" },
  );

  if (isDefectReason(reason)) {
    bases.push(
      req.evidence === "confirmed"
        ? { id: "evidence", label: "불량·오배송 확인", verdict: "ok", text: "사진·내용 확인함" }
        : req.evidence === "missing"
          ? { id: "evidence", label: "불량·오배송 확인", verdict: "check", text: "사진을 받지 못함 · 사진 요청 후 접수" }
          : { id: "evidence", label: "불량·오배송 확인", verdict: "check", text: "불량 부위·오배송 상품 사진 확인 필요" },
    );
  } else {
    bases.push(
      req.condition === "intact"
        ? { id: "condition", label: "상품 사용·훼손", verdict: "ok", text: "미사용 · 훼손 없음 (고객 확인)" }
        : req.condition === "damaged"
          ? reason === "단순 변심"
            ? { id: "condition", label: "상품 사용·훼손", verdict: "no", text: "사용·훼손된 상품은 단순 변심 반품·교환 불가" }
            : { id: "condition", label: "상품 사용·훼손", verdict: "check", text: "사용·훼손 있음 · 불량 여부 확인 필요" }
          : { id: "condition", label: "상품 사용·훼손", verdict: "check", text: "착용·사용 흔적, 택·포장 상태 확인 필요" },
    );
  }

  const policy = order.returnPolicy;
  if (!policy) {
    bases.push({ id: "policy", label: "상품별 정책", verdict: "check", text: "주문에 상품 정책 정보가 없음 · 지식·매뉴얼에서 확인 필요" });
  } else if (!policy.simpleChange && reason === "단순 변심") {
    bases.push({ id: "policy", label: "상품별 정책", verdict: "no", text: policy.note });
  } else if (!policy.simpleChange && !reason) {
    bases.push({ id: "policy", label: "상품별 정책", verdict: "check", text: `${policy.note} · 사유 확인 필요` });
  } else {
    bases.push({ id: "policy", label: "상품별 정책", verdict: "ok", text: policy.note });
  }
  return bases;
}

function duplicateBasis(order: Order, submitted?: PerformedAction): Basis {
  if (submitted) {
    return { id: "dup", label: "중복 접수", verdict: "ok", text: `이번 상담에서 접수함${submitted.receiptNo ? ` (${submitted.receiptNo})` : ""}` };
  }
  return PENDING_STATUSES.includes(order.status)
    ? { id: "dup", label: "중복 접수", verdict: "no", text: `이미 '${order.status}' 상태인 주문입니다 · 기존 접수 건 확인` }
    : { id: "dup", label: "중복 접수", verdict: "ok", text: "진행 중인 반품·교환·환불 접수 없음" };
}

function aggregate(bases: Basis[]): Verdict {
  if (bases.some((b) => b.verdict === "no")) return "no";
  if (bases.some((b) => b.verdict === "check")) return "check";
  return "ok";
}

/** 환불/교환 요청의 처리 가능 여부와 근거 */
export function assessRequest(session: Session, order?: Order): Assessment {
  const req = session.request ?? {};
  const flow = requestFlow(session, order);
  if (!flow) {
    return {
      verdict: "check",
      title: session.category === "payment" ? "요청 구분 필요 · 결제 취소인지 결제 수단 변경인지 확인하세요" : "요청 구분 필요 · 환불인지 교환인지 확인하세요",
      basis: [],
      script:
        session.category === "payment"
          ? "결제를 취소하시려는 건지, 결제 수단만 바꾸시려는 건지 여쭤봐도 될까요?"
          : "환불을 원하시는지, 다른 옵션으로 교환을 원하시는지 여쭤봐도 될까요?",
      costs: [],
      next: [session.category === "payment" ? "고객에게 결제 취소·결제 수단 변경 중 원하는 요청 확인" : "고객에게 환불·교환 중 원하는 요청 확인"],
    };
  }
  if (!order) {
    return {
      flow,
      verdict: "check",
      title: "대상 주문을 먼저 선택하세요",
      basis: [],
      script: "어떤 주문 건인지 확인해 드리겠습니다.",
      costs: [],
      next: ["좌측 '다른 주문'에서 대상 주문 선택"],
    };
  }
  const submitted = session.actions.find((a) => a.actionId === FLOW_SUBMIT_ACTION[flow] && a.orderNo === order.no);
  const dup = duplicateBasis(order, submitted);

  if (flow === "cancel") {
    const bases: Basis[] = [
      submitted || order.status === "결제 완료"
        ? { id: "ship", label: "출고 여부", verdict: "ok", text: "출고 전 · 결제 승인 취소로 환불" }
        : { id: "ship", label: "출고 여부", verdict: "no", text: `${order.status} · 출고 후에는 반품으로 진행` },
      dup,
    ];
    const verdict = aggregate(bases);
    return {
      flow,
      verdict,
      submitted,
      basis: bases,
      title: verdict === "ok" ? "출고 전 취소 가능" : "출고 전 취소 불가",
      script:
        verdict === "ok"
          ? `아직 출고 전이라 결제를 바로 취소해 드릴 수 있습니다. ${fmtWon(order.price)} 전액이 취소되며 ${refundSchedule(order)}이 걸릴 수 있습니다.`
          : order.status === "결제 완료" || submitted
            ? "확인해 보니 이미 처리 중인 건이 있어 새로 취소를 접수하기 어렵습니다."
            : "확인해 보니 이미 출고되어 결제를 바로 취소해 드리기 어렵습니다.",
      next:
        verdict === "ok"
          ? ["취소 금액·카드사 반영 기간 안내", "고객 동의 후 결제 취소 접수"]
          : bases[0].verdict === "no"
            ? ["출고 후라 즉시 취소 불가 안내", "상품 수령 후 배송 후 반품으로 진행 안내"]
            : ["기존 접수 건 진행 상황 확인·안내"],
      alternative:
        verdict === "ok"
          ? undefined
          : bases[0].verdict === "no"
            ? "상품을 받으신 뒤 반품으로 진행해 드릴 수 있습니다. 받으시면 다시 연락 주세요."
            : "이미 접수된 건의 진행 상황을 확인해 안내해 드리겠습니다.",
      costs: [
        { label: "취소 금액", value: `${fmtWon(order.price)} (전액)`, highlight: true },
        { label: "비용", value: "없음 (출고 전)" },
        { label: "예상 일정", value: `즉시 승인 취소 · ${refundSchedule(order)}` },
      ],
    };
  }

  if (flow === "method_change") {
    const req2 = session.request ?? {};
    const shipped = !submitted && order.status !== "결제 완료";
    const bases: Basis[] = [
      shipped
        ? { id: "ship", label: "출고 여부", verdict: "no", text: `${order.status} · 출고 후에는 결제 수단 변경 불가` }
        : { id: "ship", label: "출고 여부", verdict: "ok", text: "출고 전 · 기존 결제 취소 후 재결제 가능" },
      req2.newPayMethod
        ? { id: "method", label: "새 결제 수단", verdict: "ok", text: req2.newPayMethod }
        : { id: "method", label: "새 결제 수단", verdict: "check", text: "고객이 원하는 결제 수단 확인 필요" },
      dup,
    ];
    const verdict = aggregate(bases);
    const why = bases.find((b) => b.verdict === "no");
    return {
      flow,
      verdict,
      submitted,
      basis: bases,
      title:
        verdict === "ok"
          ? "결제 수단 변경 가능"
          : verdict === "no"
            ? `결제 수단 변경 불가 · ${why!.label}`
            : "추가 확인 필요 · 새 결제 수단",
      script:
        verdict === "ok"
          ? `아직 출고 전이라 결제 수단을 바꿔 드릴 수 있습니다. 기존 ${maskPay(order.payMethod)} 결제 ${fmtWon(order.price)}은 승인 취소되고, ${req2.newPayMethod}로 다시 결제하시면 주문이 그대로 진행됩니다.`
          : verdict === "no"
            ? why!.id === "ship"
              ? "확인해 보니 이미 출고되어 결제 수단을 바꿔 드리기 어렵습니다."
              : "이미 접수된 건이 있어 새로 결제 수단 변경을 접수하기 어렵습니다."
            : "어떤 결제 수단으로 바꾸시길 원하시는지 여쭤봐도 될까요?",
      alternative:
        verdict !== "no"
          ? undefined
          : why!.id === "ship"
            ? "상품을 받으신 뒤 반품하고 원하시는 결제 수단으로 다시 주문하실 수 있습니다."
            : "이미 접수된 건의 진행 상황을 확인해 안내해 드리겠습니다.",
      next:
        verdict === "ok"
          ? ["기존 결제 취소·재결제 방법 안내", "고객 동의 후 결제 수단 변경 접수"]
          : verdict === "no"
            ? why!.id === "ship"
              ? ["출고 후라 결제 수단 변경 불가 안내", "수령 후 반품·재주문 방법 안내"]
              : ["기존 접수 건 진행 상황 확인·안내"]
            : ["고객이 원하는 결제 수단 확인 (등록 수단 또는 결제 링크)"],
      costs: [
        { label: "기존 결제", value: `${fmtWon(order.price)} 승인 취소 · ${refundSchedule(order)}` },
        { label: "재결제", value: `${fmtWon(order.price)} · ${req2.newPayMethod ?? "결제 수단 확인 후"}`, highlight: true },
        { label: "추가 비용", value: "없음 · 재결제 전까지 출고 보류" },
      ],
    };
  }

  const noun = flow === "exchange" ? "교환" : "반품";
  if (!order.deliveredAt) {
    const bases: Basis[] = [
      {
        id: "ship",
        label: "배송 상태",
        verdict: "no",
        text:
          order.status === "배송 중"
            ? `배송 중 · 출고 후라 즉시 취소 불가, 수령 후 ${noun} 접수`
            : `${order.status} · 배송 완료 후 ${noun} 접수`,
      },
      dup,
    ];
    return {
      flow,
      verdict: "no",
      submitted,
      basis: bases,
      title: `지금은 ${noun} 접수 불가 · 배송 완료 후 진행`,
      script: `상품이 아직 배송 중이라 지금은 ${noun} 접수가 어렵습니다.`,
      alternative: `상품을 받으신 뒤 다시 연락 주시면 ${noun} 가능 여부를 확인해 드리겠습니다. 원하시면 받으실 즈음 저희가 먼저 연락드리겠습니다.`,
      next: ["배송 중이라 지금은 접수 불가 안내", "상품 수령 후 재문의 안내 또는 콜백 예약"],
      costs: [],
    };
  }

  const bases = [...returnBases(order, req), dup];
  if (flow === "exchange") {
    const opts = order.exchangeOptions;
    const opt = exchangeOptionOf(order, req.exchangeOption);
    if (!opts?.length) {
      bases.push({ id: "option", label: "희망 옵션·재고", verdict: "check", text: "교환 옵션·재고 정보 없음 · 상품 MD팀 확인 필요" });
    } else if (!opt) {
      bases.push({ id: "option", label: "희망 옵션·재고", verdict: "check", text: "고객 희망 옵션 확인 필요" });
    } else if (opt.stock <= 0) {
      bases.push({ id: "option", label: "희망 옵션·재고", verdict: "no", text: `${opt.label} 재고 없음` });
    } else {
      bases.push({ id: "option", label: "희망 옵션·재고", verdict: "ok", text: `${opt.label} · 재고 ${opt.stock}개` });
    }
  }

  const verdict = aggregate(bases);
  const checks = bases.filter((b) => b.verdict === "check");
  const periodOk = bases.find((b) => b.id === "period")?.verdict === "ok";
  const onlyStateAndReason =
    periodOk && checks.length > 0 && checks.every((b) => ["reason", "condition", "evidence", "policy"].includes(b.id));

  const title =
    verdict === "ok"
      ? `${noun} 접수 가능`
      : verdict === "no"
        ? `${noun} 접수 불가 · ${bases.find((b) => b.verdict === "no")!.label}`
        : onlyStateAndReason && !req.reason
          ? "기간 조건 충족 · 상품 상태와 반품 사유 확인 필요"
          : `추가 확인 필요 · ${checks.map((b) => b.label).join(", ")}`;

  const simple = req.reason === "단순 변심";
  const defect = isDefectReason(req.reason);
  const fee = simple ? `왕복 배송비 ${fmtWon(RETURN_SHIPPING_FEE)}은 고객님 부담입니다` : "배송비는 저희가 부담합니다";

  let script: string;
  if (verdict === "ok") {
    script =
      flow === "exchange"
        ? `확인 결과 ${req.exchangeOption} 옵션으로 교환 접수가 가능합니다. ${fee}. 회수 후 검수가 끝나면 교환 상품을 보내드립니다.`
        : `확인 결과 반품 접수가 가능합니다. ${fee}${simple ? "(환불 금액에서 차감)" : ""}. 회수된 상품 검수가 끝나면 환불이 진행됩니다.`;
  } else if (verdict === "no") {
    const why = bases.find((b) => b.verdict === "no")!;
    script = `죄송하지만 확인해 보니 ${NO_REASON_PHRASE[why.id] ?? "처리 조건에 맞지 않아"} ${noun} 접수가 어렵습니다.`;
  } else if (periodOk) {
    script = `${noun} 가능 기간 안에는 있으시지만, 상품 상태와 ${noun} 사유를 먼저 확인한 뒤 접수 가능 여부를 안내해 드리겠습니다.`;
  } else {
    script = `${noun} 가능 여부를 확인하기 위해 몇 가지 여쭤보겠습니다. 상품을 받으신 뒤 사용하셨는지, 어떤 이유로 ${noun}하시려는지 말씀해 주시겠어요?`;
  }

  const costs: Assessment["costs"] = [];
  if (flow === "return") {
    costs.push(
      {
        label: "반품 배송비",
        value: simple ? `${fmtWon(RETURN_SHIPPING_FEE)} · 고객 부담 (환불액에서 차감)` : defect ? "회사 부담" : `사유 확인 후 결정 (단순 변심 시 ${fmtWon(RETURN_SHIPPING_FEE)})`,
      },
      {
        label: "예상 환불액",
        value: simple
          ? fmtWon(order.price - RETURN_SHIPPING_FEE)
          : defect
            ? `${fmtWon(order.price)} (전액)`
            : `${fmtWon(order.price - RETURN_SHIPPING_FEE)} ~ ${fmtWon(order.price)}`,
        highlight: true,
      },
      { label: "예상 일정", value: `회수 1~3일 → 검수 1~2영업일 → ${refundSchedule(order)}` },
    );
  } else {
    const diff = exchangePriceDiff(order, req.exchangeOption);
    costs.push(
      {
        label: "교환 배송비",
        value: simple ? `왕복 ${fmtWon(RETURN_SHIPPING_FEE)} · 고객 부담` : defect ? "회사 부담" : `사유 확인 후 결정 (단순 변심 시 ${fmtWon(RETURN_SHIPPING_FEE)})`,
      },
      {
        label: "가격 차이",
        value:
          diff === undefined
            ? "희망 옵션 확인 후 계산"
            : diff === 0
              ? "없음"
              : diff > 0
                ? `${fmtWon(diff)} 추가 결제`
                : `${fmtWon(-diff)} 차액 환불`,
        highlight: true,
      },
      { label: "예상 일정", value: "회수 1~3일 → 검수 1~2영업일 → 교환 상품 출고" },
    );
  }

  // 다음 행동과 대안. 교환 불가를 환불 가능으로 해석하지 않고, 환불은 요청 구분을 바꿔 환불 정책으로 다시 판단합니다.
  let next: string[];
  let alternative: string | undefined;
  if (verdict === "ok") {
    next =
      flow === "exchange"
        ? ["교환 배송비·가격 차이 안내", "고객 동의 후 교환 접수"]
        : ["반품 배송비·예상 환불액 안내", "고객 동의 후 반품 회수 접수"];
  } else if (verdict === "check") {
    next = [...checks.map((b) => checkAction(b, order)), HANDOFF_HINT];
  } else {
    const why = bases.find((b) => b.verdict === "no")!;
    const inStock = (order.exchangeOptions ?? []).filter((o) => o.stock > 0 && o.label !== req.exchangeOption);
    const defectStillOpen = calendarDaysBetween(order.deliveredAt) <= DEFECT_WINDOW_DAYS;
    switch (why.id) {
      case "option":
        next = [
          inStock.length ? `재고 있는 다른 옵션 안내: ${inStock.map((o) => o.label).join(", ")}` : "교환 가능한 다른 옵션 없음 안내",
          "반품·환불을 원하면 요청 구분을 '환불'로 바꿔 환불 정책으로 다시 확인",
        ];
        alternative = `${inStock.length ? `${inStock.map((o) => o.label).join(", ")} 옵션은 지금 교환이 가능합니다. ` : ""}다른 옵션을 확인하거나 반품·환불 가능 여부를 별도로 확인하겠습니다.`;
        break;
      case "period":
        next = [
          "기간 경과로 접수 불가 안내",
          ...(req.reason === "단순 변심" && defectStillOpen ? ["불량·오배송이면 30일 기준으로 다시 확인"] : []),
          "필요하면 VOC 등록 또는 담당자 이관",
        ];
        alternative =
          req.reason === "단순 변심" && defectStillOpen
            ? "상품에 불량이 있거나 다른 상품이 왔다면 수령 후 30일까지 접수할 수 있어 확인해 드리겠습니다."
            : "불편을 드려 죄송합니다. 말씀하신 내용은 담당 부서에 전달해 드리겠습니다.";
        break;
      case "condition":
      case "policy":
        next = [`${why.label} 사유로 단순 변심 ${noun} 불가 안내`, "불량·오배송 의심이면 요청 사유를 바꿔 다시 확인"];
        alternative = "상품에 불량이 있거나 다른 상품이 왔다면 불량·오배송으로 접수할 수 있어 확인해 드리겠습니다.";
        break;
      default:
        next = ["기존 접수 건 진행 상황 확인·안내"];
        alternative = "이미 접수된 건의 진행 상황을 확인해 안내해 드리겠습니다.";
    }
  }

  return { flow, verdict, title, basis: bases, script, costs, next, alternative, submitted };
}
