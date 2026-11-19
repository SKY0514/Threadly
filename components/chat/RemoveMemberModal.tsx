"use client";

import { UserX } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

type Props = {
  memberName: string;
  open: boolean;
  isRemoving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

// 워크스페이스 삭제(DeleteWorkspaceModal.tsx)와 달리 이름을 타이핑해 확인할
// 필요는 없는 가벼운 확인 모달이라, 구조는 비슷해도 별도 컴포넌트로 둡니다.
const RemoveMemberModal = ({
  memberName,
  open,
  isRemoving,
  onOpenChange,
  onConfirm,
}: Props) => {
  // 내보내는 중엔 Esc/바깥 클릭/닫기 버튼 어떤 방식으로도 안 닫히게 막습니다.
  const handleOpenChange = (next: boolean) => {
    if (!next && isRemoving) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isRemoving}
        className="max-w-[460px] gap-0 rounded-2xl border-0 p-6"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-[#fef2f2]">
          <UserX className="size-6 text-[#ef4444]" />
        </div>

        <DialogTitle className="mt-4 text-lg font-semibold text-[#0f172a]">
          {memberName} 님을 워크스페이스에서 내보낼까요?
        </DialogTitle>

        <p className="mt-1.5 text-sm text-[#64748b]">
          이 멤버는 더 이상 이 워크스페이스의 대화방을 볼 수 없어요. 이
          멤버가 만든 대화방과 사용량 기록은 그대로 남아요.
        </p>

        <div className="mt-6 flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isRemoving}
            className="rounded-lg bg-[#f1f5f9] px-4 py-2.5 text-sm text-[#334155] hover:bg-[#e2e8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors",
              isRemoving
                ? "cursor-not-allowed bg-[#ef4444]/60"
                : "bg-[#ef4444] hover:bg-red-600",
            )}
          >
            {isRemoving ? "내보내는 중..." : "내보내기"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveMemberModal;
