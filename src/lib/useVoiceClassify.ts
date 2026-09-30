"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryId } from "@/lib/categories";

// /api/classify 응답. keyRequest·details는 나중에 추가된 필드라 선택 값으로 둡니다.
export type ClassifyResult = {
  transcript: string;
  category: CategoryId;
  categoryLabel: string;
  confidence: number;
  reason: string;
  keyRequest?: string;
  details?: string[];
};

export type VoiceStatus = "idle" | "recording" | "uploading" | "done" | "error";

type Options = {
  onResult?: (result: ClassifyResult) => void;
  onError?: (message: string) => void;
  onStart?: () => void;
};

// 음성 녹음·업로드 → /api/classify (Whisper 변환 + 문의 분류) 호출
export function useVoiceClassify({ onResult, onError, onStart }: Options = {}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const callbacksRef = useRef({ onResult, onError, onStart });
  useEffect(() => {
    callbacksRef.current = { onResult, onError, onStart };
  });

  const replaceAudioUrl = useCallback((blob: Blob) => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }, []);

  useEffect(
    () => () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus("error");
    callbacksRef.current.onError?.(message);
  }, []);

  const submitAudio = useCallback(
    async (blob: Blob) => {
      setStatus("uploading");
      callbacksRef.current.onStart?.();
      try {
        const formData = new FormData();
        const filename = blob instanceof File ? blob.name : "recording.webm";
        formData.append("audio", blob, filename);

        const res = await fetch("/api/classify", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "요청 처리 중 오류가 발생했습니다.");
        }

        setResult(data as ClassifyResult);
        setStatus("done");
        callbacksRef.current.onResult?.(data as ClassifyResult);
      } catch (err) {
        fail(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      }
    },
    [fail],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        replaceAudioUrl(blob);
        void submitAudio(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus("recording");
    } catch {
      fail("마이크 접근 권한이 필요합니다.");
    }
  }, [fail, replaceAudioUrl, submitAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const submitFile = useCallback(
    (file: File) => {
      setError(null);
      setResult(null);
      replaceAudioUrl(file);
      void submitAudio(file);
    },
    [replaceAudioUrl, submitAudio],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, audioUrl, startRecording, stopRecording, submitFile, reset };
}
