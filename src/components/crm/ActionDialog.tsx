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
} from "@/design-system";
import { RETURN_SHIPPING_FEE, fmtDateTime, fmtWon, isoDaysAgo, toDateInput } from "@/lib/crm/format";
import { performAction, refundAmount, sessionOrder, toggleNotice } from "@/lib/crm/operations";
import { ACTIONS, PLAYBOOKS } from "@/lib/crm/playbooks";
import type { ActionId, CrmState, PerformedAction, Session } from "@/lib/crm/types";
import { MiniLabel } from "./ui";

function defaultValues(actionId: ActionId): Record<string, string> {
  return Object.fromEntries(
    ACTIONS[actionId].fields.map((f) => [
      f.id,
      f.type === "select" ? f.defaultValue : f.type === "date" ? toDateInput(isoDaysAgo(-f.defaultDaysLater)) : "",
    ]),
  );
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
  const playbook = PLAYBOOKS[session.category ?? "other"];
  const required = playbook.notices.filter((n) => n.requiredFor?.includes(actionId));

  const [values, setValues] = useState(() => defaultValues(actionId));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const missingNotices = required.filter((n) => !session.notices.includes(n.id));
  const missingText = def.fields.filter((f) => f.type === "text" && !values[f.id]?.trim());
  const canConfirm = missingNotices.length === 0 && (!def.consent || consent) && missingText.length === 0 && !busy;

  const confirm = () => {
    setBusy(true);
    // 백엔드 연동 전이라 접수 요청을 흉내 냅니다.
    timerRef.current = setTimeout(() => {
      const performed = performAction(actionId, values);
      setBusy(false);
      if (performed) onDone(performed);
    }, 600);
  };

  const simpleChange = (values.reason ?? "단순 변심") === "단순 변심";
  const context: { label: string; value: string; highlight?: boolean }[] = [];
  if (order) context.push({ label: "대상 주문", value: `${order.item} · ${order.option}` });
  switch (actionId) {
    case "return_pickup":
      context.push(
        { label: "회수지", value: `${customer.address} (기본 배송지)` },
        {
          label: "반품 배송비",
          value: simpleChange ? `${fmtWon(RETURN_SHIPPING_FEE)} · 고객 부담 (환불 금액에서 차감)` : "회사 부담 (불량·오배송)",
        },
      );
      if (order) {
        context.push({
          label: "환불 예정",
          value: fmtWon(order.price - (simpleChange ? RETURN_SHIPPING_FEE : 0)),
          highlight: true,
        });
      }
      break;
    case "exchange":
      context.push(
        { label: "회수지", value: `${customer.address} (기본 배송지)` },
        { label: "교환 배송비", value: `${fmtWon(RETURN_SHIPPING_FEE)} · 단순 변심 시 고객 부담` },
      );
      break;
    case "refund":
      if (order) {
        context.push(
          { label: "환불 예정 금액", value: fmtWon(refundAmount(session, order.price)), highlight: true },
          { label: "환불 수단", value: order.payMethod },
          { label: "환불 시점", value: "회수 상품 검수 후 3~5영업일" },
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

      {def.fields.map((f) =>
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
          {isLookup ? "조회 기록 남기기" : "확정"}
        </CrmButton>
      </div>
    </div>
  );
}
