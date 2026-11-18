import { UIMessage } from "ai";

export type ChatMessageMetadata = {
  model?: string;
  createdAt: string;
  // role이 "user"인 메시지의 실제 작성자 — 워크스페이스 공유 대화에서
  // "나"인지 다른 멤버인지 구분하는 데 씁니다. assistant 메시지엔 없음.
  authorId?: string;
  authorName?: string;
  // role이 "assistant"인 메시지의 총 토큰 사용량 — 워크스페이스 통계
  // 대시보드 집계용. 스트리밍이 끝나야(finish 이벤트) 알 수 있어요.
  totalTokens?: number;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
