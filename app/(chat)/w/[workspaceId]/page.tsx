import { redirect } from "next/navigation";
import Chat from "@/components/chat/Chat";
import { getWorkspaceMembership } from "@/data/workspace";
import { NOT_FOUND_URL } from "@/constants/routes";

const WorkspaceNewConversationPage = async ({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) => {
  const { workspaceId } = await params;

  const membership = await getWorkspaceMembership(workspaceId);

  // (chat) 레이아웃 안에서 notFound()를 쓰면 사이드바까지 같이 렌더돼서,
  // 사이드바 없는 404 화면을 보여주기 위해 바깥 경로로 보냅니다.
  if (!membership) {
    redirect(NOT_FOUND_URL);
  }

  return (
    <Chat workspaceId={workspaceId} workspaceName={membership.workspace.name} />
  );
};

export default WorkspaceNewConversationPage;
