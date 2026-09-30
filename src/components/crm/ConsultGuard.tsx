"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CrmCard } from "@/design-system";
import { getLastSavedRecordId } from "@/lib/crm/operations";
import { useCrm } from "@/lib/crm/store";
import type { CrmState, Session, Stage } from "@/lib/crm/types";
import { EmptyState, HomeLinkButton, LoadingScreen, STAGE_LABELS, STAGE_ROUTES } from "./ui";

/** 진행 중인 상담이 해당 단계일 때만 화면을 보여 줍니다. */
export function ConsultGuard({
  stage,
  children,
}: {
  stage: Stage;
  children: (ctx: { state: CrmState; session: Session }) => ReactNode;
}) {
  const state = useCrm();
  if (!state) return <LoadingScreen />;
  const session = state.session;

  const savedId = getLastSavedRecordId();
  if (!session && stage === "wrapup" && savedId) {
    return (
      <div className="p-6">
        <CrmCard>
          <EmptyState
            icon="CheckCircle"
            title="상담 기록을 저장했습니다"
            action={
              <Link href={`/history/${savedId}?saved=1`} className="crm-btn primary md">
                상담 이력 보기
              </Link>
            }
          />
        </CrmCard>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <CrmCard>
          <EmptyState icon="PhoneOff" title="진행 중인 상담이 없습니다" action={<HomeLinkButton />}>
            상담 홈에서 다음 고객의 사전 브리핑을 시작하세요.
          </EmptyState>
        </CrmCard>
      </div>
    );
  }

  if (session.stage !== stage) {
    return (
      <div className="p-6">
        <CrmCard>
          <EmptyState
            icon="ArrowRight"
            title={`현재 상담은 ${STAGE_LABELS[session.stage]} 단계입니다`}
            action={
              <Link href={STAGE_ROUTES[session.stage]} className="crm-btn primary md">
                {STAGE_LABELS[session.stage]}으로 이동
              </Link>
            }
          >
            상담 단계는 사전 브리핑 → 실시간 상담 → 상담 후처리 순서로 진행되며 이전 단계로 돌아갈 수 없습니다.
          </EmptyState>
        </CrmCard>
      </div>
    );
  }

  return <>{children({ state, session })}</>;
}
