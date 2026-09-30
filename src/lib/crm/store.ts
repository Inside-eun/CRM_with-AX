"use client";

// 상담 데이터 저장소. 백엔드가 없어 브라우저 localStorage에 보관합니다.
// 서버 렌더링 중에는 null을 돌려주고, 클라이언트에서 처음 읽을 때 저장본 또는 목 데이터를 불러옵니다.
import { useSyncExternalStore } from "react";
import { STATE_VERSION, createSeed } from "./mock-data";
import type { CrmState } from "./types";

const STORAGE_KEY = "ax-crm-demo";

let current: CrmState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CrmState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrmState;
    return parsed.version === STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function persist(state: CrmState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 공간이 없거나 차단된 경우에도 현재 탭에서는 계속 동작합니다.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): CrmState | null {
  if (!loaded) {
    loaded = true;
    current = readStorage();
    if (!current) {
      current = createSeed();
      persist(current);
    }
  }
  return current;
}

function getServerSnapshot(): CrmState | null {
  return null;
}

// 다른 탭(예: 새 탭으로 연 지식·매뉴얼)에서 바뀐 내용을 반영합니다.
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  const next = readStorage();
  if (next) {
    current = next;
    emit();
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useCrm(): CrmState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateCrm(fn: (state: CrmState) => CrmState) {
  const prev = getSnapshot();
  if (!prev) return;
  current = fn(prev);
  persist(current);
  emit();
}

export function readCrm(): CrmState | null {
  return getSnapshot();
}

export function resetCrm() {
  current = createSeed();
  persist(current);
  emit();
}
