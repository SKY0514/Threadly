"use server";

import { randomBytes } from "crypto";
import { verifySession } from "./sessions";
import { workspace, workspaceMember } from "@/db/schema";
import db from "@/db";
import { getUserByEmail } from "@/data/user";
import { getWorkspaceMembership } from "@/data/workspace";
import { revalidatePath } from "next/cache";
import { BASE_URL, WORKSPACE_ROUTES } from "@/constants/routes";
import { eq, and } from "drizzle-orm";
import pusherServer from "@/lib/pusher";
import { PUSHER_EVENTS, workspaceChannel } from "@/constants/pusher";
import { notifyWorkspaceUpdated } from "./conversations";

// 초대 링크(/invite/[token])용 토큰. 링크 소지자는 누구나 합류할 수 있는
// 구조라 추측하기 어렵도록 128비트(22자, URL-safe) 랜덤 문자열을 씁니다.
const generateInviteToken = () => randomBytes(16).toString("base64url");

export const createWorkspace = async (name: string) => {
  const session = await verifySession();

  if (!name.trim()) {
    throw new Error("워크스페이스 이름을 입력해주세요.");
  }

  const [newWorkspace] = await db
    .insert(workspace)
    .values({ name: name.trim(), ownerId: session.id, inviteToken: generateInviteToken() })
    .returning();

  await db.insert(workspaceMember).values({
    workspaceId: newWorkspace.id,
    userId: session.id,
    role: "owner",
  });

  revalidatePath(BASE_URL);

  return newWorkspace;
};

export const renameWorkspace = async (workspaceId: string, name: string) => {
  const membership = await getWorkspaceMembership(workspaceId);

  if (!membership || membership.role !== "owner") {
    throw new Error("워크스페이스 오너만 이름을 변경할 수 있습니다.");
  }

  if (!name.trim()) {
    throw new Error("워크스페이스 이름을 입력해주세요.");
  }

  await db
    .update(workspace)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(workspace.id, workspaceId));

  revalidatePath(BASE_URL);

  // 이미 사이드바를 보고 있는 다른 멤버들에게 새로고침 없이 바뀐 이름을
  // 반영하기 위해, 대화방 생성/삭제와 같은 신호를 그대로 재사용합니다.
  await notifyWorkspaceUpdated(workspaceId);
};

// 오너만 워크스페이스를 삭제할 수 있습니다. 대화/메시지/코멘트/멤버/사용량
// 기록 등 하위 데이터는 전부 workspace_id FK의 cascade 삭제로 함께
// 지워집니다 — 따로 하나씩 지울 필요가 없습니다.
// socketId를 넘기면 삭제한 사람의 탭에는 이벤트를 다시 보내지 않아요 —
// 삭제한 사람은 이미 자기 액션의 성공 토스트를 보니, "워크스페이스가
// 삭제되었습니다" 알림까지 중복으로 뜰 필요가 없습니다.
export const deleteWorkspace = async (
  workspaceId: string,
  socketId?: string,
) => {
  const membership = await getWorkspaceMembership(workspaceId);

  if (!membership || membership.role !== "owner") {
    throw new Error("워크스페이스 오너만 삭제할 수 있습니다.");
  }

  await db.delete(workspace).where(eq(workspace.id, workspaceId));

  revalidatePath(BASE_URL);

  // 지금 이 워크스페이스 어딘가(대화/통계/설정)를 보고 있던 멤버를 포함해
  // 전원에게 쏩니다. 클라이언트는 이 신호로 router.refresh()만 하면 되고,
  // 마침 그 경로에 있었다면 각 페이지의 멤버십 검증이 알아서 밖으로
  // redirect() 시켜줍니다 — 따로 "강제 이동" 로직을 만들 필요가 없습니다.
  await pusherServer.trigger(
    workspaceChannel(workspaceId),
    PUSHER_EVENTS.WORKSPACE_DELETED,
    {},
    socketId ? { socket_id: socketId } : undefined,
  );
};

type AddMemberResult =
  | { status: "added"; member: { id: string; userId: string; name: string } }
  | { status: "already-member" }
  | { status: "pending" };

// 워크스페이스 생성 모달의 "추가" 버튼에서 호출합니다. 가입된 이메일이면
// 즉시 멤버로 등록(role: member 고정), 미가입 이메일이면 아무것도 저장하지
// 않고 "pending"만 돌려줍니다 — 그 경우 호출부가 초대 링크를 안내합니다.
export const addWorkspaceMemberByEmail = async (
  workspaceId: string,
  email: string,
): Promise<AddMemberResult> => {
  const membership = await getWorkspaceMembership(workspaceId);

  if (!membership || membership.role !== "owner") {
    throw new Error("워크스페이스 오너만 멤버를 추가할 수 있습니다.");
  }

  const invitedUser = await getUserByEmail(email);

  if (!invitedUser) {
    return { status: "pending" };
  }

  const existingMembership = await db.query.workspaceMember.findFirst({
    where: { workspaceId, userId: invitedUser.id },
  });

  if (existingMembership) {
    return { status: "already-member" };
  }

  // 위에서 이미 "있으면" 걸러냈지만, 동시에 두 번 눌렸을 가능성까지 막기
  // 위해 DB 유니크 제약(workspace_member_workspace_user_key)에 기대어
  // onConflictDoNothing으로도 한 번 더 막습니다 — 그 경우 insert 결과가
  // 비어있을 수 있어 아래에서 다시 조회합니다.
  const [newMember] = await db
    .insert(workspaceMember)
    .values({ workspaceId, userId: invitedUser.id, role: "member" })
    .onConflictDoNothing({
      target: [workspaceMember.workspaceId, workspaceMember.userId],
    })
    .returning();

  if (!newMember) {
    return { status: "already-member" };
  }

  revalidatePath(BASE_URL);

  return {
    status: "added",
    member: { id: newMember.id, userId: invitedUser.id, name: invitedUser.name },
  };
};

