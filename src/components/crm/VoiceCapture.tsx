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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) voice.submitFile(file);
          e.target.value = "";
        }}
      />
    </span>
  );
}

export function RecordingIndicator() {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-error-700">
      <span className="h-2 w-2 rounded-full bg-current" style={{ animation: "crm-pulse 1.4s infinite" }} />
      녹음 중입니다. 고객 음성이 끝나면 녹음 중지를 누르세요.
    </span>
  );
}
