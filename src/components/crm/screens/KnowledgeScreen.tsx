"use client";

import { useEffect, useRef, useState } from "react";
import { CrmBadge, CrmCard, CrmChecklist, CrmInput, Icon } from "@/design-system";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { ACTIONS, COMMON_ACTIONS, PLAYBOOKS, POLICIES, policyById, type Policy } from "@/lib/crm/playbooks";
import { MiniLabel, PageHeader } from "../ui";

function initialCategory(category?: string, policy?: string): CategoryId {
  if (category && category in PLAYBOOKS) return category as CategoryId;
  if (policy) {
    const pb = Object.values(PLAYBOOKS).find((p) => p.policies.includes(policy));
    if (pb) return pb.category;
  }
  return "refund_exchange";
}

export function KnowledgeScreen({ category, policy }: { category?: string; policy?: string }) {
  const [selected, setSelected] = useState<CategoryId>(() => initialCategory(category, policy));
  const [q, setQ] = useState("");
  const focusRef = useRef<HTMLDivElement>(null);
  const pb = PLAYBOOKS[selected];
  const query = q.trim().toLowerCase();

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const policyHits: Policy[] = query
    ? POLICIES.filter((p) => `${p.name} ${p.text}`.toLowerCase().includes(query))
    : [];
  const noticeHits = query
    ? Object.values(PLAYBOOKS).flatMap((p) =>
        p.notices
          .filter((n) => `${n.label} ${n.script}`.toLowerCase().includes(query))
          .map((n) => ({ ...n, category: p.category, title: p.title })),
      )
    : [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="지식·매뉴얼"
        meta="문의 유형별 처리 단계, 필수 안내 문구, 처리 기능, 관련 정책입니다. 상담 화면의 상담 가이드가 이 내용을 사용합니다."
      />
      <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-4">
        <div className="flex flex-col gap-4">
          <CrmInput icon="Search" placeholder="정책·안내 문구 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <CrmCard title="문의 유형별 매뉴얼" icon="BookOpen" flush>
            <nav aria-label="문의 유형별 매뉴얼" className="flex flex-col py-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelected(c.id);
                    setQ("");
                  }}
                  className={`crm-menu-item ${selected === c.id && !query ? "is-selected" : ""}`}
                  aria-current={selected === c.id && !query ? "page" : undefined}
                >
                  <span className="flex-1">{PLAYBOOKS[c.id].title}</span>
                  <span className="text-xs text-gray-400">{c.label}</span>
                </button>
              ))}
            </nav>
          </CrmCard>
        </div>

        {query ? (
          <div className="flex flex-col gap-4">
            <CrmCard title={`“${q.trim()}” 검색 결과`} icon="Search" subtitle={`정책 ${policyHits.length}건 · 안내 문구 ${noticeHits.length}건`}>
              {policyHits.length + noticeHits.length === 0 && <div className="text-[13px] text-gray-500">검색 결과가 없습니다.</div>}
              <div className="flex flex-col gap-3">
                {policyHits.map((p) => (
                  <PolicyBlock key={p.id} policy={p} />
                ))}
                {noticeHits.map((n) => (
                  <button
                    key={`${n.category}-${n.id}`}
                    type="button"
                    onClick={() => {
                      setSelected(n.category);
                      setQ("");
                    }}
                    className="crm-row-hover rounded-md border border-gray-200 p-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                      {n.label}
                      <CrmBadge>{n.title}</CrmBadge>
                    </div>
                    <div className="mt-1 text-[13px] text-gray-600">“{n.script}”</div>
                  </button>
                ))}
              </div>
            </CrmCard>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <CrmCard title={pb.title} icon="BookOpen" subtitle={pb.summary}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <MiniLabel>처리 단계</MiniLabel>
                  <CrmChecklist
                    items={pb.steps.map((s) => ({
                      id: s.id,
                      label: s.optional ? `${s.label} (선택)` : s.label,
                      hint: s.hint,
                      status: "todo",
                      statusLabel:
                        s.doneWhen.type === "notice"
                          ? "안내 체크"
                          : s.doneWhen.type === "action"
                            ? "처리 기능"
                            : s.doneWhen.type === "manual"
                              ? "상담사 확인"
                              : "자동 확인",
                    }))}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <MiniLabel>처리 기능</MiniLabel>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {[...pb.actions, ...COMMON_ACTIONS].map((id) => (
                        <li key={id} className="flex items-start gap-2 text-[13px]">
                          <Icon name={ACTIONS[id].icon} size={16} style={{ color: "var(--gray-500)", marginTop: 2 }} />
                          <span className="flex-1">
                            <span className="font-semibold text-gray-900">{ACTIONS[id].label}</span>
                            {ACTIONS[id].consent && (
                              <CrmBadge tone="warning" style={{ marginLeft: 6 }}>
                                상담사 확정 · 고객 동의
                              </CrmBadge>
                            )}
                            <span className="block text-gray-600">{ACTIONS[id].description}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <MiniLabel>공통 원칙</MiniLabel>
                    <ul className="m-0 list-disc pl-[18px] text-[13px] leading-5 text-gray-700">
                      <li>본인 확인 전에는 민감 정보를 안내하지 않고 처리 기능을 실행하지 않습니다.</li>
                      <li>AI 분류와 요약은 제안입니다. 상담사가 확인한 뒤에만 확정합니다.</li>
                      <li>환불·반품·결제 취소는 고객 동의를 받고 상담사가 확정합니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CrmCard>

            <CrmCard title="필수 안내 문구" icon="MessageSquare">
              <div className="flex flex-col gap-3">
                {pb.notices.map((n) => (
                  <div key={n.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-gray-900">
                      {n.label}
                      {n.requiredFor && (
                        <CrmBadge tone="warning" icon="AlertTriangle">
                          {n.requiredFor.map((a) => ACTIONS[a].label).join("·")} 전 필수
                        </CrmBadge>
                      )}
                      {n.policyId && <span className="text-xs font-normal text-gray-500">{policyById(n.policyId)?.name}</span>}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">“{n.script}”</div>
                  </div>
                ))}
              </div>
            </CrmCard>

            <CrmCard title="관련 정책" icon="FileText">
              <div className="flex flex-col gap-3">
                {pb.policies.map((id) => {
                  const p = policyById(id);
                  if (!p) return null;
                  return (
                    <div key={id} ref={id === policy ? focusRef : undefined}>
                      <PolicyBlock policy={p} focused={id === policy} />
                    </div>
                  );
                })}
              </div>
            </CrmCard>
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyBlock({ policy, focused = false }: { policy: Policy; focused?: boolean }) {
  return (
    <div
      id={policy.id}
      className={`rounded-md border p-3 ${focused ? "border-brand-300 bg-brand-25" : "border-gray-200"}`}
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
        <Icon name="BookOpen" size={14} style={{ color: "var(--gray-400)" }} />
        {policy.name}
        <span className="text-xs font-normal text-gray-400">{policy.revisedAt} 개정</span>
      </div>
      <p className="mb-0 mt-1.5 text-[13px] leading-5 text-gray-700">{policy.text}</p>
    </div>
  );
}
