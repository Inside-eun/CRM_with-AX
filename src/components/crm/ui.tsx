"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { CrmBadge, CrmCard, CrmSkeleton, Icon, type IconName } from "@/design-system";
import type { CategoryId } from "@/lib/categories";
import { categoryLabel } from "@/lib/crm/operations";
import type { Grade, Stage, Urgency } from "@/lib/crm/types";

// 1초마다 갱신되는 현재 시각. 서버 렌더링 중에는 0입니다.
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const tickListeners = new Set<() => void>();

function subscribeClock(cb: () => void) {
  tickListeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      tickListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    tickListeners.delete(cb);
    if (tickListeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => now || (now = Date.now()),
    () => 0,
  );
}

/** 클라이언트에서 앱을 처음 불러온 시각 — 대기 시간 계산 기준 */
export const APP_STARTED_AT = typeof window === "undefined" ? 0 : Date.now();

export const STAGE_ROUTES: Record<Stage, string> = {
  briefing: "/consult/briefing",
  live: "/consult/live",
  wrapup: "/consult/wrap-up",
};

export const STAGE_LABELS: Record<Stage, string> = {
  briefing: "사전 브리핑",
  live: "실시간 상담",
  wrapup: "상담 후처리",
};

export function GradeBadge({ grade }: { grade: Grade }) {
  const tone = grade === "VIP" ? "purple" : grade === "GOLD" ? "warning" : "neutral";
  return (
    <CrmBadge tone={tone} square icon={grade === "VIP" || grade === "GOLD" ? "Award" : undefined}>
      {grade}
    </CrmBadge>
  );
}

export function UrgencyBadge({ level }: { level: Urgency }) {
  if (level === "high")
    return (
      <CrmBadge tone="danger" showToneIcon>
        긴급
      </CrmBadge>
    );
  if (level === "mid")
    return (
      <CrmBadge tone="warning" icon="Clock">
        보통
      </CrmBadge>
    );
  return (
    <CrmBadge tone="neutral" icon="Minus">
      낮음
    </CrmBadge>
  );
}

/** AI 분류 결과 배지 (항상 AI 표시 + 신뢰도) */
export function AICategoryBadge({ category, confidence }: { category: CategoryId; confidence: number }) {
  return (
    <CrmBadge tone="ai" icon="Cpu" title="AI 분류 결과">
      {categoryLabel(category)}
      <span className="font-normal text-teal-600">· {Math.round(confidence * 100)}%</span>
    </CrmBadge>
  );
}

/** 상담사가 확정한 문의 유형 */
export function ConfirmedCategoryBadge({ category, source }: { category: CategoryId; source?: "ai" | "agent" }) {
  return (
    <CrmBadge tone="info" icon="CheckCircle" title={source === "ai" ? "AI 제안을 상담사가 확정" : "상담사가 직접 선택"}>
      {categoryLabel(category)}
      <span className="font-normal text-brand-700">· {source === "ai" ? "AI 제안 확정" : "상담사 선택"}</span>
    </CrmBadge>
  );
}

export function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500">{eyebrow}</div>}
        <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-2xl font-semibold text-gray-900">
          {title}
          {children}
        </h1>
        {meta && <div className="mt-1 text-sm text-gray-600">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

export function MiniLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-1.5 text-xs font-semibold text-gray-500 ${className}`}>{children}</div>;
}

/** 대화 말풍선. intake = AI 음성봇 접수, call = 통화 중 음성 인식 */
export function Bubble({ who, time, text, extra }: { who: "intake" | "call"; time?: string; text: string; extra?: ReactNode }) {
  return (
    <div className="flex gap-2.5" style={{ animation: "crm-slide-in .25s var(--ease-standard)" }}>
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600"
        aria-hidden="true"
      >
        고객
      </span>
      <div className="flex max-w-[85%] flex-col items-start gap-1">
        <div className="whitespace-pre-wrap rounded-[2px_10px_10px_10px] border border-gray-200 bg-white px-3 py-2 text-sm leading-[22px] text-gray-800">
          {text}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4 text-gray-400">
          {who === "intake" ? "AI 음성 접수 · 음성 인식(STT)" : "통화 음성 인식(STT)"}
          {time && ` · ${time}`}
          {extra}
        </div>
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex flex-col gap-4 p-6" aria-busy="true">
      <CrmSkeleton width={240} height={28} />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <CrmCard key={i}>
            <CrmSkeleton lines={4} />
          </CrmCard>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon name={icon} size={24} />
      </span>
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {children && <div className="max-w-md text-sm text-gray-600">{children}</div>}
      {action}
    </div>
  );
}

export function HomeLinkButton({ label = "상담 홈으로" }: { label?: string }) {
  return (
    <Link href="/" className="crm-btn secondary md">
      {label}
    </Link>
  );
}

