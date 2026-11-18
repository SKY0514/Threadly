"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  Users,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import type { WorkspaceStats, WorkspaceStatsPeriod } from "@/data/workspaceStats";
import { AI_MODEL, WORKSPACE_STATS_MODEL_COLORS } from "@/constants/chat";
import { WORKSPACE_ROUTES } from "@/constants/routes";
import { formatCompactNumber } from "@/utils";

type Props = {
  workspaceId: string;
  workspaceName: string;
  period: WorkspaceStatsPeriod;
  stats: WorkspaceStats;
};

const PERIOD_LABEL: Record<WorkspaceStatsPeriod, string> = {
  today: "오늘",
  "7d": "최근 7일",
  "30d": "최근 30일",
  month: "이번 달",
};

// 순위(사용량 많은 순)별로 돌려쓰는 팔레트 — 특정 멤버 고유색이 아니라
// "이번 기간에 몇 번째로 많이 썼는지"를 색 농도로 보여주는 용도입니다.
const MEMBER_BAR_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];
const MEMBER_AVATAR_PALETTE = [
  { bg: "#e0e7ff", text: "#4338ca" },
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#ccfbf1", text: "#0f766e" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#e2e8f0", text: "#334155" },
];

const ChartTooltipContent = ({ active, payload }: TooltipContentProps) => {
  if (!active || !payload?.length) return null;

  const date = (payload[0]?.payload as { date?: string } | undefined)?.date;
  const entries = payload.filter((entry) => Number(entry.value ?? 0) > 0);

  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs shadow-md">
      {date && <p className="mb-1.5 font-semibold text-[#0f172a]">{date}</p>}
      {entries.length === 0 ? (
        <p className="text-[#94a3b8]">요청 없음</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div key={String(entry.dataKey)} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#475569]">
                {entry.name}: {Number(entry.value).toLocaleString()}건
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyCardState = ({
  icon,
  iconBg,
  message,
}: {
  icon: React.ReactNode;
  iconBg: string;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-1 py-20">
    <div
      className="mb-3 flex size-12 items-center justify-center rounded-2xl"
      style={{ backgroundColor: iconBg }}
    >
      {icon}
    </div>
    <p className="text-base font-semibold text-[#0f172a]">{message}</p>
    <p className="text-sm text-[#94a3b8]">팀 대화에서 질문하면 여기에 집계돼요</p>
  </div>
);

const WorkspaceStatsView = ({
  workspaceId,
  workspaceName,
  period,
  stats,
}: Props) => {
  const router = useRouter();

  const emptyMessage = stats.hasEverHadUsage
    ? "이 기간에는 사용 기록이 없어요"
    : "아직 사용 기록이 없어요";

  const hasRequestData = stats.totalRequests > 0;
  const hasMemberData = stats.memberUsage.length > 0;

  const maxDailyTotal = useMemo(() => {
    return stats.dailyUsage.reduce((max, day) => {
      const total = Object.values(day.counts).reduce((sum, c) => sum + c, 0);
      return Math.max(max, total);
    }, 0);
  }, [stats]);

  // 차트 y축 눈금 — 최대값을 기준으로 적당히 둥근 간격 4개를 만듭니다.
  const yAxisTicks = useMemo(() => {
    if (maxDailyTotal === 0) return [0];
    const rawStep = maxDailyTotal / 3;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    return [0, step, step * 2, step * 3];
  }, [maxDailyTotal]);
  const chartMax = yAxisTicks[yAxisTicks.length - 1] || 1;

  // 날짜가 많을 땐 x축 라벨을 다 보여주면 겹치니, 적당히 솎아냅니다.
  // recharts의 interval은 "건너뛸 눈금 개수"라 라벨 간격(N개마다 하나)에서 1을 뺍니다.
  const dayCount = stats.dailyUsage.length;
  const labelInterval = Math.max(0, Math.ceil(dayCount / 7) - 1);

  // recharts용 데이터 — 모델 value를 그대로 키로 써서 Bar의 dataKey와 맞춥니다.
  const chartData = useMemo(
    () =>
      stats.dailyUsage.map((day) => ({
        date: day.date,
        day: Number(day.date.slice(8, 10)),
        ...Object.fromEntries(
          AI_MODEL.map((model) => [model.value, day.counts[model.value] ?? 0]),
        ),
      })),
    [stats],
  );

  const maxMemberRequests = stats.memberUsage[0]?.requestCount ?? 0;

  const buildPeriodHref = (value: WorkspaceStatsPeriod) =>
    `${WORKSPACE_ROUTES.STATS(workspaceId)}?range=${value}`;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-10">
        {/* 상단 브레드크럼 + 기간 선택 */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-[#64748b]">워크스페이스</span>
            <ChevronRight className="size-3.5 text-[#64748b]" />
            <Link
              href={WORKSPACE_ROUTES.NEW(workspaceId)}
              className="text-[#64748b] hover:text-[#0f172a]"
            >
              {workspaceName}
            </Link>
            <ChevronRight className="size-3.5 text-[#64748b]" />
            <span className="font-semibold text-[#4f46e5]">
              사용량 대시보드
            </span>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl border border-[#e2e8f0]/90 bg-white px-4 py-2 text-sm font-medium text-[#334155] outline-none hover:bg-[#f8fafc]">
              <Calendar className="size-4" />
              {PERIOD_LABEL[period]}
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["today", "7d", "30d", "month"] as const).map((value) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => router.push(buildPeriodHref(value))}
                >
                  {PERIOD_LABEL[value]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* KPI 카드 3개 — 퍼센트/증감률 없이 숫자만 보여줍니다 */}
        <div className="flex items-stretch justify-center gap-5">
          <div className="flex h-[124px] flex-1 flex-col justify-between rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#64748b]">
                전체 요청 수
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#eef2ff]">
                <Zap className="size-4 text-[#6366f1]" />
              </div>
            </div>
            <p className="text-[30px] font-bold tracking-tight text-[#0f172a]">
              {stats.totalRequests.toLocaleString()}
              <span className="ml-1.5 text-sm font-normal text-[#64748b]">
                건
              </span>
            </p>
          </div>

          <div className="flex h-[124px] flex-1 flex-col justify-between rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#64748b]">
                전체 토큰 사용량
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#ecfdf5]">
                <BarChart3 className="size-4 text-[#10b981]" />
              </div>
            </div>
            <p className="text-[30px] font-bold tracking-tight text-[#0f172a]">
              {formatCompactNumber(stats.totalTokens)}
              <span className="ml-1.5 text-sm font-normal text-[#64748b]">
                토큰
              </span>
            </p>
          </div>

          <div className="flex h-[124px] flex-1 flex-col justify-between rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#64748b]">
                참여 멤버
              </span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#eef2ff]">
                <Users className="size-4 text-[#6366f1]" />
              </div>
            </div>
            <p className="text-[30px] font-bold tracking-tight text-[#0f172a]">
              {stats.activeMemberCount} / {stats.totalMemberCount}명
            </p>
          </div>
        </div>

        {/* 차트 + 멤버별 사용량 */}
        <div className="grid grid-cols-12 gap-5">
          {/* 일별 요청 추이 (누적 막대) */}
          <div className="col-span-7 flex flex-col rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#f8fafc] pb-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0f172a]">
                  일별 요청 추이
                </h3>
                <p className="truncate text-xs text-[#94a3b8]">일별 요청 수</p>
              </div>
              {hasRequestData && (
                <div className="flex shrink-0 items-center gap-3">
                  {AI_MODEL.map((model) => (
                    <div
                      key={model.value}
                      className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[#475569]"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            WORKSPACE_STATS_MODEL_COLORS[model.value],
                        }}
                      />
                      {model.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!hasRequestData ? (
              <EmptyCardState
                icon={<BarChart3 className="size-6 text-[#6366f1]" />}
                iconBg="#eef2ff"
                message={emptyMessage}
              />
            ) : (
              <>
                <div className="h-[208px] pt-6 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -16 }}>
                      <CartesianGrid
                        vertical={false}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(value) => `${value}일`}
                        interval={labelInterval}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        ticks={yAxisTicks}
                        domain={[0, chartMax]}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <Tooltip
                        content={ChartTooltipContent}
                        cursor={{ fill: "#f1f5f9" }}
                      />
                      {AI_MODEL.map((model, index) => (
                        <Bar
                          key={model.value}
                          dataKey={model.value}
                          name={model.label}
                          stackId="requests"
                          fill={WORKSPACE_STATS_MODEL_COLORS[model.value]}
                          radius={
                            index === AI_MODEL.length - 1 ? [2, 2, 0, 0] : 0
                          }
                          maxBarSize={12}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 border-t border-[#f8fafc] pt-4 text-xs font-medium text-[#64748b]">
                  최고 일간 요청 {stats.peakDailyRequests.toLocaleString()}건 · 일
                  평균 {stats.averageDailyRequests.toLocaleString()}건
                </div>
              </>
            )}
          </div>

          {/* 멤버별 사용량 */}
          <div className="col-span-5 flex flex-col rounded-2xl border border-[#f1f5f9] bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(241,245,249,0.5)]">
            <div className="border-b border-[#f8fafc] pb-5">
              <h3 className="text-base font-semibold text-[#0f172a]">
                멤버별 사용량
              </h3>
              <p className="text-xs text-[#94a3b8]">
                팀원별 누적 쿼리 및 소모 토큰 기여도
              </p>
            </div>

            {!hasMemberData ? (
              <EmptyCardState
                icon={<Users className="size-6 text-[#64748b]" />}
                iconBg="#f8fafc"
                message={emptyMessage}
              />
            ) : (
              <>
                <div className="flex flex-col gap-4 py-4">
                  {stats.memberUsage.map((member, index) => (
                    <div
                      key={member.userId ?? `deleted-${index}`}
                      className="flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar
                            size="sm"
                            style={{
                              backgroundColor:
                                MEMBER_AVATAR_PALETTE[
                                  index % MEMBER_AVATAR_PALETTE.length
                                ].bg,
                            }}
                          >
                            <AvatarFallback
                              className="bg-inherit text-xs"
                              style={{
                                color:
                                  MEMBER_AVATAR_PALETTE[
                                    index % MEMBER_AVATAR_PALETTE.length
                                  ].text,
                              }}
                            >
                              {member.name.slice(-2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-[#1e293b]">
                            {member.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-medium text-[#0f172a]">
                            {member.requestCount.toLocaleString()}건
                          </span>
                          <span className="text-[#94a3b8]">·</span>
                          <span className="text-[#64748b]">
                            {formatCompactNumber(member.totalTokens)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${
                              maxMemberRequests
                                ? (member.requestCount / maxMemberRequests) * 100
                                : 0
                            }%`,
                            backgroundColor:
                              MEMBER_BAR_COLORS[
                                index % MEMBER_BAR_COLORS.length
                              ],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceStatsView;
