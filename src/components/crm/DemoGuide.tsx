"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/design-system";
import { restartDemo } from "@/lib/crm/operations";
import type { Session } from "@/lib/crm/types";
import { STAGE_ROUTES } from "./ui";

// 포트폴리오 방문자용 체험 안내. 현재 단계에 필요한 안내 한 줄만 보여 주고, 닫거나 다시 열 수 있습니다.
const STEPS = ["음성 선택", "AI 분석", "분류 확인·확정", "고객 연결", "상담·검수·저장"];

export function demoStep(session: Session): { index: number; message: string; warn?: boolean } {
  if (session.stage === "wrapup") return { index: 4, message: "AI 요약과 실제 처리 결과를 검수한 뒤 저장하세요." };
  if (session.stage === "live")
    return { index: 4, message: "상담 가이드에 따라 처리한 뒤 상담을 종료하세요. 처리는 데모 기록만 남습니다." };
  if (session.category) return { index: 3, message: "고객 연결을 눌러 상담 가이드를 확인하세요." };
  const intake = session.intake;
  if (intake.status === "done") return { index: 2, message: "AI가 제안한 문의 유형과 요약을 확인하고 확정하세요." };
  if (intake.status === "failed")
    return { index: 1, message: "AI 분석에 실패했습니다. 다시 시도하거나 문의 유형을 직접 선택하세요.", warn: true };
  if (intake.status === "skipped") return { index: 2, message: "문의 유형을 직접 선택해 확정하세요." };
  return { index: session.demoScenarioId ? 1 : 0, message: "음성을 선택하고 AI 분석을 시작하세요." };
}

// 닫음 여부는 이 브라우저에만 저장하는 보기 설정입니다.
const KEY = "ax-crm-demo-guide-hidden";
const listeners = new Set<() => void>();
let hiddenCache: boolean | undefined;

function readHidden(): boolean {
  if (hiddenCache === undefined) {
    try {
      hiddenCache = window.localStorage.getItem(KEY) === "1";
    } catch {
      hiddenCache = false;
    }
  }
  return hiddenCache;
}

function setHidden(v: boolean) {
  hiddenCache = v;
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // 저장이 막혀도 현재 화면에서는 동작합니다.
  }
  listeners.forEach((l) => l());
}

export function useDemoGuideHidden(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readHidden,
    () => false,
  );
}

/** 안내를 닫았을 때 다시 여는 작은 버튼 */
export function DemoGuideToggle() {
  const hidden = useDemoGuideHidden();
  if (!hidden) return null;
  return (
    <button type="button" className="crm-btn link xs" onClick={() => setHidden(false)}>
      <Icon name="Compass" size={14} />
      체험 안내 보기
    </button>
  );
}

export function DemoGuide({ session, variant = "card" }: { session: Session; variant?: "card" | "bar" }) {
  const router = useRouter();
  const hidden = useDemoGuideHidden();
  const [armed, setArmed] = useState(false);
  const { index, message, warn } = demoStep(session);

  if (hidden) {
    // 상담 화면(bar)은 헤더에 DemoGuideToggle을 두어 공간을 쓰지 않습니다.
    return variant === "card" ? (
      <div className="flex justify-end">
        <DemoGuideToggle />
      </div>
    ) : null;
  }

  const restart = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    restartDemo();
    router.push(STAGE_ROUTES.briefing);
  };

  return (
    <div
      role="note"
      aria-label="체험 안내"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] ${
        variant === "card" ? "rounded-lg border border-brand-200 bg-brand-25 px-3 py-2" : "border-b border-brand-200 bg-brand-25 px-6 py-1.5"
      }`}
    >
      <span className="flex items-center gap-1.5 font-semibold text-brand-700">
        <Icon name="Compass" size={14} />
        체험 안내
      </span>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-xs" aria-label="체험 순서">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === index ? "step" : undefined}
            className={`flex items-center gap-1 ${
              i < index ? "text-gray-400" : i === index ? "font-semibold text-brand-700" : "text-gray-500"
            }`}
          >
            {i < index && <Icon name="Check" size={12} />}
            {label}
            {i < STEPS.length - 1 && <Icon name="ChevronRight" size={12} className="text-gray-300" />}
          </li>
        ))}
      </ol>
      <span className={`min-w-0 flex-1 ${warn ? "text-warning-700" : "text-gray-800"}`}>{message}</span>
      <button type="button" className="crm-btn tertiary xs" onClick={restart} onBlur={() => setArmed(false)}>
        <Icon name="RefreshCw" size={14} />
        {armed ? "한 번 더 누르면 처음부터 다시 시작합니다" : "다시 테스트"}
      </button>
      <button type="button" className="crm-btn tertiary xs" aria-label="체험 안내 닫기" onClick={() => setHidden(true)}>
        닫기
      </button>
    </div>
  );
}
