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

/** 이보다 짧은 녹음은 Whisper에 보내지 않습니다. */
const MIN_RECORDING_MS = 500;

/**
 * 녹음 내내 입력 피크가 이 값을 넘지 않으면 무음으로 봅니다.
 * 사람 목소리는 0.05를 쉽게 넘고, 가상 오디오 장치나 꺼진 마이크는 0에 가깝습니다.
 */
const SILENCE_PEAK_THRESHOLD = 0.01;

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
  const startedAtRef = useRef(0);
  // 녹음 중 관측한 입력 피크. 무음 마이크를 걸러내는 데 씁니다.
  const peakRef = useRef(0);
  const meterRef = useRef<{ ctx: AudioContext; timer: number } | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
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

  const stopMeter = useCallback(() => {
    const meter = meterRef.current;
    if (!meter) return;
    meterRef.current = null;
    window.clearInterval(meter.timer);
    void meter.ctx.close().catch(() => {});
    setInputLevel(0);
  }, []);

  /** 입력 레벨을 주기적으로 읽어 피크를 기록합니다. */
  const startMeter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) {
        const magnitude = Math.abs(sample);
        if (magnitude > peak) peak = magnitude;
      }
      if (peak > peakRef.current) peakRef.current = peak;
      setInputLevel(peak);
    }, 100);

    meterRef.current = { ctx, timer };
  }, []);

  useEffect(
    () => () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      stopMeter();
    },
    [stopMeter],
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
        const elapsed = Date.now() - startedAtRef.current;
        const peak = peakRef.current;
        stopMeter();
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        replaceAudioUrl(blob);

        if (elapsed < MIN_RECORDING_MS) {
          fail("녹음이 너무 짧습니다. 버튼을 누른 뒤 말이 끝나고 중지해 주세요.");
          return;
        }

        // 무음을 보내면 Whisper가 없는 말을 만들어내 가짜 접수가 생깁니다.
        if (peak < SILENCE_PEAK_THRESHOLD) {
          fail(
            "마이크에서 소리가 감지되지 않았습니다. 브라우저의 입력 장치가 실제 마이크인지, 마이크 권한이 켜져 있는지 확인해 주세요.",
          );
          return;
        }

        void submitAudio(blob);
      };

      startedAtRef.current = Date.now();
      peakRef.current = 0;
      startMeter(stream);
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus("recording");
    } catch {
      fail("마이크 접근 권한이 필요합니다.");
    }
  }, [fail, replaceAudioUrl, startMeter, stopMeter, submitAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // input이 리셋되기 전에 바이트를 메모리로 확보한 뒤 전송합니다.
  // File을 그대로 넘기면 fetch가 본문을 직렬화하는 시점에 backing store가
  // 끊겨 0바이트로 전송되는 경우가 있어 Whisper가 포맷 오류를 냅니다.
  const submitFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setStatus("uploading");

      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        fail("파일을 읽을 수 없습니다. 클라우드 드라이브에 있는 파일이면 먼저 내려받은 뒤 다시 올려주세요.");
        return;
      }

      if (buffer.byteLength === 0) {
        fail("오디오 파일이 비어 있습니다. 파일이 온전히 내려받아졌는지 확인한 뒤 다시 올려주세요.");
        return;
      }

      const snapshot = new File([buffer], file.name, {
        type: file.type || "application/octet-stream",
      });
      replaceAudioUrl(snapshot);
      await submitAudio(snapshot);
    },
    [fail, replaceAudioUrl, submitAudio],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    audioUrl,
    inputLevel,
    startRecording,
    stopRecording,
    submitFile,
    reset,
  };
}
