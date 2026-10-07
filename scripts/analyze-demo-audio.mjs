// 데모 음성 3개를 로컬 개발 서버의 /api/classify로 한 번 분석해 src/lib/crm/demo-results.json에 저장합니다.
// 앱은 이 저장 결과만 불러오므로 방문자가 분석해도 음성 인식 크레딧을 쓰지 않습니다.
//
// 사용법 (npm run dev 실행 중):
//   node scripts/analyze-demo-audio.mjs            # 아직 결과가 없는 음성만 분석
//   node scripts/analyze-demo-audio.mjs --force    # 전부 다시 분석 (파일을 바꾼 경우)
//   node scripts/analyze-demo-audio.mjs exchange   # 특정 시나리오만 (--force와 함께 쓰면 다시 분석)
//   BASE_URL=http://localhost:3001 node scripts/analyze-demo-audio.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const resultsPath = join(root, "src/lib/crm/demo-results.json");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

// 시나리오 설정(id·audioSrc·recording)은 demo-scenarios.ts 한 곳에서만 관리합니다.
const source = readFileSync(join(root, "src/lib/crm/demo-scenarios.ts"), "utf8");
const scenarios = [...source.matchAll(/id: "([^"]+)",[\s\S]*?audioSrc: "([^"]+)",\s*recording: "([^"]+)"/g)].map(
  ([, id, audioSrc, recording]) => ({ id, audioSrc, recording }),
);
if (scenarios.length === 0) throw new Error("demo-scenarios.ts에서 시나리오를 찾지 못했습니다.");

const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

for (const sc of scenarios) {
  if (only.length && !only.includes(sc.id)) continue;
  if (results[sc.id] && !force) {
    console.log(`- ${sc.id}: 저장된 결과가 있어 건너뜁니다 (--force로 다시 분석)`);
    continue;
  }
  const file = join(root, "public", sc.audioSrc);
  if (!existsSync(file)) {
    console.log(`- ${sc.id}: 파일이 없습니다 (${sc.audioSrc})`);
    continue;
  }
  const form = new FormData();
  form.append("audio", new Blob([readFileSync(file)], { type: "audio/mp4" }), basename(file));
  form.append("recording", sc.recording);
  const res = await fetch(`${baseUrl}/api/classify`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    console.log(`- ${sc.id}: 분석 실패 (${res.status}) ${data.error ?? ""}`);
    continue;
  }
  results[sc.id] = { analyzedAt: new Date().toISOString(), audioSrc: sc.audioSrc, recording: sc.recording, result: data };
  console.log(`- ${sc.id}: ${data.categoryLabel} ${Math.round(data.confidence * 100)}% · ${data.keyRequest}`);
  writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
}
