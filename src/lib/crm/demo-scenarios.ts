// 포트폴리오 체험용 데모 음성 시나리오.
// 음성 파일은 public/demo-audio/ 에 넣고 아래 audioSrc 경로만 맞추면 됩니다(파일이 없으면 '음성 준비 중'으로 표시).
// 고객 혼자 말하는 사전 접수 음성이면 recording: "customer", 상담원·고객 대화 전체 녹음이면 "call"로 바꾸세요.
//
// AI 분석은 방문자마다 실행하지 않고, scripts/analyze-demo-audio.mjs로 한 번 실행해 저장한
// demo-results.json의 결과를 불러옵니다(음성 인식 크레딧 절약). 파일을 바꾸면 스크립트를 --force로 다시 실행하세요.
import type { ClassifyResult } from "@/lib/useVoiceClassify";
import savedResults from "./demo-results.json";
import type { CrmState, DemoScenarioId, Order, RecordingKind } from "./types";

export type DemoScenario = {
  id: DemoScenarioId;
  /** 목록 번호 (①②③) */
  no: number;
  label: string;
  /** 방문자에게 보여 줄 짧은 상황 설명 */
  situation: string;
  audioSrc: string;
  recording: RecordingKind;
  /** 연결된 목 고객 (mock-data.ts) */
  customerId: string;
  /** 후보 주문 — 이 고객의 주문 중 상품명으로 찾습니다. 상담원이 확인하기 전까지 확정하지 않습니다. */
  orderItem: string;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "cancel_return",
    no: 1,
    label: "주문 취소·반품 요청",
    situation:
      "주문한 스포츠 롱 벤치코트(블랙/90)를 취소하려는 고객입니다. 다른 곳에서 비슷한 상품을 샀다고 합니다. 이미 출고되어 즉시 취소 대신 반품(수취 거부)으로 진행합니다.",
    audioSrc: "/demo-audio/01-cancel-return.m4a",
    recording: "call",
    customerId: "C-10231",
    orderItem: "스포츠 롱 벤치코트",
  },
  {
    id: "exchange",
    no: 2,
    label: "제품 교환 요청",
    situation:
      "6월에 산 구강 세정기가 작동이 됐다 안 됐다 해서 교환을 원하는 고객입니다. 이미 AS가 접수되어 있어 AS를 취소하고 교환할지 확인합니다.",
    audioSrc: "/demo-audio/02-exchange.m4a",
    recording: "call",
    customerId: "C-18820",
    orderItem: "동복제약 벤트릭스 구강 세정기",
  },
  {
    id: "deposit_info",
    no: 3,
    label: "무통장 입금 계좌 안내 요청",
    situation:
      "영광 모시떡을 무통장 입금으로 주문했는데 계좌번호 문자를 받지 못한 고객입니다. 주문이 2세트로 잘못 접수되어 1세트로 정정한 뒤 입금 계좌를 다시 보냅니다.",
    audioSrc: "/demo-audio/03-deposit-account.m4a",
    recording: "call",
    customerId: "C-00982",
    orderItem: "영광 모시떡",
  },
];

export const NUMBER_MARK = ["", "①", "②", "③", "④", "⑤"];

export const demoScenario = (id: DemoScenarioId) => DEMO_SCENARIOS.find((s) => s.id === id)!;

export function scenarioOrder(state: CrmState, scenario: DemoScenario): Order | undefined {
  return state.orders.find((o) => o.customerId === scenario.customerId && o.item === scenario.orderItem);
}

export type SavedAnalysis = { analyzedAt: string; audioSrc: string; recording: RecordingKind; result: ClassifyResult };

/** 미리 실행해 저장한 AI 분석 결과. 음성 파일 경로가 바뀌었으면 예전 결과로 보고 쓰지 않습니다. */
export function savedAnalysis(id: DemoScenarioId): SavedAnalysis | undefined {
  const saved = (savedResults as Partial<Record<DemoScenarioId, SavedAnalysis>>)[id];
  return saved && saved.audioSrc === demoScenario(id).audioSrc ? saved : undefined;
}

const availability = new Map<string, Promise<boolean>>();

/** 음성 파일이 실제로 있는지 확인합니다(없는 경로는 Next가 HTML 404를 돌려줍니다). */
export function checkAudioAvailable(src: string): Promise<boolean> {
  let p = availability.get(src);
  if (!p) {
    p = fetch(src, { method: "HEAD", cache: "no-store" })
      .then((res) => res.ok && (res.headers.get("content-type") ?? "").startsWith("audio/"))
      .catch(() => false);
    availability.set(src, p);
  }
  return p;
}
