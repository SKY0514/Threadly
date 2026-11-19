import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { BASE_URL } from "@/constants/routes";

// /invite/[token]에서 토큰이 유효하지 않을 때 보여줍니다. 로그인 여부와
// 무관하게 바로 이 화면을 보여줘야 해서(죽은 링크를 위해 로그인/회원가입을
// 먼저 시키면 안 됨), "/" 링크 하나로도 충분합니다 — 로그인 상태면 채팅
// 메인으로, 아니면 proxy.ts가 알아서 로그인 페이지로 보내줘요.
const InvalidInviteLinkView = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafd]">
      <header className="flex h-16 shrink-0 items-center px-10">
        <BrandLogo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-8 flex size-28 shrink-0 items-center justify-center rounded-full bg-[#eef2ff]">
          <img
            src="/icon-link-to-off.svg"
            alt="link to off"
            className="size-20"
          />
        </div>

        <h1 className="text-[30px] font-semibold tracking-[-0.75px] text-[#111827]">
          유효하지 않은 초대 링크예요
        </h1>
        <p className="mt-3 max-w-[448px] text-base text-[#6b7280]">
          링크가 만료되었거나 재발급되었어요. 워크스페이스 오너에게 새 링크를
          요청해 주세요.
        </p>

        <Link
          href={BASE_URL}
          className="mt-8 rounded-lg bg-[#6366f1] px-6 py-2.5 text-sm font-medium text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#4f46e5]"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
};

export default InvalidInviteLinkView;
