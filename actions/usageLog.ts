"use server";

import { verifySession } from "./sessions";
import { workspaceUsageLog } from "@/db/schema";
import db from "@/db";

// AI 응답이 끝날 때마다(정상 응답/이어서 받기/재생성 전부 포함) 한 행씩
// 기록합니다. conversation/message와 FK로 엮지 않아요 — 대화방이나 메시지가
// 지워져도 "이미 쓴 토큰" 기록은 그대로 남아야 하기 때문입니다(워크스페이스
// 사용량 대시보드의 집계 기준). 작성자(누가 이 응답을 받았는지)는 클라이언트
// 값이 아니라 항상 세션에서 직접 구합니다.
export const logWorkspaceUsage = async (
  workspaceId: string,
  model: string,
  tokens: number,
) => {
  const session = await verifySession();

  await db.insert(workspaceUsageLog).values({
    workspaceId,
    userId: session.id,
    model,
    tokens,
  });
};
