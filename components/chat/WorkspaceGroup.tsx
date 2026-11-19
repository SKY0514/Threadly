"use client";

import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Folder,
  Plus,
  Settings,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { BASE_URL, WORKSPACE_ROUTES } from "@/constants/routes";
import WorkSpaceItem from "./WorkSpaceItem";
import Link from "next/link";
import { useWorkspaceGroupStore } from "@/stores/workspaceGroup";
import { useUserStore } from "@/stores/user";
import { useModalStore } from "@/stores/modal";
import ModalFooter from "../modal/ModalFooter";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { deleteConversation } from "@/actions/conversations";
import { usePathname, useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import pusherClient from "@/lib/pusherClient";
import { PUSHER_EVENTS, workspaceChannel } from "@/constants/pusher";

type Props = {
  workspace: {
    role: "owner" | "admin" | "member";
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
  };
  conversations: { id: string; name: string | null; userId: string }[];
};

const WorkspaceGroup = ({ workspace, conversations }: Props) => {
  const { id: conversationId } = useParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  // Pusher 핸들러(아래 useEffect)는 workspace.id 등이 바뀔 때만 다시 구독해서
  // pathname을 의존성에 넣지 않았어요 — 그래서 핸들러 안에서 그냥 pathname을
  // 읽으면 구독 시점의 값에 고정되는(stale closure) 문제가 생깁니다. ref로
  // 매 렌더마다 최신값을 담아두고 핸들러에서 그걸 읽습니다.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const isStatsActive = pathname === WORKSPACE_ROUTES.STATS(workspace.id);
  const isSettingsActive = pathname === WORKSPACE_ROUTES.SETTINGS(workspace.id);
  const openWorkspaceId = useWorkspaceGroupStore(
    (state) => state.openWorkspaceId,
  );
  const toggleWorkspace = useWorkspaceGroupStore(
    (state) => state.toggleWorkspace,
  );
  const isCollapsed = openWorkspaceId !== workspace.id;
  const currentUserId = useUserStore((state) => state.user.id);

  const isOwner = workspace.role === "owner";
  const isAdmin = workspace.role === "admin";
  const isStaff = isOwner || isAdmin;
  const { openModal, closeModal } = useModalStore((state) => state);

  const [isDeleting, startDeleteTransition] = useTransition();

  // 이름 변경/삭제 권한: 오너/관리자는 전부, 유저는 본인이 만든 대화만
  // (⋮ 메뉴 노출 여부에 그대로 반영됩니다 — 실제 검증은
  // actions/conversations.ts에서 한 번 더 합니다)
  const items = conversations.map((conversation) => ({
    id: conversation.id,
    label: conversation.name || "",
    href: WORKSPACE_ROUTES.CONVERSATION(workspace.id, conversation.id),
    canManage: isStaff || conversation.userId === currentUserId,
  }));

  const [optimisticList, removeOptimisticList] = useOptimistic(
    items,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  );

  // 이 워크스페이스의 대화방이 다른 멤버에 의해 생성/삭제/제목변경되면,
  // 지금 그 대화방 페이지를 보고 있지 않아도(사이드바만 봐도) 알 수
  // 있게 합니다. 신호만 받고 router.refresh()로 서버 데이터(conversations
  // prop의 출처인 Sidebar.tsx)를 다시 가져옵니다.
  useEffect(() => {
    const channel = pusherClient.subscribe(workspaceChannel(workspace.id));

    channel.bind(PUSHER_EVENTS.WORKSPACE_UPDATED, () => {
      router.refresh();
      // 대화방 목록(서버 컴포넌트)은 router.refresh()로 충분하지만,
      // 워크스페이스 공유 대화 화면의 브레드크럼/헤더에 쓰이는 워크스페이스
      // 이름(Header.tsx)은 react-query 캐시라 router.refresh()가 닿지
      // 않아요 — 이름 변경 시 그 화면을 보고 있어도 반영되도록 따로
      // 무효화합니다.
      queryClient.invalidateQueries({
        queryKey: ["workspace-header", workspace.id],
      });
    });

    // 오너가 이 워크스페이스를 삭제했을 때 — 지금 그 워크스페이스 화면
    // (대화/통계/설정) 안에 있었다면 곧바로 "/"로 보냅니다. router.refresh()
    // 로 각 페이지의 멤버십 검증이 알아서 리다이렉트해주길 기다리면
    // NOT_FOUND_URL(/404)로 빠지고, 그마저도 타이밍에 따라 반영이 늦어
    // 대화방에 그대로 남아 있는 것처럼 보일 수 있어서, 여기서 바로 명시적
    // 으로 이동시킵니다. 사이드바만 보고 있던 사람은 항목이 조용히
    // 사라지는 것만으로 충분해서 router.refresh()만 합니다.
    channel.bind(PUSHER_EVENTS.WORKSPACE_DELETED, () => {
      if (pathnameRef.current.startsWith(WORKSPACE_ROUTES.NEW(workspace.id))) {
        toast("오너가 워크스페이스를 삭제했어요.", {
          icon: <AlertTriangle className="size-4 text-[#dc2626]" />,
        });
        router.replace(BASE_URL);
      }
      // "/"로 이동한 뒤에도 사이드바(레이아웃)가 이미 떠 있던 세션이면
      // 클라이언트 라우터 캐시 때문에 삭제된 항목이 그대로 남아 보일 수
      // 있어서, 두 분기 모두 router.refresh()로 서버 데이터를 강제로 다시
      // 받습니다.
      router.refresh();
    });

    // 멤버 추방 — 워크스페이스 채널은 멤버 전원이 구독하고 있어서, 추방된
    // 사람이 "나"일 때만 반응합니다. 남은 멤버에게는 아무 변화가 없어야
    // 하므로 조용히 무시합니다. 그 워크스페이스 화면 안에 있었다면
    // WORKSPACE_DELETED와 같은 이유로 "/"로 바로 보냅니다.
    channel.bind(
      PUSHER_EVENTS.MEMBER_REMOVED,
      ({ userId }: { userId: string }) => {
        if (userId !== currentUserId) return;

        if (pathnameRef.current.startsWith(WORKSPACE_ROUTES.NEW(workspace.id))) {
          toast("이 워크스페이스에서 제외되었어요.", {
            icon: <AlertTriangle className="size-4 text-[#dc2626]" />,
          });
          router.replace(BASE_URL);
        }
        router.refresh();
      },
    );

    return () => {
      // 재구독 시 이전 바인딩이 남아 이벤트가 중복 발생하는 걸 막기 위해
      // 채널을 끊기 전에 바인딩을 먼저 전부 지웁니다.
      channel.unbind_all();
      pusherClient.unsubscribe(workspaceChannel(workspace.id));
    };
  }, [workspace.id, router, currentUserId, queryClient]);

  const handleClickDeleteButton = (id: string) => {
    openModal({
      title: "정말 삭제하시겠습니까?",
      description: "삭제 후 데이터는 복구하기 어려울 수 있습니다.",
      footer: (
        <ModalFooter
          disabled={isDeleting}
          onCancel={closeModal}
          onConfirm={() => onDelete(id)}
        />
      ),
    });
  };

  const onDelete = (id: string) => {
    startDeleteTransition(async () => {
      removeOptimisticList(id);
      try {
        // 이 socketId를 넘기면 내 탭에는 conversation-deleted 알림이 다시
        // 안 와요 — 내가 지운 거니까 "삭제에 성공했습니다"면 충분합니다.
        // (아직 Pusher 연결이 안 됐으면 빈 문자열일 수 있어 그때는 안 넘겨요.)
        await deleteConversation(id, pusherClient.connection.socket_id || undefined);

        if (conversationId === id) {
          router.replace(WORKSPACE_ROUTES.NEW(workspace.id));
        }

        toast.success("삭제에 성공했습니다.");

        closeModal();
      } catch (error) {
        console.error("error:", error);
        toast.error("삭제에 실패했습니다.");
      }
    });
  };

  return (
    <div className="w-full rounded-lg">
      <div className="flex items-center justify-between gap-x-2 px-2 py-1.5">
        <button
          className="flex min-w-0 flex-1 items-center gap-x-2"
          onClick={() => toggleWorkspace(workspace.id)}
        >
          <Folder
            className={cn(
              "size-3.5 shrink-0",
              isCollapsed ? "text-[#64748b]" : "text-[#6366F1]",
            )}
          />
          <span className="truncate text-[13px] text-[#0f172a]">
            {workspace.name}
          </span>

          <ChevronDown
            className={cn("size-3.5", isCollapsed && "-rotate-90")}
          />
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={WORKSPACE_ROUTES.NEW(workspace.id)}
            title="대화 추가"
            className="flex size-6 items-center justify-center rounded text-[#64748b] hover:text-[#0f172a]"
          >
            <Plus className="size-3.5" />
          </Link>
          {isStaff && (
            <Link
              href={WORKSPACE_ROUTES.STATS(workspace.id)}
              title="사용량 통계"
              className={cn(
                "flex size-6 items-center justify-center rounded",
                isStatsActive
                  ? "bg-[#6366f1] text-white"
                  : "text-[#64748b] hover:text-[#0f172a]",
              )}
            >
              <BarChart2 className="size-3.5" />
            </Link>
          )}
          {isStaff && (
            <Link
              href={WORKSPACE_ROUTES.SETTINGS(workspace.id)}
              title="워크스페이스 설정"
              className={cn(
                "flex size-6 items-center justify-center rounded",
                isSettingsActive
                  ? "bg-[#6366f1] text-white"
                  : "text-[#64748b] hover:text-[#0f172a]",
              )}
            >
              <Settings className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-0.5 px-1">
          {optimisticList.length === 0 ? (
            <p className="px-2.5 py-2 text-[13px] text-[#64748b]">
              아직 대화가 없어요
            </p>
          ) : (
            <>
              {optimisticList.map((item) => (
                <WorkSpaceItem
                  key={item.id}
                  item={item}
                  onDelete={(id) => handleClickDeleteButton(id)}
                  canManage={item.canManage}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkspaceGroup;
