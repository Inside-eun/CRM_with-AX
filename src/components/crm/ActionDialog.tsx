"use client";

import { useEffect, useRef, useState } from "react";
import {
  CrmButton,
  CrmCheckbox,
  CrmInlineAlert,
  CrmInput,
  CrmKeyValue,
  CrmSelect,
  CrmTimeline,
  Icon,
} from "@/design-system";
import { RETURN_SHIPPING_FEE, fmtDateTime, fmtWon, isoDaysAgo, maskPay, toDateInput } from "@/lib/crm/format";
import { performAction, refundAmount, sessionOrder, toggleNotice } from "@/lib/crm/operations";
import { ACTIONS, playbookFor } from "@/lib/crm/playbooks";
import {
  AGENT_AMOUNT_LIMIT,
  FLOW_SUBMIT_ACTION,
  assessRequest,
  exchangeOptionOf,
  exchangePriceDiff,
  hasRequestFlow,
  isDefectReason,
} from "@/lib/crm/returns";
import type { ActionId, CrmState, PerformedAction, Session } from "@/lib/crm/types";
import { MiniLabel } from "./ui";

function defaultValues(actionId: ActionId, linked: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    ACTIONS[actionId].fields.map((f) => [
      f.id,
      linked[f.id] ??
        (f.type === "select" ? f.defaultValue : f.type === "date" ? toDateInput(isoDaysAgo(-f.defaultDaysLater)) : ""),
    ]),
  );
}

/** 상담 화면의 환불·교환 요청에서 이미 확인한 값. 대화상자에서 다시 고르지 않습니다. */
function linkedValues(actionId: ActionId, session: Session): Record<string, string | undefined> {
  if (actionId === "payment_change") return { method: session.request?.newPayMethod };
  if (session.category !== "refund_exchange") return {};
  if (actionId === "return_pickup") return { reason: session.request?.reason };
  if (actionId === "exchange") return { option: session.request?.exchangeOption };
  return {};
}

