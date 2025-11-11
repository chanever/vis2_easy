# pj2_easy – Projection Distortion Visualizer

React + Vite + TailwindCSS + D3.js 기반의 Canvas 지도 시각화 프로젝트입니다. Orthographic → Mercator → EqualEarth 투영 전환 시 국가/도시/항로의 위치와 형태가 어떻게 변하는지 부드러운 애니메이션으로 보여줍니다.

## 주요 특징
- 투영 전환: Orthographic, Mercator, EqualEarth 간 부드러운 보간 애니메이션
- 데이터 시각화: 국가 경계, 세계 도시 점, 항로 라인 Canvas 렌더링
- 왜곡 강조: Mercator 선택 시 도시의 위치 변화 벡터 표시, 위도 기반 색조로 면적 왜곡 힌트
- 상호작용: 마우스 hover 툴팁(국가/도시/항로), D3 Zoom/Pan, 전환 지속시간 슬라이더
- 상태 표시: 하단에 현재 투영 이름과 FPS 출력

## 기술 스택
- React 18 + Vite 5
- D3.js v7
- TailwindCSS 3
- Canvas 렌더링 (고성능 상호작용용)

## 폴더 구조
```
pj2_easy/
 ├─ index.html
 ├─ package.json
 ├─ vite.config.js
 ├─ tailwind.config.js
 ├─ postcss.config.js
 ├─ data/                      # 개발 서버에서 /data 로 서빙됨
 │   ├─ country_boundaries.geojson
 │   ├─ shipping_lane.geojson
 │   └─ world_cities.geojson
 └─ src/
     ├─ App.jsx
     ├─ main.jsx
     ├─ index.css
     ├─ components/
     │   ├─ MapCanvas.jsx        # D3 + Canvas 렌더링
     │   ├─ ControlPanel.jsx     # 투영 선택/슬라이더
     │   ├─ Tooltip.jsx          # hover 정보
     │   └─ Legend.jsx           # 범례
     ├─ hooks/
     │   └─ useProjectionTransition.js  # 투영 보간 애니메이션
     └─ utils/
         ├─ projections.js       # D3 projection 정의/도움 함수
         ├─ drawCountries.js     # 국가 경계 그리기
         ├─ drawCities.js        # 도시 점 그리기
         └─ drawRoutes.js        # 항로 라인 그리기
```

## 사전 요구사항
- Node.js 18 이상 권장

## 설치 및 실행
```bash
npm install
npm run dev
```
- 브라우저에서 터미널에 표시되는 로컬 주소로 접속합니다.
- 개발 서버에서는 프로젝트 루트의 `./data` 폴더가 `/data` 경로로 서빙됩니다. (예: `d3.json('/data/world_cities.geojson')`)

## 빌드 및 미리보기
```bash
npm run build
npm run preview
```
- 프로덕션 배포 시 `/data` 경로에서 GeoJSON을 제공해야 합니다.
  - 방법 A: 정적 호스팅 시 `data/` 폴더를 `dist/data/`로 복사하여 함께 배포
  - 방법 B: 서버에서 `/data/*` 라우트를 `data/` 실제 파일로 매핑

## 데이터 포맷 안내
- 국가 경계: `country_boundaries.geojson` (Polygon/MultiPolygon, `properties.name` 등 국가명)
- 도시: `world_cities.geojson` (FeatureCollection, 각 Feature에 `latitude|lat`, `longitude|lon|lng`, `name|city`, `population` 필드 가정)
- 항로: `shipping_lane.geojson` (LineString/MultiLineString, `properties.name` 선택적)

필드명이 상이할 경우 `src/utils/drawCities.js` 또는 hover 로직을 조정하세요.

## 사용 방법
- 상단바
  - Projection: Orthographic / Mercator / EqualEarth 선택
  - Transition(ms): 투영 전환 애니메이션 시간 조절
- 지도 상호작용
  - 마우스 휠/드래그로 줌/팬
  - Hover
    - 국가: 국가명 표시
    - 도시: 도시명, 인구 표시
    - 항로: 항로 이름(있을 경우)
- 하단 상태 표시: 현재 투영 이름, FPS, 범례

## 왜곡 시각화 설명
- 도시 왜곡 벡터: Mercator 선택 시 각 도시에 대해 Orthographic 위치→현재 위치로의 짧은 선을 그려 위치 변화 방향/크기 가시화
- 면적 왜곡 색조: 고위도일수록 면적 확대되는 경향(단순 모델)을 위도 기반 색조로 표현 (붉은색 쪽이 확대, 푸른색 쪽이 축소 경향)

보다 정확한 면적 왜곡 계산(투영 전/후 폴리곤 면적 비율)은 추가 구현으로 확장 가능합니다.

## 주요 파일 개요
- `src/components/MapCanvas.jsx`: Canvas 렌더링, 줌/팬, hover hit-test(Path2D), 도시 왜곡 벡터
- `src/hooks/useProjectionTransition.js`: 이전/다음 투영 사이의 화면 좌표 보간(0→1) 및 진행률 관리
- `src/utils/projections.js`: 투영 정의와 보조 함수(평균 위도, 색상 매핑)
- `src/utils/draw*.js`: 국가/도시/항로를 Canvas에 효율적으로 그리는 유틸
- `vite.config.js`: 개발 서버에서 `./data`를 `/data`로 서빙하는 미들웨어 포함

## 자주 묻는 질문
- 데이터가 로드되지 않아요
  - 개발 모드: `./data` 폴더가 프로젝트 루트에 존재하는지 확인하세요. 경로는 `/data/파일명.geojson` 입니다.
  - 프로덕션: 빌드 후 `dist/data`에 복사되었는지, 또는 서버가 `/data` 라우트를 처리하는지 확인하세요.
- 도시 좌표 필드명이 다를 때
  - `src/utils/drawCities.js`의 `(longitude|lon|lng)`, `(latitude|lat)` 매핑을 수정하세요.

## 라이선스
- 내부 과제/학습용 예시. 별도 라이선스 명시 전까지 외부 공개 범위는 팀 정책을 따르세요.

