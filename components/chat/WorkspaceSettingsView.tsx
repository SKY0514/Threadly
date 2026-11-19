"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Mail,
  Plus,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "cn";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import DeleteWorkspaceModal from "./DeleteWorkspaceModal";
import RemoveMemberModal from "./RemoveMemberModal";
import ReissueInviteLinkModal from "./ReissueInviteLinkModal";
import {
  addWorkspaceMemberByEmail,
  deleteWorkspace,
  regenerateWorkspaceInviteToken,
  removeWorkspaceMember,
  renameWorkspace,
} from "@/actions/workspaces";
import { WorkspaceInviteEmailSchema } from "@/schemas/workspace";
import { BASE_URL, WORKSPACE_ROUTES } from "@/constants/routes";
import { buildInviteLink, getMemberAvatarColor } from "@/utils";
import pusherClient from "@/lib/pusherClient";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isOwner: boolean;
};

type ResultMessage = {
  type: "success" | "pending" | "already" | "invalid";
  text: string;
};

type Props = {
  workspaceId: string;
  workspaceName: string;
  inviteToken: string;
  currentUserId: string;
  initialMembers: Member[];
};

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="flex w-full flex-col gap-5 rounded-2xl border border-[#e2e8f0]/80 bg-white p-[25px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
    <div className="flex flex-col gap-0.5 border-b border-[#f1f5f9] pb-[17px]">
      <h2 className="text-lg text-[#0f172a]">{title}</h2>
      <p className="text-xs text-[#64748b]">{description}</p>
    </div>
    {children}
  </div>
);

