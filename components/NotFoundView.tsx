import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import NotFoundBackButton from "@/components/NotFoundBackButton";
import { BASE_URL } from "@/constants/routes";

// app/not-found.tsx(진짜 존재하지 않는 URL)와 app/404/page.tsx((chat)
// 레이아웃 안에서 notFound() 대신 여기로 redirect해서 사이드바 없이 보여줄
// 때) 둘 다 같은 화면을 써서 뺐습니다.
const NotFoundView = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8ff]">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-black/[0.04] bg-[#faf8ff]/80 px-6 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <BrandLogo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        {/* 404 말풍선 그래픽 */}
        <div className="relative mb-8 flex size-36 shrink-0 items-center justify-center rounded-full bg-[#eef2ff]">
          <div className="relative flex items-center justify-center rounded-2xl border-2 border-[#6366f1] bg-white px-[22px] py-[14px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
            <span className="text-2xl font-semibold tracking-[-0.6px] text-[#4648d4]">
              404
            </span>
            <span className="absolute -bottom-[8.5px] left-[17.5px] size-[17px] rotate-45 border-r-2 border-b-2 border-[#6366f1] bg-white" />
          </div>
        </div>

        <h1 className="text-[30px] font-semibold tracking-[-0.75px] text-[#131b2e]">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mt-3 max-w-[420px] text-base text-[#464554]">
          주소가 잘못되었거나, 삭제되었거나, 접근 권한이 없는 페이지예요.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href={BASE_URL}
            className="rounded-lg bg-[#6366f1] px-6 py-2.5 text-sm font-medium text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#4f46e5]"
          >
            홈으로 돌아가기
          </Link>
          <NotFoundBackButton />
        </div>

        <p className="mt-6 max-w-[312px] text-xs text-[#767586]">
          계속 문제가 생기면 관리자에게 문의해 보세요.
        </p>
      </main>
    </div>
  );
};

export default NotFoundView;