/** 처리 기능 확정 팝오버. 확정 전까지 아무것도 실행하지 않습니다. */
export function ActionDialog({
  actionId,
  state,
  session,
  onClose,
  onDone,
}: {
  actionId: ActionId;
  state: CrmState;
  session: Session;
  onClose: () => void;
  onDone: (performed: PerformedAction) => void;
}) {
  const def = ACTIONS[actionId];
  const order = sessionOrder(state);
  const customer = state.customers[session.customerId];
  const playbook = playbookFor(session, order);
  const required = playbook.notices.filter((n) => n.requiredFor?.includes(actionId));
  const linked = linkedValues(actionId, session);
  const assessment = hasRequestFlow(session.category) ? assessRequest(session, order) : undefined;

  const [values, setValues] = useState(() => defaultValues(actionId, linked));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const missingNotices = required.filter((n) => !session.notices.includes(n.id));
  const missingText = def.fields.filter((f) => f.type === "text" && !values[f.id]?.trim());

  const simpleChange = (values.reason ?? "단순 변심") === "단순 변심";
  // 상담원 권한: 본인 확인을 마쳤고 처리 금액이 상담원 접수 한도 이내인지 확인합니다.
  const amount =
    !order
      ? 0
      : actionId === "exchange"
        ? Math.abs(exchangePriceDiff(order, values.option) ?? 0)
        : actionId === "refund"
          ? refundAmount(session, order.price)
          : actionId === "return_pickup"
            ? order.price - (simpleChange ? RETURN_SHIPPING_FEE : 0)
            : order.price;
  const conditionOk =
    !assessment || !assessment.flow || FLOW_SUBMIT_ACTION[assessment.flow] !== actionId || assessment.verdict === "ok";
  const finalChecks = def.consent
    ? [
        {
          id: "order",
          label: "대상 주문 확인",
          hint: order ? `${order.item} · ${order.option} · ${order.no}` : "대상 주문이 없습니다.",
          ok: session.orderConfirmed,
          todo: "좌측 대상 주문에서 '고객에게 주문 확인함'을 누르세요.",
        },
        ...(assessment?.flow && FLOW_SUBMIT_ACTION[assessment.flow] === actionId
          ? [{ id: "cond", label: "처리 조건", hint: assessment.title, ok: conditionOk, todo: assessment.title }]
          : []),
        {
          id: "cost",
          label: "비용·금액 안내",
          hint: required.length ? required.map((n) => n.label).join(", ") : "별도 필수 안내 없음",
          ok: missingNotices.length === 0,
          todo: "아래 필수 안내를 전달하고 체크하세요.",
        },
        { id: "consent", label: "고객 동의", hint: "처리 내용·비용 안내 후 동의", ok: consent, todo: "아래에서 동의를 체크하세요." },
        {
          id: "authority",
          label: "상담원 권한",
          hint: `본인 확인 완료 · 처리 금액 ${fmtWon(amount)} (상담원 한도 ${fmtWon(AGENT_AMOUNT_LIMIT)})`,
          ok: session.verified && amount <= AGENT_AMOUNT_LIMIT,
          todo: session.verified ? "상담원 한도를 넘습니다. 담당자 이관으로 진행하세요." : "본인 확인 후 접수할 수 있습니다.",
        },
      ]
    : [];
  const canConfirm =
    missingNotices.length === 0 &&
    (!def.consent || consent) &&
    missingText.length === 0 &&
    finalChecks.every((c) => c.ok) &&
    !busy;

  const confirm = () => {
    setBusy(true);
    // 백엔드 연동 전이라 접수 요청을 흉내 냅니다.
    timerRef.current = setTimeout(() => {
      const performed = performAction(actionId, values);
      setBusy(false);
      if (performed) onDone(performed);
    }, 600);
  };

  const context: { label: string; value: string; highlight?: boolean }[] = [];
  if (order) context.push({ label: "대상 주문", value: `${order.item} · ${order.option}` });
  switch (actionId) {
    case "return_pickup":
      if (linked.reason) context.push({ label: "반품 사유", value: linked.reason });
      context.push(
        { label: "회수지", value: `${customer.address} (기본 배송지)` },
        {
          label: "반품 배송비",
          value: simpleChange ? `${fmtWon(RETURN_SHIPPING_FEE)} · 고객 부담 (환불 금액에서 차감)` : "회사 부담 (불량·오배송)",
        },
      );
      if (order) {
        context.push({
          label: "예상 환불액",
          value: `${fmtWon(order.price - (simpleChange ? RETURN_SHIPPING_FEE : 0))} · 검수 후 확정`,
          highlight: true,
        });
      }
      break;
    case "exchange": {
      const opt = order ? exchangeOptionOf(order, linked.option) : undefined;
      const diff = order ? exchangePriceDiff(order, linked.option) : undefined;
      const reason = session.request?.reason;
      if (opt) context.push({ label: "교환 옵션", value: `${opt.label} · 재고 ${opt.stock}개` });
      context.push(
        { label: "회수지", value: `${customer.address} (기본 배송지)` },
        {
          label: "교환 배송비",
          value: isDefectReason(reason)
            ? "회사 부담 (불량·오배송)"
            : reason === "단순 변심"
              ? `왕복 ${fmtWon(RETURN_SHIPPING_FEE)} · 고객 부담`
              : `${fmtWon(RETURN_SHIPPING_FEE)} · 단순 변심 시 고객 부담`,
        },
      );
      if (diff !== undefined) {
        context.push({
          label: "가격 차이",
          value: diff === 0 ? "없음" : diff > 0 ? `${fmtWon(diff)} 추가 결제` : `${fmtWon(-diff)} 차액 환불`,
          highlight: true,
        });
      }
      break;
    }
    case "refund":
      if (order) {
        context.push(
          { label: "예상 환불액", value: fmtWon(refundAmount(session, order.price)), highlight: true },
          { label: "환불 수단", value: order.payMethod },
          { label: "예상 일정", value: "회수 상품 검수 후 3~5영업일 (요청 접수 ≠ 환불 완료)" },
        );
      }
      break;
    case "payment_change":
      if (order) {
        context.push(
          { label: "기존 결제", value: `${session.verified ? order.payMethod : maskPay(order.payMethod)} · ${fmtWon(order.price)} 승인 취소` },
          { label: "새 결제 수단", value: linked.method ?? "미확인", highlight: true },
          { label: "예상 일정", value: "기존 결제 취소 3~5영업일 · 재결제 링크 24시간 유효" },
        );
      }
      break;
    case "payment_cancel":
      if (order) {
        context.push(
          { label: "취소 금액", value: fmtWon(order.price), highlight: true },
          { label: "결제 수단", value: `${order.payMethod} · 승인 ${order.approvalNo}` },
        );
      }
      break;
    case "reship":
      context.push({ label: "배송지", value: customer.address });
      break;
    case "as":
      context.push({ label: "회수지", value: customer.address });
      break;
    case "transfer":
    case "voc":
      context.push({ label: "함께 전달", value: "상담 메모 · 문의 유형 · 음성 접수 원문" });
      break;
    case "callback":
      context.push({ label: "연락처", value: session.verified ? customer.phone : "등록된 휴대폰 번호" });
      break;
  }

  const isLookup = actionId === "tracking";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`${def.label} 확인`}
      className="crm-scroll absolute bottom-[calc(100%+8px)] left-6 z-20 flex max-h-[70vh] w-[420px] flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
      style={{ boxShadow: "var(--shadow-xl)", animation: "crm-slide-in .2s var(--ease-standard)" }}
    >
      <div>
        <div className="text-base font-semibold text-gray-900">{isLookup ? def.label : `${def.label} 확정`}</div>
        <div className="text-[13px] text-gray-600">{def.description}</div>
      </div>

      {context.length > 0 && <CrmKeyValue labelWidth={96} items={context} />}

      {isLookup && order?.tracking && (
        <CrmTimeline
          compact
          items={order.tracking.map((t, i) => ({
            title: t.title,
            meta: fmtDateTime(t.at),
            desc: t.desc,
            icon: i === 0 ? "MapPin" : "Circle",
            tone: i === 0 ? "info" : "neutral",
          }))}
        />
      )}

      {def.fields.filter((f) => !linked[f.id]).map((f) =>
        f.type === "select" ? (
          <CrmSelect
            key={f.id}
            size="sm"
            label={f.label}
            value={values[f.id]}
            onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
            options={f.options}
          />
        ) : (
          <CrmInput
            key={f.id}
            size="sm"
            type={f.type}
            label={f.label}
            value={values[f.id]}
            placeholder={f.type === "text" ? f.placeholder : undefined}
            onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
          />
        ),
      )}

      {required.length > 0 && (
        <div className="flex flex-col gap-2">
          <MiniLabel className="mb-0">필수 안내</MiniLabel>
          {required.map((n) => (
            <CrmCheckbox
              key={n.id}
              checked={session.notices.includes(n.id)}
              onChange={(v) => toggleNotice(n.id, v)}
              label={n.label}
              hint={`“${n.script}”`}
            />
          ))}
          {missingNotices.length > 0 && (
            <CrmInlineAlert tone="warning">필수 안내를 고객에게 전달하고 체크해야 확정할 수 있습니다.</CrmInlineAlert>
          )}
        </div>
      )}

      {def.consent && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <CrmCheckbox
            checked={consent}
            onChange={setConsent}
            label="고객에게 처리 내용을 안내하고 동의를 받았습니다"
            hint="환불·반품·결제 취소는 상담사가 확인한 뒤에만 접수됩니다."
          />
        </div>
      )}

      {finalChecks.length > 0 && (
        <div className="flex flex-col gap-1">
          <MiniLabel className="mb-0">최종 접수 전 확인</MiniLabel>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {finalChecks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px] leading-5">
                <Icon
                  name={c.ok ? "CheckCircle" : "AlertTriangle"}
                  size={14}
                  className="mt-[3px] flex-none"
                  style={{ color: c.ok ? "var(--success-600)" : "var(--warning-600)" }}
                />
                <span className="w-20 flex-none font-medium text-gray-700">{c.label}</span>
                <span className={`min-w-0 flex-1 ${c.ok ? "text-gray-600" : "text-warning-700"}`}>{c.ok ? c.hint : c.todo}</span>
              </li>
            ))}
          </ul>
          {def.receiptPrefix && (
            <div className="text-xs text-gray-500">
              데모: 실제 주문·결제는 바뀌지 않고 이 브라우저의 상담 기록에만 남습니다.{" "}
              확정하면 접수만 됩니다. 실제{" "}
              {actionId === "exchange" ? "교환 상품 출고" : actionId === "payment_change" ? "결제 수단 변경" : "환불"}는 회수·검수, 카드사 반영
              또는 고객 재결제 후 완료됩니다.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <CrmButton size="sm" onClick={onClose} disabled={busy}>
          취소
        </CrmButton>
        <CrmButton
          size="sm"
          variant={actionId === "payment_cancel" ? "danger" : "primary"}
          loading={busy}
          disabled={!canConfirm}
          onClick={confirm}
        >
          {isLookup ? "조회 기록 남기기" : def.receiptPrefix ? "접수 확정" : "확정"}
        </CrmButton>
      </div>
    </div>
  );
}
