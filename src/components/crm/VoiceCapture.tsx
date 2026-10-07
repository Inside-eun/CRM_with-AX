"use client";

import { useRef } from "react";
import { CrmButton } from "@/design-system";
import type { useVoiceClassify } from "@/lib/useVoiceClassify";

type Voice = ReturnType<typeof useVoiceClassify>;

/** 녹음 시작/중지 + 오디오 파일 업로드 버튼 */
export function VoiceCaptureButtons({
  voice,
  size = "md",
  recordLabel = "녹음 시작",
}: {
  voice: Voice;
  size?: "xs" | "sm" | "md";
  recordLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = voice.status === "uploading";
  return (
    <span className="inline-flex items-center gap-2">
      {voice.status === "recording" ? (
        <CrmButton variant="danger" size={size} icon="Square" onClick={voice.stopRecording}>
          녹음 중지
        </CrmButton>
      ) : (
        <CrmButton variant="secondary" size={size} icon="Mic" disabled={busy} onClick={voice.startRecording}>
          {recordLabel}
        </CrmButton>
      )}
      <CrmButton
        variant="secondary"
        size={size}
        icon="Upload"
        disabled={busy || voice.status === "recording"}
        onClick={() => fileRef.current?.click()}
      >
        오디오 파일 업로드
      </CrmButton>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={async (e) => {
          // 전송이 끝난 뒤에 input을 비웁니다. 먼저 비우면 파일 바이트를
          // 읽기 전에 참조가 끊겨 빈 본문이 올라갈 수 있습니다.
          const input = e.target as HTMLInputElement;
          const file = input.files?.[0];
          if (file) await voice.submitFile(file);
          input.value = "";
        }}
      />
    </span>
  );
}

/** 입력 레벨이 이 아래로만 머물면 무음으로 간주해 경고합니다. */
const QUIET_LEVEL = 0.01;

export function RecordingIndicator({ level }: { level?: number }) {
  // 레벨을 넘겨받은 경우에만 미터를 보여 줍니다.
  const hasMeter = typeof level === "number";
  const filled = hasMeter ? Math.min(100, Math.round(level * 400)) : 0;

  return (
    <span className="inline-flex flex-col gap-1.5 text-[13px] font-semibold text-error-700">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-current" style={{ animation: "crm-pulse 1.4s infinite" }} />
        녹음 중입니다. 고객 음성이 끝나면 녹음 중지를 누르세요.
      </span>
      {hasMeter && (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200"
            role="meter"
            aria-label="마이크 입력 레벨"
            aria-valuenow={filled}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full rounded-full bg-current transition-[width] duration-100"
              style={{ width: `${filled}%` }}
            />
          </span>
          <span className="text-[12px] font-normal text-gray-600">
            {level < QUIET_LEVEL ? "소리가 감지되지 않습니다 — 입력 장치를 확인하세요" : "입력 감지 중"}
          </span>
        </span>
      )}
    </span>
  );
}
