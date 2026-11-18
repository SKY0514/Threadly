export const BASE_URL = "/";

// (chat) 레이아웃 아래(사이드바가 있는) 페이지에서 notFound()를 쓰면
// Next.js가 그 세그먼트를 감싸는 레이아웃(사이드바)까지 그대로 두고 그
// 안에 404 내용만 끼워 넣어요 — 그래서 사이드바가 없는, 피그마 디자인
// 그대로의 404 화면을 보여주려면 (chat) 바깥의 이 경로로 리다이렉트해야
// 합니다. app/not-found.tsx(진짜 존재하지 않는 URL)와 같은 화면을 보여줘요.
export const NOT_FOUND_URL = "/404";

export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGN_UP: "/signup",
};

export const CHAT_ROUTES = {
  CONVERSATIONS: "/c",
};

// 워크스페이스 공유 대화는 개인 대화(/c/[id])와 분리된 네임스페이스를 씁니다.
// 접근 권한(멤버십) 검증을 URL만으로 할 수 있고, 추후 설정/대시보드 화면도
// 같은 네임스페이스 하위에 둘 수 있습니다.
export const WORKSPACE_ROUTES = {
  NEW: (workspaceId: string) => `/w/${workspaceId}`,
  CONVERSATION: (workspaceId: string, conversationId: string) =>
    `/w/${workspaceId}/c/${conversationId}`,
};

export const PUBLIC_ROUTES = [AUTH_ROUTES.LOGIN, AUTH_ROUTES.SIGN_UP];
