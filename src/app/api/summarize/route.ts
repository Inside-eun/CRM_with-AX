import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type SummaryInput = {
  category: string;
  intakeTranscript: string | null;
  keyRequest: string | null;
  callTranscripts: string[];
  memo: string;
  verified: boolean;
  order: { item: string; option: string; price: number; status: string } | null;
  notices: string[];
  actions: { label: string; receiptNo: string | null; detail: string | null }[];
};

// 상담 후처리용 AI 요약 초안. 상담사가 검토·수정한 뒤 저장합니다.
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local을 확인하세요." },
      { status: 500 }
    );
  }

  let input: SummaryInput;
  try {
    input = (await req.json()) as SummaryInput;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 고객센터 상담 기록을 요약하는 어시스턴트다. 주어진 상담 기록에 있는 사실만 사용하고, 기록에 없는 처리나 안내를 했다고 쓰지 않는다. 각 항목은 1~2문장으로 간결하게 쓰고, 모든 문장은 반드시 '~합니다', '~했습니다', '~요청했습니다'처럼 합니다체로 끝낸다 ('~이다', '~했다', '~확인' 같은 끝맺음 금지). 접수번호와 금액은 기록에 있는 그대로 쓴다. 예: request \"린넨 셔츠 원피스가 커서 반품하고, 배송비와 환불 시점을 문의했습니다.\", told \"반품 가능 기간과 왕복 배송비 6,000원 고객 부담을 안내했습니다.\", result \"반품 회수를 접수했습니다 (RT-12345).\" 응답은 JSON 형식으로만 출력한다.",
        },
        {
          role: "user",
          content: `다음 상담 기록을 세 항목으로 요약해줘.\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "consultation_summary",
          schema: {
            type: "object",
            properties: {
              request: { type: "string", description: "고객 요청사항" },
              told: { type: "string", description: "상담사가 고객에게 안내한 내용 (notices와 메모 기준)" },
              result: { type: "string", description: "실제 처리 결과 (actions 기준, 없으면 처리하지 않았다고 씀)" },
            },
            required: ["request", "told", "result"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "요약 결과를 받지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
