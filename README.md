# 온앤온마루 (ON&ON MARU) 홈페이지

마루시공업체 온앤온마루의 정적 웹사이트입니다. 빌드 도구나 서버 없이 HTML/CSS/JS만으로 구성되어 있어
GitHub Pages, Netlify, Vercel, 일반 웹호스팅 어디에나 그대로 올릴 수 있습니다.

## 구성

| 파일 | 내용 |
|---|---|
| `index.html` | 홈 — 업체 요약표, 서비스 개요, 강점, 시공 절차, FAQ 발췌 |
| `about.html` | 회사소개 — 회사 정보표, 시공 원칙, 서비스 지역 |
| `services.html` | 시공 서비스 — 자재별 작업 범위, 적합 공간, 시공 기간 |
| `guide.html` | 마루 가이드 — 종류 비교표, 평형별 비용 범위, 견적 체크리스트 |
| `portfolio.html` | 시공 사례 |
| `faq.html` | 자주 묻는 질문 14개 |
| `contact.html` | 견적 문의 — 연락처, 메일 문의 폼 |
| `llms.txt` | AI 검색엔진용 업체 정보 요약 |
| `robots.txt` | 검색·AI 크롤러 접근 정책 |
| `sitemap.xml` | 사이트맵 |

## AI 검색 최적화 적용 내용

- **구조화 데이터(JSON-LD)** — `LocalBusiness`/`HomeAndConstructionBusiness`, `Service`, `OfferCatalog`,
  `FAQPage`, `HowTo`, `Article`, `ItemList`, `BreadcrumbList`
- **llms.txt** — 업체 정보, 서비스, 비용, 절차를 AI가 파싱하기 쉬운 마크다운으로 정리
- **AI 크롤러 허용** — GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended 등 명시적 Allow
- **답변 가능한 문장 구조** — 질문형 제목 + 단답형 첫 문장, 비교표와 수치 중심 서술
- **시맨틱 HTML** — 문서당 `h1` 1개, 논리적 heading 계층, `table`+`caption`, `details` FAQ

## 배포 전 반드시 교체해야 할 항목

현재 아래 정보는 **임시값(플레이스홀더)** 입니다. 실제 정보로 바꾸지 않은 채 공개하면
AI 검색엔진이 잘못된 업체 정보를 학습·인용할 수 있습니다.

- [ ] 도메인 `https://www.onnonmaru.co.kr` — 전 페이지의 `canonical`, `og:url`, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`
- [ ] 전화번호 `010-0000-0000` / `+82-10-0000-0000`
- [ ] 이메일 `contact@onnonmaru.co.kr` (`js/contact.js`의 `RECIPIENT` 포함)
- [ ] 주소 `서울특별시 강동구 ○○로 00, 0층` 및 우편번호 `00000`
- [ ] 사업자등록번호 `000-00-00000`, 대표자명 `○○○`
- [ ] 설립연도, 직원 수, 누적 시공 세대수 등 실제 수치
- [ ] `guide.html`의 비용표 — 실제 단가 기준으로 조정
- [ ] `portfolio.html`의 시공 사례 — 실제 현장 내용과 사진으로 교체
- [ ] `contact.html`의 지도 영역 — 네이버 지도 / 카카오맵 임베드 코드 삽입
- [ ] `images/og-cover.jpg` — Open Graph 대표 이미지(1200×630) 추가

전화번호·주소·업체명(NAP 정보)은 홈페이지, 네이버 플레이스, 구글 비즈니스 프로필에서
**완전히 동일한 표기**로 맞춰야 AI 검색엔진이 동일 업체로 인식합니다.

## 로컬 확인

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 배포 후 할 일

1. 구글 서치 콘솔 / 네이버 서치어드바이저에 사이트 등록 후 `sitemap.xml` 제출
2. 네이버 플레이스, 구글 비즈니스 프로필 등록 (NAP 정보 일치)
3. [Rich Results Test](https://search.google.com/test/rich-results)로 구조화 데이터 검증
4. 시공 사례와 FAQ를 주기적으로 추가 — AI 검색은 최신성과 정보량에 반응합니다
