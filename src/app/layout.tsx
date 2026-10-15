import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "60초 안내 — 다중이용시설 실내 대피 유도 AI",
  description: "흉기난동 탐지 후 60초 안에 층·구역별 대피 안내를 만드는 시제품. 2026 AI 라이프 솔루션 챌린지 출품작.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
