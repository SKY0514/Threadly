import db from "@/db";
import { sql } from "drizzle-orm";

export type WorkspaceStatsPeriod = "today" | "7d" | "30d" | "month";

export type WorkspaceStatsRange = {
  from: Date;
  to: Date;
};

export type WorkspaceDailyUsage = {
  // yyyy-mm-dd (UTC 기준)
  date: string;
  // AI_MODEL의 value별 그날 assistant 응답 수
  counts: Record<string, number>;
};

export type WorkspaceMemberUsage = {
  // 계정이 삭제된 경우 null — 화면에는 "탈퇴한 멤버"로 표시합니다.
  userId: string | null;
  name: string;
  requestCount: number;
  totalTokens: number;
};

export type WorkspaceStats = {
  totalRequests: number;
  totalTokens: number;
  activeMemberCount: number;
  totalMemberCount: number;
  dailyUsage: WorkspaceDailyUsage[];
  memberUsage: WorkspaceMemberUsage[];
  peakDailyRequests: number;
  averageDailyRequests: number;
  // 선택한 기간과 무관하게, 이 워크스페이스에 한 번이라도 대화 기록이
  // 있었는지 — "아직 사용 기록이 없어요"(워크스페이스 자체가 새것)와
  // "이 기간에는 사용 기록이 없어요"(기간만 비어있음)를 구분하는 데 씁니다.
  hasEverHadUsage: boolean;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

// 선택한 기간(오늘/최근 7일/최근 30일/이번 달)의 시작~끝 Date를 만듭니다.
// 날짜 경계는 UTC 기준입니다 — 서버에 저장된 timestamp도 UTC라 비교가 어긋나지 않아요.
export const getWorkspaceStatsRange = (
  period: WorkspaceStatsPeriod,
): WorkspaceStatsRange => {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = new Date(todayStart);
  to.setUTCDate(to.getUTCDate() + 1);
  to.setUTCMilliseconds(to.getUTCMilliseconds() - 1);

  if (period === "month") {
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    return { from, to };
  }

  const daysBack = period === "7d" ? 6 : period === "30d" ? 29 : 0;
  const from = new Date(todayStart);
  from.setUTCDate(from.getUTCDate() - daysBack);

  return { from, to };
};

// 범위 안의 날짜를 전부(사용 기록이 없는 날도) 순서대로 나열 — 차트 x축이
// 빈 날짜 없이 쭉 이어지게 하기 위해서예요.
const buildDateKeys = (range: WorkspaceStatsRange) => {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(
      range.from.getUTCFullYear(),
      range.from.getUTCMonth(),
      range.from.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), range.to.getUTCDate()),
  );

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
};

export const getWorkspaceStats = async (
  workspaceId: string,
  range: WorkspaceStatsRange,
): Promise<WorkspaceStats> => {
  const { rows: totalMembersRows } = await db.execute<{ count: string }>(sql`
    SELECT count(*) as count
    FROM "workspace_member"
    WHERE "workspaceId" = ${workspaceId}
  `);

  const { rows: everUsedRows } = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS(
      SELECT 1 FROM "usage_log" WHERE "workspaceId" = ${workspaceId}
    ) AS exists
  `);
  const [totalMembers] = totalMembersRows;

  const { rows: requestTotalsRows } = await db.execute<{
    total_requests: string;
    total_tokens: string | null;
    active_members: string;
  }>(sql`
    SELECT
      count(*) AS total_requests,
      COALESCE(sum(tokens), 0) AS total_tokens,
      count(DISTINCT "userId") AS active_members
    FROM "usage_log"
    WHERE "workspaceId" = ${workspaceId}
      AND created_at >= ${range.from}
      AND created_at <= ${range.to}
  `);
  const [requestTotals] = requestTotalsRows;

  const { rows: dailyRows } = await db.execute<{
    day: string;
    model: string;
    count: string;
  }>(sql`
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
      model,
      count(*) AS count
    FROM "usage_log"
    WHERE "workspaceId" = ${workspaceId}
      AND created_at >= ${range.from}
      AND created_at <= ${range.to}
    GROUP BY day, model
    ORDER BY day ASC
  `);

  // 멤버별 사용량 — usage_log에 요청 시점의 작성자(userId)가 그대로 찍혀
  // 있어서 바로 집계하면 됩니다. user와는 LEFT JOIN을 써서, 계정이 지워져
  // userId가 null이 된 로그도(onDelete: set null) "탈퇴한 멤버"로 묶여
  // 계속 보이게 합니다 — INNER JOIN이었다면 그 행 자체가 사라졌을 거예요.
  // 지금은 멤버가 아니게 된(워크스페이스에서 내보내진) 사람의 과거 로그도
  // workspace_member와는 전혀 안 엮여있어서 그대로 남습니다.
  const { rows: memberRows } = await db.execute<{
    user_id: string | null;
    name: string;
    request_count: string;
    total_tokens: string | null;
  }>(sql`
    SELECT
      u.id AS user_id,
      COALESCE(u.name, '탈퇴한 멤버') AS name,
      count(*) AS request_count,
      COALESCE(sum(ul.tokens), 0) AS total_tokens
    FROM "usage_log" ul
    LEFT JOIN "user" u ON u.id = ul."userId"
    WHERE ul."workspaceId" = ${workspaceId}
      AND ul.created_at >= ${range.from}
      AND ul.created_at <= ${range.to}
    GROUP BY u.id, u.name
    ORDER BY request_count DESC
  `);

  const dateKeys = buildDateKeys(range);
  const dailyUsageByDate = new Map<string, Record<string, number>>(
    dateKeys.map((key) => [key, {}]),
  );

  for (const row of dailyRows) {
    const key = row.day;
    const model = row.model ?? "unknown";
    const bucket = dailyUsageByDate.get(key);
    if (!bucket) continue;
    bucket[model] = Number(row.count);
  }

  const dailyUsage: WorkspaceDailyUsage[] = dateKeys.map((date) => ({
    date,
    counts: dailyUsageByDate.get(date) ?? {},
  }));

  const dailyTotals = dailyUsage.map((day) =>
    Object.values(day.counts).reduce((sum, count) => sum + count, 0),
  );
  const peakDailyRequests = dailyTotals.length
    ? Math.max(...dailyTotals)
    : 0;
  const averageDailyRequests = dailyTotals.length
    ? Math.round(
        dailyTotals.reduce((sum, count) => sum + count, 0) /
          dailyTotals.length,
      )
    : 0;

  return {
    totalRequests: Number(requestTotals?.total_requests ?? 0),
    totalTokens: Number(requestTotals?.total_tokens ?? 0),
    activeMemberCount: Number(requestTotals?.active_members ?? 0),
    totalMemberCount: Number(totalMembers?.count ?? 0),
    dailyUsage,
    memberUsage: memberRows.map((row) => ({
      userId: row.user_id,
      name: row.name,
      requestCount: Number(row.request_count),
      totalTokens: Number(row.total_tokens ?? 0),
    })),
    peakDailyRequests,
    averageDailyRequests,
    hasEverHadUsage: everUsedRows[0]?.exists ?? false,
  };
};