// 오너만 멤버를 제거할 수 있고, 오너 본인(role: owner)은 이 경로로 제거할 수
// 없습니다 — UI에서도 오너 칩엔 제거 버튼을 안 보여주지만, 서버에서도 막습니다.
export const removeWorkspaceMember = async (
  workspaceId: string,
  memberId: string,
) => {
  const membership = await getWorkspaceMembership(workspaceId);

  if (!membership || membership.role !== "owner") {
    throw new Error("워크스페이스 오너만 멤버를 제거할 수 있습니다.");
  }

  const target = await db.query.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });

  if (!target) return;

  if (target.role === "owner") {
    throw new Error("오너는 제거할 수 없습니다.");
  }

  await db
    .delete(workspaceMember)
    .where(and(eq(workspaceMember.id, memberId), eq(workspaceMember.workspaceId, workspaceId)));

  revalidatePath(BASE_URL);

  // 워크스페이스 채널은 멤버 전원이 구독 중이라, 추방된 사람의 userId를
  // payload로 실어 보내고 "나인지"는 받는 쪽(WorkspaceGroup.tsx)이 직접
  // 걸러내게 합니다 — 남은 멤버는 이 신호를 받아도 조용히 무시합니다.
  await pusherServer.trigger(
    workspaceChannel(workspaceId),
    PUSHER_EVENTS.MEMBER_REMOVED,
    { userId: target.userId },
  );

  // 남은 멤버가 그 워크스페이스 공유 대화 화면을 보고 있었다면, 거기 쓰이는
  // 멤버 아바타 스택(WorkspaceConversationHeader)도 react-query 캐시라
  // 같이 무효화해줘야 머릿수가 바로 줄어듭니다.
  await notifyWorkspaceUpdated(workspaceId);
};

// 워크스페이스 전용 헤더(WorkspaceConversationHeader)용 — 워크스페이스 이름과
// 멤버 목록(아바타 스택 표시용)을 함께 내려줍니다. 멤버가 아니면 null.
export const getWorkspaceHeaderInfo = async (workspaceId: string) => {
  const membership = await getWorkspaceMembership(workspaceId);
  if (!membership) return null;

  const members = await db.query.workspaceMember.findMany({
    where: { workspaceId },
    with: { user: true },
  });

  return {
    workspaceName: membership.workspace.name,
    members: members
      .filter((member) => member.user !== null)
      .map((member) => ({ userId: member.userId, name: member.user!.name })),
  };
};

// 초대 링크(/invite/[token]) 접속 시 호출합니다. 호출부(페이지)가 이미
// getWorkspaceByInviteToken으로 토큰 유효성을, 세션 유무까지 확인한
// 뒤에만 불러요 — 그래서 여기서는 workspaceId를 그대로 받아 멤버 등록만
// 합니다. 이미 멤버면 조용히 넘어갑니다.
export const joinWorkspace = async (workspaceId: string) => {
  const session = await verifySession();

  const membership = await db.query.workspaceMember.findFirst({
    where: { workspaceId, userId: session.id },
  });

  if (!membership) {
    // 동시에 같은 링크로 두 번 들어와도(예: 더블클릭, 새로고침) 에러 없이
    // 조용히 넘어가도록 onConflictDoNothing을 씁니다.
    await db
      .insert(workspaceMember)
      .values({
        workspaceId,
        userId: session.id,
        role: "member",
      })
      .onConflictDoNothing({
        target: [workspaceMember.workspaceId, workspaceMember.userId],
      });
    // revalidatePath는 여기서 쓸 수 없어요 — 이 함수가 /invite/[token]
    // 페이지의 렌더링 도중(클라이언트 액션이 아니라) 바로 호출되는데,
    // revalidatePath는 그런 "렌더링 중" 호출을 허용하지 않습니다. 대신
    // 이 함수를 호출한 쪽에서 곧바로 새 워크스페이스(아직 이 세션에서
    // 한 번도 방문한 적 없는 경로)로 redirect()하므로, 그 페이지는 항상
    // 최신 데이터로 새로 렌더링됩니다 — 그래서 없어도 괜찮습니다.
  }
};

// 오너만 초대 링크를 재발급할 수 있습니다 — 링크가 유출됐을 때 이전 링크를
// 무효화하는 용도입니다.
export const regenerateWorkspaceInviteToken = async (workspaceId: string) => {
  const membership = await getWorkspaceMembership(workspaceId);

  if (!membership || membership.role !== "owner") {
    throw new Error("워크스페이스 오너만 초대 링크를 재발급할 수 있습니다.");
  }

  const newToken = generateInviteToken();

  await db
    .update(workspace)
    .set({ inviteToken: newToken, updatedAt: new Date() })
    .where(eq(workspace.id, workspaceId));

  revalidatePath(WORKSPACE_ROUTES.NEW(workspaceId));

  return newToken;
};
