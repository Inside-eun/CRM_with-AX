import { notFound } from "next/navigation";
import { voiceClassifyEnabled } from "@/lib/feature-flags";
import { ClassifierTool } from "./ClassifierTool";

// 공개 배포에서는 음성 분석 API를 끄므로 단독 도구도 보이지 않게 합니다.
export default function ClassifierPage() {
  if (!voiceClassifyEnabled()) notFound();
  return <ClassifierTool />;
}
