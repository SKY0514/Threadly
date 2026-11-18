import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ChatMessageMetadata } from "@/types/chat";
import { AI_MODEL } from "@/constants/chat";

export async function POST(req: Request) {
  const {
    messages,
    model,
  }: {
    messages: UIMessage[];
    model: (typeof AI_MODEL)[number]["value"];
  } = await req.json();

  const selectedModel = model || "gpt-4o-mini";

  const result = streamText({
    model: openai(selectedModel),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse<UIMessage<ChatMessageMetadata>>({
    // "finish" 파트에만 totalUsage가 담겨있어요 — 스트리밍이 끝나야 실제로
    // 쓰인 토큰 수를 알 수 있습니다. 워크스페이스 통계 대시보드 집계용.
    messageMetadata: ({ part }) => ({
      model: selectedModel,
      createdAt: new Date().toISOString(),
      ...(part.type === "finish"
        ? { totalTokens: part.totalUsage.totalTokens }
        : {}),
    }),
  });
}
