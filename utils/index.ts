export const isEmpty = (text: string | null) => {
  return text === null || text?.trim() === "";
};

// 메시지/코멘트 타임스탬프 표시용 — Chat.tsx(메시지)와
// WorkspaceCommentPanel.tsx(코멘트)가 같은 형식을 씁니다.
export const formatMessageTime = (createdAt?: string) =>
  new Date(createdAt ?? Date.now()).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });

// "/"로 시작하는 내부 경로만 허용 (open redirect 방지). 로그인/회원가입에서
// 둘 다 쓰는 ?from= 리다이렉트 검증 로직이라 공용으로 뺐습니다.
export const isSafeRedirectPath = (from: unknown): from is string =>
  typeof from === "string" && from.startsWith("/") && !from.startsWith("//");

// 큰 숫자를 "14.5M"/"8.9K"처럼 축약 — 워크스페이스 통계 대시보드의 토큰
// 사용량 표시용입니다.
export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

// CreateWorkspaceModal.tsx(생성 직후 초대 링크)와 워크스페이스 설정 화면이
// 공유하는 초대 링크 생성 로직입니다.
export const buildInviteLink = (inviteToken: string) => {
  const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return `${base}/invite/${inviteToken}`;
};

// 멤버 아바타 배경색 팔레트 — 인디고 톤 범위 안에서만 고릅니다(앱 전반의
// 톤과 맞추기 위해). user_id를 해시해서 고르므로, 어디서 렌더링되든(코멘트/
// 대화방 헤더/워크스페이스 설정 화면) 같은 사람은 항상 같은 색을 받습니다.
const MEMBER_AVATAR_COLORS = ["#E2DFFF", "#C9E6FF", "#DAE2FD", "#E2E7FF"];

// 단순히 글자 코드를 더해서 나누면 거의 항상 같은 색이 나와요 — 한글
// 완성형 코드(0xAC00 + (초성*21+중성)*28+종성)는 28이 4의 배수라서,
// 그 값 % 4가 사실상 받침(종성) 인덱스로만 정해지고, 실제 이름들은 받침이
// 비슷하게 겹치는 경우가 많아서 쏠립니다. FNV-1a로 제대로 섞은 뒤, 하위
// 비트보다 덜 쏠리는 상위 비트를 사용합니다. (uuid인 user_id는 애초에 겹칠
// 걱정이 없지만, 그대로 재사용해 하나의 해시 함수로 통일합니다.)
export const getMemberAvatarColor = (id: string) => {
  let hash = 0x811c9dc5;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  const index = (hash >>> 16) % MEMBER_AVATAR_COLORS.length;
  return MEMBER_AVATAR_COLORS[index];
};
