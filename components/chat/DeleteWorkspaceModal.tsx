"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

type Props = {
  workspaceName: string;
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

// 워크스페이스 삭제 — 가장 파괴적인 액션이라, 일반 확인 모달(useModalStore)
// 대신 이름을 정확히 입력해야만 버튼이 활성화되는 전용 모달을 씁니다.
const DeleteWorkspaceModal = ({
  workspaceName,
  open,
  isDeleting,
  onOpenChange,
  onConfirm,
}: Props) => {
  const [confirmText, setConfirmText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const canDelete = confirmText.trim() === workspaceName;

  // Esc/바깥 클릭/닫기 버튼 등 어떤 방식으로 닫히든 이 한 곳을 거치므로,
  // 삭제 요청 중에는 여기서 막기만 하면 전부 안전합니다. 정상적으로 닫힐
  // 땐 다음에 열렸을 때 깨끗한 입력창을 보여주도록 리셋합니다.
  const handleOpenChange = (next: boolean) => {
    if (!next && isDeleting) return;
    if (!next) setConfirmText("");
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!canDelete || isDeleting) return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isDeleting}
        className="max-w-[460px] gap-0 rounded-2xl border-0 p-6"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-[#fef2f2]">
          <AlertTriangle className="size-6 text-[#dc2626]" />
        </div>

        <DialogTitle className="mt-4 text-lg font-semibold text-[#0f172a]">
          {workspaceName} 워크스페이스를 삭제할까요?
        </DialogTitle>

        <p className="mt-1.5 text-sm text-[#64748b]">
          대화방, 메시지, 코멘트, 사용량 기록이 모두 삭제되며 되돌릴 수
          없어요.
        </p>

        <div className="mt-5 flex w-full flex-col gap-2">
          <label className="text-xs text-[#475569]">
            삭제하려면 워크스페이스 이름{" "}
            <span className="font-semibold text-[#0f172a]">
              &quot;{workspaceName}&quot;
            </span>
            을 입력하세요
          </label>
          <input
            ref={inputRef}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
            disabled={isDeleting}
            placeholder="워크스페이스 이름을 입력하세요"
            className="h-auto w-full rounded-lg border border-[#cbd5e1] px-[15px] py-[11px] text-sm text-[#1e293b] outline-none focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="mt-6 flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="rounded-lg bg-[#f1f5f9] px-4 py-2.5 text-sm text-[#334155] hover:bg-[#e2e8f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
            className={cn(
              "rounded-lg border px-[17px] py-[11px] text-sm transition-colors",
              canDelete && !isDeleting
                ? "border-red-700 bg-red-600 text-white hover:bg-red-700"
                : "cursor-not-allowed border-[#fecaca] bg-[#fee2e2] text-[#f87171]",
            )}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteWorkspaceModal;
