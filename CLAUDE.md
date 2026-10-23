# two_unifications — 주제31 이탈리아·독일의 통일 비교

2학년 세계사 수업용 개별 웹앱(정적 파일, 빌드 없음). 두 통일 과정을 비교해 쓰는 활동.
배포: https://hyonnie-t.github.io/two_unifications/ (GitHub Pages). 저장소는 public이다.

## 구조
- `index.html` / `app.js` / `data.js` / `logic.js`(판정 로직) / `glossary.js` / `style.css`
- `draft_guard.js`, `focus_guard.js`, 검증은 `node verify.mjs`
- 활동 id: `CONFIG.GAME_NAME` = `31차시_이탈리아_독일_통일` (커리큘럼 id와 글자까지 같아야 한다)

## 규칙
- 백엔드는 `history26_backend`의 기존 action을 쓴다. 새 저장소를 만들지 않는다.
- 글 복사 앱이면 마무리 화면에 패들렛 열기 버튼(`padletBtn`)이 있어야 한다. 배포 전 `copyBtn`과 함께 확인한다.
- 태블릿 대응이 기본이다(768x1024, 1180x820 확인). 쓰기 문항은 시점을 못박는다(①은 2011년 시점).
- URL·ID·토큰을 새로 적지 않는다. 푸시는 작업 브랜치에만, `main` 병합은 효니가 한다.
- 수정·배포 뒤에는 배포 주소를 내장 브라우저로 직접 열어 확인한 다음 보고한다.
