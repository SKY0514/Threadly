"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

type Props = {
  open: boolean;
  isReissuing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

// 삭제/추방과 달리 파괴적이지 않은 액션이라(이미 참여한 멤버는 영향 없음),
// 빨간색이 아니라 인디고 톤으로 통일합니다.
const ReissueInviteLinkModal = ({
  open,
  isReissuing,
  onOpenChange,
  onConfirm,
}: Props) => {
  // 재발급 중엔 Esc/바깥 클릭/닫기 버튼 어떤 방식으로도 안 닫히게 막습니다.
  const handleOpenChange = (next: boolean) => {
    if (!next && isReissuing) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isReissuing}
        className="max-w-[460px] gap-0 rounded-2xl border-0 p-6"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-[#eef2ff]">
          <RefreshCw className="size-6 text-[#6366f1]" />
        </div>

        <DialogTitle className="mt-4 text-lg font-semibold text-[#0f172a]">
          초대 링크를 재발급할까요?
        </DialogTitle>

        <p className="mt-1.5 text-sm text-[#64748b]">
          이전 링크는 바로 사용할 수 없게 되고 새 링크가 만들어져요. 이미
          참여한 멤버에게는 영향이 없어요.
        </p>

        <div className="mt-6 flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isReissuing}
            className="rounded-lg bg-[#f1f5f9] px-4 py-2.5 text-sm text-[#334155] hover:bg-[#e2e8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isReissuing}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors",
              isReissuing
                ? "cursor-not-allowed bg-[#6366f1]/60"
                : "bg-[#6366f1] hover:bg-[#4f46e5]",
            )}
          >
            {isReissuing ? "재발급 중..." : "재발급"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReissueInviteLinkModal;
