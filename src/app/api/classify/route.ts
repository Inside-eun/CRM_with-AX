import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local을 확인하세요." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const formData = await req.formData();
  const audio = formData.get("audio");

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "ko",
    });

    const transcript = transcription.text.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "음성에서 텍스트를 인식하지 못했습니다." },
        { status: 422 }
      );
    }

    const categoryList = CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `너는 고객센터 상담 텍스트를 다음 카테고리 중 하나로 분류하는 어시스턴트다.\n\n카테고리 목록:\n${categoryList}\n\n반드시 위 카테고리 id 중 하나만 선택해야 한다. 핵심 요청과 세부 항목은 원문에 있는 내용만 한국어로 간결하게 쓴다. 응답은 JSON 형식으로만 출력한다.`,
        },
        {
          role: "user",
          content: `다음은 고객이 남긴 음성 메시지를 텍스트로 변환한 내용이다:\n\n"${transcript}"\n\n이 요청을 분류해줘.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "classification",
          schema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: CATEGORIES.map((c) => c.id),
              },
              confidence: {
                type: "number",
                description: "0에서 1 사이의 확신도",
              },
              reason: {
                type: "string",
                description: "이 카테고리로 분류한 이유 한 문장",
              },
              keyRequest: {
                type: "string",
                description: "고객의 핵심 요청을 상담사가 바로 이해할 수 있게 요약한 한 문장",
              },
              details: {
                type: "array",
                items: { type: "string" },
                description: "고객이 함께 언급한 세부 질문이나 조건 (최대 3개, 원문에 없는 내용은 쓰지 않음)",
              },
            },
            required: ["category", "confidence", "reason", "keyRequest", "details"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "분류 결과를 받지 못했습니다." }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as {
      category: string;
      confidence: number;
      reason: string;
      keyRequest: string;
      details: string[];
    };

    const matched = CATEGORIES.find((c) => c.id === parsed.category);

    return NextResponse.json({
      transcript,
      category: parsed.category,
      categoryLabel: matched?.label ?? parsed.category,
      confidence: parsed.confidence,
      reason: parsed.reason,
      keyRequest: parsed.keyRequest,
      details: parsed.details.slice(0, 3),
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
