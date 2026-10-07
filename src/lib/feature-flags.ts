/**
 * 음성 분석 API(/api/classify)와 음성 분류 단독 도구(/classifier) 사용 여부.
 * 공개 배포(production 빌드)에서는 음성 인식 크레딧을 지키기 위해 기본으로 끕니다.
 * 로컬 개발(npm run dev)에서는 켜져 있어 scripts/analyze-demo-audio.mjs로 데모 음성을 분석할 수 있습니다.
 * 배포에서도 켜려면 ENABLE_VOICE_CLASSIFY=true 를 설정하세요.
 */
export function voiceClassifyEnabled(): boolean {
  return process.env.ENABLE_VOICE_CLASSIFY === "true" || process.env.NODE_ENV !== "production";
}
