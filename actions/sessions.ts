"use server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

type SessionPayload = {
  id: string;
  name: string;
  email: string;
};

export const encrypt = async (
  payload: SessionPayload,
  expiresIn: string = "30m",
) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
};

export const verify = async (session: string | undefined = "") => {
  // 쿠키 자체가 없는 건 비로그인 방문 시 항상 일어나는 정상적인 경우라,
  // jwtVerify까지 안 가고 조용히 undefined를 돌려줍니다 — 매번
  // console.error를 찍으면 Next.js 개발 오버레이에 매 요청마다 "Console
  // Error"로 떠서 실제 문제(변조/손상된 쿠키)와 구분이 안 됐습니다.
  if (!session) return undefined;

  try {
    const { payload } = await jwtVerify<SessionPayload>(session, encodedKey, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch (error) {
    // 여기 들어왔다는 건 쿠키 값은 있는데 형식이 깨졌거나(JWSInvalid),
    // 만료됐거나(JWTExpired), 서명이 안 맞는(SESSION_SECRET 변경 등) 경우라
    // 한 번은 남겨둘 만하지만, 치명적 에러는 아니라 console.warn으로
    // 낮춰서 "Console Error" 오버레이가 뜨지 않게 합니다.
    console.warn("세션 토큰 검증에 실패했습니다:", error);
  }
};

export const createSession = async (
  payload: SessionPayload,
  rememberMe: boolean = false,
) => {
  const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
  const expiresAt = new Date(Date.now() + maxAgeMs);
  const session = await encrypt(payload, rememberMe ? "30d" : "30m");
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
};

export const deleteSession = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("session");
};

export const verifySession = async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await verify(cookie);

  if (!session?.id) {
    redirect("/login");
  }

  return session;
};
