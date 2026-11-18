"use client";

import { useRouter } from "next/navigation";
import { BASE_URL } from "@/constants/routes";

// 주소를 직접 입력해서 들어온 경우(돌아갈 기록이 없음)엔 router.back()이
// 아무 일도 안 하니, 그때는 홈으로 보냅니다. history.length가 1이면 이
// 탭에서 처음 연 페이지라는 뜻이라 이 신호로 판단해요.
const NotFoundBackButton = () => {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(BASE_URL);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-[#c7c4d7] bg-white px-[25px] py-[11px] text-sm font-medium text-[#131b2e] hover:bg-[#faf8ff]"
    >
      이전 페이지로
    </button>
  );
};

export default NotFoundBackButton;
