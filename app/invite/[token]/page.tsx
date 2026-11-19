import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verify } from "@/actions/sessions";
import { getWorkspaceByInviteToken } from "@/data/workspace";
import { joinWorkspace } from "@/actions/workspaces";
import { AUTH_ROUTES, WORKSPACE_ROUTES } from "@/constants/routes";
import InvalidInviteLinkView from "@/components/InvalidInviteLinkView";

// proxy.ts가 /invite/*는 로그인 여부와 무관하게 그대로 통과시켜요 — 토큰이
// 유효한지부터 확인한 뒤에만 로그인을 요구해야, 죽은 링크를 위해 가입까지
// 시키고 나서 실패하는 최악의 경험을 피할 수 있습니다.
//
// 검증 순서: 토큰 조회 → 없음 → 무효 링크 화면
//           → 있음 + 비로그인 → /login?from=/invite/[token]
//           → 있음 + 로그인 → 멤버 등록(이미 멤버면 생략) → 워크스페이스로 이동
const InvitePage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  const targetWorkspace = await getWorkspaceByInviteToken(token);

  if (!targetWorkspace) {
    return <InvalidInviteLinkView />;
  }

  const cookie = (await cookies()).get("session")?.value;
  const session = await verify(cookie);

  if (!session) {
    redirect(
      `${AUTH_ROUTES.LOGIN}?from=${encodeURIComponent(`/invite/${token}`)}`,
    );
  }

  await joinWorkspace(targetWorkspace.id);

  redirect(WORKSPACE_ROUTES.NEW(targetWorkspace.id));
};

export default InvitePage;