const WorkspaceSettingsView = ({
  workspaceId,
  workspaceName,
  inviteToken: initialInviteToken,
  currentUserId,
  initialMembers,
}: Props) => {
  const router = useRouter();

  // 일반 — 이름 변경
  const [name, setName] = useState(workspaceName);
  const [savedName, setSavedName] = useState(workspaceName);
  const [isRenaming, startRenameTransition] = useTransition();

  // 멤버
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [emailInput, setEmailInput] = useState("");
  const [resultMessage, setResultMessage] = useState<ResultMessage | null>(
    null,
  );
  const [isAdding, startAddTransition] = useTransition();
  // 내보내기 확인 모달 대상 — null이면 모달이 닫혀 있는 상태입니다.
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();

  // 초대 링크
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [isReissuing, startReissueTransition] = useTransition();

  // 위험 영역
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const trimmedName = name.trim();
  const canSaveName = trimmedName.length > 0 && trimmedName !== savedName;

  // isRenaming(useTransition의 pending state)은 리렌더를 거쳐야 반영되는데,
  // Enter와 "저장" 클릭이 같은 틱에 거의 동시에 들어오면 그 리렌더 전에
  // 둘 다 이 함수를 호출해 요청이 중복으로 나가는 경우가 있었습니다(가끔
  // 토스트가 두 번 뜨는 원인). ref는 즉시 반영되므로 여기서 동기적으로
  // 막습니다.
  const isSavingNameRef = useRef(false);

  const handleSaveName = () => {
    if (!canSaveName || isSavingNameRef.current) return;

    isSavingNameRef.current = true;
    startRenameTransition(async () => {
      try {
        await renameWorkspace(workspaceId, trimmedName);
        setSavedName(trimmedName);
        setName(trimmedName);
        toast.success("워크스페이스 이름을 변경했어요.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "이름 변경에 실패했습니다.",
        );
      } finally {
        isSavingNameRef.current = false;
      }
    });
  };

  const handleAddMember = () => {
    const email = emailInput.trim();
    const parsed = WorkspaceInviteEmailSchema.safeParse(email);

    if (!parsed.success) {
      setResultMessage({
        type: "invalid",
        text: "올바른 이메일 주소를 입력해 주세요.",
      });
      return;
    }

    if (members.some((member) => member.email === email)) {
      setResultMessage({ type: "already", text: "이미 참여 중인 멤버예요." });
      setEmailInput("");
      return;
    }

    startAddTransition(async () => {
      try {
        const result = await addWorkspaceMemberByEmail(workspaceId, email);

        if (result.status === "added") {
          setMembers((prev) => [
            ...prev,
            {
              id: result.member.id,
              userId: result.member.userId,
              name: result.member.name,
              email,
              isOwner: false,
            },
          ]);
          setResultMessage({
            type: "success",
            text: `${result.member.name} 님을 추가했어요.`,
          });
        } else if (result.status === "already-member") {
          setResultMessage({
            type: "already",
            text: "이미 참여 중인 멤버예요.",
          });
        } else {
          setResultMessage({
            type: "pending",
            text: "아직 가입하지 않은 이메일이에요. 아래 초대 링크를 전달해 주세요.",
          });
        }
        setEmailInput("");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "초대에 실패했습니다.",
        );
      }
    });
  };

  const handleConfirmRemoveMember = () => {
    if (!removeTarget) return;

    const target = removeTarget;
    startRemoveTransition(async () => {
      try {
        await removeWorkspaceMember(workspaceId, target.id);
        setMembers((prev) => prev.filter((member) => member.id !== target.id));
        setRemoveTarget(null);
        toast.success(`${target.name} 님을 내보냈어요.`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "멤버 제거에 실패했습니다.",
        );
      }
    });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(buildInviteLink(inviteToken));
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1500);
  };

  const handleReissueLink = () => {
    startReissueTransition(async () => {
      try {
        const newToken = await regenerateWorkspaceInviteToken(workspaceId);
        setInviteToken(newToken);
        setIsReissueModalOpen(false);
        toast.success("새 초대 링크를 만들었어요.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "재발급에 실패했습니다.",
        );
      }
    });
  };

  const handleDeleteWorkspace = () => {
    startDeleteTransition(async () => {
      try {
        await deleteWorkspace(
          workspaceId,
          pusherClient.connection.socket_id || undefined,
        );
        setIsDeleteModalOpen(false);
        toast.success("워크스페이스를 삭제했어요.");
        router.replace(BASE_URL);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "삭제에 실패했습니다.",
        );
      }
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#fafafa]">
      <div className="flex w-full flex-col items-start px-8 py-7 lg:px-32">
        <div className="flex w-full max-w-[768px] flex-col gap-6 px-6 pb-20">
          {/* 상단 브레드크럼 */}
          <nav className="-mt-3 mb-1 flex items-center gap-2 text-sm">
            <span className="text-[#475569]">워크스페이스</span>
            <ChevronRight className="size-3.5 text-[#475569]" />
            <Link
              href={WORKSPACE_ROUTES.NEW(workspaceId)}
              className="text-[#475569] hover:text-[#0f172a]"
            >
              {workspaceName}
            </Link>
            <ChevronRight className="size-3.5 text-[#475569]" />
            <span className="font-semibold text-[#6366f1]">설정</span>
          </nav>

          {/* 일반 */}
          <Section
            title="일반"
            description="워크스페이스의 기본 식별 정보입니다."
          >
            <div className="flex w-full flex-col gap-2">
              <label className="text-sm text-[#334155]">
                워크스페이스 이름
              </label>
              <div className="flex w-full items-center gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveName();
                    }
                  }}
                  className="h-auto max-w-[448px] flex-1 rounded-lg border border-[#cbd5e1] px-[15px] py-[11px] text-sm text-[#1e293b]"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={!canSaveName || isRenaming}
                  className="shrink-0 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] px-[17px] py-[11px] text-sm text-[#94a3b8] enabled:border-transparent enabled:bg-[#6366f1] enabled:text-white enabled:hover:bg-[#4f46e5] disabled:cursor-not-allowed"
                >
                  {isRenaming ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </Section>

          {/* 멤버 */}
          <Section
            title={`멤버 (${members.length})`}
            description="워크스페이스에 참여 중인 팀원 목록입니다."
          >
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full items-center gap-2.5">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-[15px] py-[13px]">
                  <Mail className="size-3.5 shrink-0 text-[#94a3b8]" />
                  <input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    placeholder="초대할 동료의 이메일을 입력하세요 (teammate@company.com)"
                    className="min-w-0 flex-1 border-none text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!emailInput.trim() || isAdding}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  추가
                </button>
              </div>

              {/* 결과 메시지 — "추가"를 누른 뒤에만 보여주고, 평소에는 비워둡니다. */}
              {resultMessage && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-1",
                    resultMessage.type === "success"
                      ? "text-[#059669]"
                      : "text-[#d97706]",
                  )}
                >
                  {resultMessage.type === "success" ? (
                    <CheckCircle2 className="size-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3 shrink-0" />
                  )}
                  <p className="text-xs font-medium">{resultMessage.text}</p>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between border-t border-[#f1f5f9] py-3.5 first:border-t-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      size="default"
                      className="size-9"
                      style={{
                        backgroundColor: getMemberAvatarColor(member.userId),
                      }}
                    >
                      <AvatarFallback className="bg-inherit text-sm font-semibold text-[#464554]">
                        {member.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-[#0f172a]">
                          {member.name}
                        </span>
                        {member.userId === currentUserId && (
                          <span className="text-xs text-[#94a3b8]">(나)</span>
                        )}
                      </div>
                      <span className="text-xs text-[#64748b]">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {member.isOwner ? (
                    <span className="rounded-full border border-[#e0e7ff] bg-[#eef2ff] px-[11px] py-[3px] text-xs text-[#4338ca]">
                      오너
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs text-[#475569]">
                        멤버
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(member)}
                        className="px-1 py-0.5 text-sm text-[#94a3b8] transition-colors hover:text-red-600"
                      >
                        제거
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* 초대 링크 */}
          <Section
            title="초대 링크"
            description="링크가 있는 모든 사용자가 워크스페이스에 참여할 수 있습니다."
          >
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full items-center gap-2.5">
                <div className="flex-1 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-[15px] py-[11px]">
                  <p className="truncate font-mono text-sm text-[#475569]">
                    {buildInviteLink(inviteToken)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-[17px] py-[11px] text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  {copyState === "copied" ? (
                    <Check className="size-4 text-[#059669]" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copyState === "copied" ? "복사됨" : "링크 복사"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReissueModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-[#6366f1] hover:underline"
                >
                  <RefreshCw className="size-3" />
                  링크 재발급
                </button>
                <span className="text-xs text-[#94a3b8]">
                  재발급하면 이전 링크는 더 이상 사용할 수 없어요.
                </span>
              </div>
            </div>
          </Section>

          {/* 위험 영역 */}
          <div className="flex w-full flex-col items-start rounded-2xl border border-[#fecaca] bg-[rgba(254,242,242,0.2)] p-[25px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base text-[#dc2626]">위험 영역</h3>
                <p className="text-sm text-[#475569]">
                  삭제하면 대화방, 메시지, 코멘트, 사용량 기록이 모두 사라지고
                  되돌릴 수 없어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="shrink-0 rounded-lg border border-[#fca5a5] bg-white px-[17px] py-2.25 text-sm text-[#dc2626] hover:bg-red-50"
              >
                워크스페이스 삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteWorkspaceModal
        workspaceName={savedName}
        open={isDeleteModalOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteWorkspace}
      />

      <RemoveMemberModal
        memberName={removeTarget?.name ?? ""}
        open={removeTarget !== null}
        isRemoving={isRemoving}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onConfirm={handleConfirmRemoveMember}
      />

      <ReissueInviteLinkModal
        open={isReissueModalOpen}
        isReissuing={isReissuing}
        onOpenChange={setIsReissueModalOpen}
        onConfirm={handleReissueLink}
      />
    </div>
  );
};

export default WorkspaceSettingsView;
