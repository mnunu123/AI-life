# 데모 영상 (Remotion)

공고 요건: 2~5분, 주요 기능 시연. 현재 길이 2분 35초.

## 구성

| 컷 | 시간 | 파일 | 내용 |
| --- | --- | --- | --- |
| 1 | 0:00–0:13 | `scenes/Open.tsx` | 13:48 → 13:53, 5분, 열 명 |
| 2 | 0:13–0:32 | `scenes/Iso.tsx` | 아이소메트릭 3층, 위험 점 이동, 전층 동일 방송 |
| 3 | 0:32–0:53 | `scenes/Evidence.tsx` | 재난문자 없음 / 1인당 481대 / 탐지→신고에서 끝 |
| 4 | 0:53–1:08 | `scenes/Proposal.tsx` | 한 문장 + 아키텍처 5칸(2칸 강조) |
| 5–8 | 1:08–1:53 | `scenes/Demo.tsx` | 배포 화면 캡처 1배속, 카메라 이동만 |
| 9 | 1:53–2:13 | `scenes/Results.tsx` | 실험 A 결과 (숫자는 props) |
| 10 | 2:13–2:35 | `scenes/Close.tsx` | 한계 3줄 → 타이틀 → 링크 |

자막 = 내레이션 대본: `src/script.ts`. 자막을 바꾸면 대본도 바뀐다.

## 렌더

```bash
npm install
npx remotion render src/index.ts Main out/demo.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell --concurrency=2
# 특정 프레임만 확인
npx remotion still src/index.ts Main out/f.png --frame=2200 --browser-executable=...
```

## 교체할 것

- `public/clips/dashboard.mp4` — 배포 URL에서 `../scripts/capture.mjs`로 다시 뜬 46초 캡처. 캡처 1.0초가 영상 1:08.0에 맞춰져 있다(`Demo.tsx`의 `CAP_START`). 시나리오 타이밍(`../src/lib/scenario.ts`)을 바꾸면 `Demo.tsx`의 카메라 키프레임도 맞춘다.
- `src/Root.tsx` `defaultProps.results` — 실험 A 숫자(방송만 10명 중 n, 층별 안내 10명 중 m).
- `src/Root.tsx` `defaultProps.close.url` — 배포 URL.
- 내레이션: `public/narration.mp3`를 넣고 `Main.tsx`에 `<Audio src={staticFile("narration.mp3")} />` 추가.
