import Link from "next/link";
import { BASE_URL } from "@/constants/routes";

// Threadly 로고(아이콘+워드마크) — 사이드바(SidebarBrand.tsx)와 404 페이지처럼
// 레이아웃 바깥에 있는 화면에서 공용으로 씁니다. 클릭하면 홈으로 이동해요.
const BrandLogo = () => (
  <Link href={BASE_URL} className="flex items-center gap-x-2.5">
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#6366f1] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <img src="/icon-sidebar.svg" alt="Threadly" className="size-4" />
    </div>
    <p className="text-[18px] font-extrabold text-[#0f172a]">Threadly</p>
  </Link>
);

export default BrandLogo;
