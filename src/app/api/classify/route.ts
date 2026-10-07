import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CATEGORIES } from "@/lib/categories";
import { normalizeAudioContainer } from "@/lib/audio-container";

export const runtime = "nodejs";

// Whisper 업로드 상한
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** OpenAI 원문 오류를 상담원이 조치할 수 있는 안내로 바꿉니다. */
function toAgentMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";

  if (/Invalid file format/i.test(raw)) {
    return "업로드한 파일에서 오디오를 읽지 못했습니다. 지원되지 않는 코덱일 수 있으니 m4a·mp3·wav로 변환해 올려주세요.";
  }
  if (/too short/i.test(raw)) {
    return "녹음이 너무 짧습니다. 0.1초 이상 녹음된 파일을 올려주세요.";
  }
  if (/Maximum content size|too large/i.test(raw)) {
    return "오디오 파일이 너무 큽니다. 더 짧은 구간만 올려주세요.";
  }
  if (/rate limit/i.test(raw)) {
    return "요청이 일시적으로 많습니다. 잠시 후 다시 시도해주세요.";
  }
  return "음성 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

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

  // 업로드 실패를 나중에 추적할 수 있도록 도착한 파일의 정보를 남깁니다.
  console.info(`[classify] 업로드 수신: name=${audio.name} type=${audio.type} size=${audio.size}`);

  if (audio.size === 0) {
    return NextResponse.json(
      {
        error:
          "오디오 파일이 비어 있습니다. 클라우드 드라이브에 있는 파일이면 먼저 내려받은 뒤 다시 올려주세요.",
      },
      { status: 415 }
    );
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "오디오 파일이 25MB를 넘습니다. 통화를 나눠 올리거나 더 짧은 구간만 올려주세요." },
      { status: 413 }
    );
  }

  // 3gp 브랜드로 저장된 .m4a는 Whisper가 거부하므로 컨테이너 선언만 고쳐 보냅니다.
  const uploaded = new Uint8Array(await audio.arrayBuffer());
  const { bytes, rewroteFrom } = normalizeAudioContainer(uploaded);
  if (rewroteFrom) {
    console.info(`[classify] 컨테이너 브랜드 보정: ${rewroteFrom} -> mp42 (${audio.name})`);
  }
  const file = new File([bytes], audio.name, {
    type: rewroteFrom ? "audio/mp4" : audio.type || "application/octet-stream",
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
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
    return NextResponse.json({ error: toAgentMessage(err) }, { status: 502 });
  }
}
