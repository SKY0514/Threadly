import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getWorkspaceMembership } from "@/data/workspace";
import {
  getWorkspaceStats,
  getWorkspaceStatsRange,
  WorkspaceStatsPeriod,
} from "@/data/workspaceStats";
import WorkspaceStatsView from "@/components/chat/WorkspaceStatsView";
import { NOT_FOUND_URL, WORKSPACE_ROUTES } from "@/constants/routes";

const STATS_PERIODS: WorkspaceStatsPeriod[] = ["today", "7d", "30d", "month"];

const WorkspaceStatsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ range?: string }>;
}) => {
  const { workspaceId } = await params;
  const { range } = await searchParams;

  const membership = await getWorkspaceMembership(workspaceId);

  // 아예 멤버가 아니면 이 워크스페이스 자체에 접근 권한이 없는 거라 404로.
  // (chat) 레이아웃 안에서 notFound()를 쓰면 사이드바까지 같이 렌더돼서,
  // 사이드바 없는 404 화면을 보여주기 위해 바깥 경로로 보냅니다.
  if (!membership) {
    redirect(NOT_FOUND_URL);
  }

  // 멤버여도 오너가 아니면 통계 화면은 못 봐요 — 사이드바에서 아이콘을
  // 숨기는 건 보기 좋으라는 것일 뿐, URL로 직접 들어오는 걸 막는 실제
  // 권한 검증은 항상 여기, 서버에서 해야 합니다.
  if (membership.role !== "owner") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#f1f5f9]">
          <Lock className="size-5 text-[#64748b]" />
        </div>
        <h1 className="text-base font-semibold text-[#0f172a]">
          오너만 볼 수 있는 화면이에요
        </h1>
        <p className="max-w-sm text-sm text-[#64748b]">
          사용량 대시보드는 워크스페이스 오너만 확인할 수 있어요.
        </p>
        <Link
          href={WORKSPACE_ROUTES.NEW(workspaceId)}
          className="mt-2 rounded-xl bg-[#6366f1] px-4 py-2 text-sm text-white hover:bg-[#4f46e5]"
        >
          워크스페이스로 이동
        </Link>
      </div>
    );
  }

  const period: WorkspaceStatsPeriod = STATS_PERIODS.includes(
    range as WorkspaceStatsPeriod,
  )
    ? (range as WorkspaceStatsPeriod)
    : "7d";

  const stats = await getWorkspaceStats(
    workspaceId,
    getWorkspaceStatsRange(period),
  );

  return (
    <WorkspaceStatsView
      workspaceId={workspaceId}
      workspaceName={membership.workspace.name}
      period={period}
      stats={stats}
    />
  );
};

export default WorkspaceStatsPage;
