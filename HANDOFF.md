# 인수인계 — 60초 안내 (2026 AI 라이프 솔루션 챌린지)

마감 10/31(토) 24:00, 실제 목표 10/30(금) 오전 메일 발송 → relations2@keit.re.kr
계획서(공고 정리·근거·일정·체크리스트): claude.ai/code/artifact/b5a779d1-7ae4-461b-99f8-eb22a92562ad

## 지금 상태 (10/16 오후)

| 덩어리 | 상태 | 위치 |
| --- | --- | --- |
| 판단 엔진 + 안내문 템플릿 | 완료, 테스트 13개 통과 | `src/lib/engine.ts`, `src/lib/announce.ts`, `npm test` |
| 관제 대시보드 | v1 완료, 1080p에 3층 다 들어감 | `src/components/`, 로컬 `scripts/restart.sh` → :3123 |
| LLM 안내문 라우트 | 완료, 키 없으면 템플릿 | `src/app/api/announce/route.ts`, env `ANTHROPIC_API_KEY` |
| 탐지 JSON·CCTV 클립 | **플레이스홀더** | `public/detections/*.json`, `public/video/*` |
| 화면 캡처 파이프라인 | 완료 (46초 → 1380프레임 약 6분) | `scripts/capture.mjs` |
| 데모 영상 (Remotion) | **v4** — 효과음 + 남성 TTS(Typecast 준성) 26문장 + 실험 A 결과, 2분 46초 | `video/`, 결과 `video/out/demo_v4.mp4` |
| Vercel 배포 | 세준이 Import 대기 | — |
| 성과보고서·참가신청서 | 아직 | 양식은 KEIT 공지 zip (PPT 4쪽 양식 쓰기로) |
| 실험 A(설문) | **완료** — 50명씩 100명, 방송만 26/50 → 층별 안내 2/50 | `docs/experiment-A-survey.md`, 영상 컷 9 |
| 실험 B(탐지 10클립)·C(속도)·인터뷰 | 아직 | 계획서 6절 |

## 세준이 할 일 (순서대로)

1. Vercel에서 `mnunu123/AI-life` Import → 배포 URL을 Claude에게 전달. (선택) env `ANTHROPIC_API_KEY`.
2. 공개 흉기 탐지 데이터셋 고르기 + 라이선스 확인 → 클립 10개(흉기 5, 비흉기 5). 출처·라이선스를 README에 적는다.
3. YOLO 경량 모델 파인튜닝(로컬 GPU) → 클립 10개 추론 → `public/detections/<CAM>.json` 스키마(README)로 저장. 클립은 `public/video/<CAM>.mp4` + `.webm`(ffmpeg -c:v libvpx-vp9).
4. ~~실험 A 설문~~ 완료. 성과보고서용으로 설문 방식·날짜·응답 원본(개인정보 없음) 정리해 두기.
5. ~~내레이션~~ 완료(TTS 준성). 대본을 고치면 아래 '내레이션 다시 만들기' 순서로.
6. 참가신청서 서명, 10/30 발송.

## Claude가 이어서 할 일

- 배포 URL 받으면 `node scripts/capture.mjs <url> 30 0 46000 capture` 로 다시 캡처 → `video/public/clips/dashboard.mp4` 교체 → 재렌더.
- 실제 탐지 JSON 들어오면 `src/lib/scenario.ts`의 clip/detections 경로 확인 → 캡처 → 재렌더.
- 배포 URL 받으면 Close의 `url`(`video/src/Main.tsx` defaultProps) 교체 → 최종 렌더. 실험 A 숫자는 이미 들어감(26/50, 2/50, n=50).
- 성과보고서 PPT 4쪽 초안 (계획서 8절 매핑) — 10/27까지.
- 설문지 초안(구글폼 문항) + 가상 평면도 그림.

## 자주 쓰는 명령

```bash
npm test                                   # 엔진 테스트
npm run build && scripts/restart.sh        # 로컬 서버 :3123
node scripts/shot.mjs http://localhost:3123/ 0,9000,40000     # 지정 시각 스크린샷
node scripts/capture.mjs http://localhost:3123/ 30 0 46000 capture   # 프레임 캡처 → mp4
cd video && npx remotion render src/index.ts Main out/demo.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell --concurrency=2
```

컨테이너는 외부 사이트 다운로드가 막혀 있다(npm·GitHub만 됨). 데이터셋·폰트 같은 외부 파일은 세준이가 받아 올려야 한다.

## 내레이션 다시 만들기 (대본을 고쳤을 때)

- 대본 = `video/src/script.ts`의 `BASE_CAPTIONS`. 목소리 = Typecast 준성 `tc_66e26710ac44cf7c7ebfdb71`, model ssfm-v30, normal, seed 42, mp3.
- Typecast TTS는 컨테이너 IP에서 403(UNUSUAL_ACTIVITY)이 나서 **세준 컴퓨터 셸**에서 호출한다(키는 환경변수로만, 레포에 넣지 않음).
  클립은 `C:\Users\UESR\Downloads\narration\NN.mp3` → 컨테이너 `video/public/narration/NN.mp3`(gitignore).
  데모 구간 13~19번은 tempo 1.12 (45초 캡처 안에 들어가야 해서). 나머지 1.0.
- 그다음 `cd video && python3 tools/make_tts.py manifest && python3 tools/retime.py` → `src/timing.json`(씬 길이·워프·자막 시각), `src/narration.json`.
  씬은 자막 구간별로 필요한 만큼만 늘어난다(줄진 않음). 데모 구간은 45초 고정이라 넘치면 경고가 뜬다 → tempo를 올려 다시.
- 효과음은 `tools/make_sfx.py`(numpy 합성, `public/sfx/`), 큐는 `src/audio.tsx`(설계 시각 기준, mapTime으로 자동 이동).
- 렌더는 `--concurrency=2` (4는 크롬이 죽음). v3 기준 음량: 내레이션 약 -16 LUFS, 패드는 그보다 15~20 dB 아래, 피크 -2.8 dBFS.

## 결정 기록

- 탐지는 오프라인 JSON, 판단·문장은 실시간 — Vercel에 GPU 없음, 심사위원이 설치 없이 열어야 함.
- 모든 층 에스컬레이터·엘리베이터는 경로에서 제외(안내문 "사용 금지"와 일치시킴).
- 위험 없는 층 사람은 위험 층에 발 들이지 않음(2층 사람을 3층 출구로 올려보내는 경로가 나와서 추가).
- 영상은 AE 대신 Remotion 코드 렌더 — 세준 컴퓨터 연결 없이 Claude가 끝까지 만들 수 있어서.
- 가점(후보작 구현 5점)은 포기 — 후보작 13건에 다중이용시설 안전 주제 없음.
- 실제 사건 영상·사진·피의자 이름은 어디에도 쓰지 않음.
