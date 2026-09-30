"use client";

import Link from "next/link";
import { useRef } from "react";
import { CATEGORIES } from "@/lib/categories";
import { useVoiceClassify } from "@/lib/useVoiceClassify";

export default function ClassifierPage() {
  const { status, result, error, audioUrl, startRecording, stopRecording, submitFile } =
    useVoiceClassify();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    submitFile(file);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400">
            ← 상담 화면으로
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            고객 음성 요청 분류기
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            음성 메시지를 녹음하거나 업로드하면 텍스트로 변환한 뒤, 어떤 종류의 고객 요청인지
            자동으로 분류합니다.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center gap-3">
            {status !== "recording" ? (
              <button
                onClick={startRecording}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                녹음 시작
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 animate-pulse"
              >
                녹음 중지
              </button>
            )}

            <span className="text-sm text-zinc-400">또는</span>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              오디오 파일 업로드
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full">
              <track kind="captions" />
            </audio>
          )}

          {status === "uploading" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              음성 인식 및 분류 중입니다...
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </section>

        {result && (
          <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                인식된 텍스트
              </h2>
              <p className="mt-1 text-zinc-800 dark:text-zinc-200">{result.transcript}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900">
                {result.categoryLabel}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                확신도 {Math.round(result.confidence * 100)}%
              </span>
            </div>

            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                분류 이유
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{result.reason}</p>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            분류 카테고리
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                {c.label}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
