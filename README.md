# pj2_easy – Projection Distortion Visualizer

React + Vite + TailwindCSS + D3.js 기반의 Canvas 지도 시각화 프로젝트입니다. Orthographic → Mercator → EqualEarth 투영 전환 시 국가/도시/항로의 위치와 형태가 어떻게 변하는지 부드러운 애니메이션으로 보여줍니다.

## 주요 특징
- 투영 전환: From/To 투영을 독립적으로 선택하고 Orthographic, Mercator, EqualEarth, AzimuthalEquidistant 간 부드러운 보간 애니메이션
- 데이터 시각화: 국가 경계, 세계 도시 점, 항로 라인 Canvas 렌더링
- 왜곡 강조: From→To 조합(투영 비교) 혹은 지오데식 기준을 선택해 도시 이동 벡터 또는 노드 색상으로 왜곡을 표현하고, Top 5 대시보드로 수치 비교 가능
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
- 상단바 (타이틀 + 컨트롤 카드)
  - Geodesic reference (체크박스): 기본 활성화. 켜면 실제 지표 거리 기준으로 왜곡을 계산하며 From 선택은 비활성화됨.
  - From / To Projection: 기준과 비교 투영을 각각 선택하여 원하는 조합을 즉시 비교 (Orthographic, Mercator, EqualEarth, AzimuthalEquidistant 지원). Geodesic reference를 끄면 From도 활성화됨.
  - Transition(ms): 투영 전환 애니메이션 시간 조절
  - Datasets: 드롭다운에서 Countries / Cities / Shipping Lanes 개별 토글 + **City sample (All / Top100 / Top50)** 선택  
    - 인구(population) 상위 N개만 렌더링하면 왜곡 벡터/노드 색이 과도하게 겹치는 문제를 줄일 수 있음
  - Distortion display: `보라색 선분`(기본) 또는 `노드 색상` 중 선택해 왜곡 표현 방식을 전환
  - Distortion reference: `Projection 비교`(From→To) 또는 `Geodesic` 중 선택. Geodesic 선택 시 실제 지표 거리 대비 축척 오차를 계산해 색상/선 길이를 표시
- 지도 상호작용
  - 마우스 휠/드래그로 줌/팬
  - Hover
    - 국가: 국가명 표시
    - 도시: 도시명, 인구 표시
    - 항로: 항로 이름(있을 경우)
    - From ≠ To일 때 왜곡 벡터: 도시명 + Distortion Length(px) 팝업
- 하단 상태 표시: 현재 투영 이름, FPS, 범례
- From ≠ To일 때 좌측 대시보드: 선택한 두 투영 사이에서 가장 멀리 이동한 상위 5개 도시와 길이를 실시간 표시
- 우상단 정보 아이콘: 현재 Reference/Display 설정과 각 Dataset에 대한 왜곡 해석 방법을 요약해 제공

## 왜곡 시각화 설명
### 기준 Projection
- **From Projection** 이 비교 기준입니다. 기본값은 Orthographic(front)로 설정되어 있어 구면 대비 왜곡을 확인하기 쉽지만, 필요하면 Mercator→EqualEarth 등 다른 조합도 설정할 수 있습니다.
- To Projection이 Orthographic일 경우에는 앞면만 렌더링하고(뒷면 클리핑) 90° 단위 회전 / 초기화 버튼을 제공해 원하는 시점을 기준으로 다른 투영과 비교할 수 있습니다.
- **Geodesic Reference**(기본 ON): Control Panel 상단 체크박스를 통해 켜고 끕니다. 켜져 있으면 From/To 설정과 상관없이 지구 표면상의 실제 거리(`d3.geoDistance`)를 기준으로 화면상의 축척 오차를 계산합니다. 기본적으로는 To 투영의 중심에서 측정하며, AzimuthalEquidistant를 From으로 두면 중심부 거리 보존 특성도 동시에 활용할 수 있습니다.
  - ※ Geodesic 모드에서는 계산에 To 투영 중심만 사용합니다. From 투영은 UI상 선택되어 있지만 거리 비교에는 쓰이지 않아도 되며, To 투영 화면에서의 실제/평면 거리 비율만으로 왜곡을 보여 줍니다.

### 표현 방식
- **도시 왜곡 벡터 / 노드 색상**: 두 가지 reference 중 하나를 선택해 각 도시 Feature의 왜곡을 표현합니다.  
  1. **Projection 비교**: From Projection에서 To Projection으로 변환될 때 좌표가 얼마나 이동했는지 보라색 선분(또는 색상)을 통해 보여 줍니다. 선 길이는 From→To 화면 좌표 차이(px)이며, hover 시 `Distortion length(px)`를 확인할 수 있습니다.  
  2. **Geodesic 기준**: `d3.geoDistance`로 계산한 실제 지표 거리(투영 중심 기준)와 화면상의 거리 비율을 비교해, 주황색(오차 적음)→검정(오차 큼) 색상 혹은 방사형 벡터 길이(%)로 표시합니다.
  - City sample 토글을 이용하면 전체 / 상위 100 / 상위 50 도시만 골라 왜곡을 표시할 수 있어 시각적 과밀을 줄이면서 대표적인 지역에 집중할 수 있습니다.
  - 벡터 모드에서는 hover 시 `px` 또는 `%` 단위의 값을 즉시 확인할 수 있고, 좌측 대시보드는 두 모드 모두에서 선택한 reference 기준 상위 5개의 왜곡 정도를 정렬해 보여줍니다.
- **면적 색조(국가)**: 모든 투영에서 동일한 위도 기반 색(Violet↔Blue)을 유지해, Mercator가 과장하는 고위도 국가을 시각적으로 강조합니다. Orthographic/EqualEarth에서도 색이 유지되므로 사용자는 "실제 위치는 동일하지만 Mercator에서 이 정도 확대된다"는 정보를 계속 인지하게 됩니다.
- **항로 곡률 비교**: 별도 색상/벡터는 없지만, 동일한 라인 데이터를 다른 투영으로 전환할 때 나타나는 곡률/거리 변화를 통해 왜곡을 체감할 수 있습니다.

### 데이터셋별 왜곡 해석
- **Countries (Polygon)**  
  - *Orthographic*: 구면 투영이라 중심부 면적/형상이 가장 직관적입니다. 회전 기능으로 대륙별 실제 비율을 확인한 뒤 다른 투영으로 전환하면 면적 대비 과/소평가 정도를 비교할 수 있습니다.  
  - *Mercator*: 고위도 국가(캐나다 북부, 그린란드, 시베리아 등)가 화면을 크게 차지합니다. 이미 위도 기반 색이 붉은 계열로 강조되어 있어 "면적이 실제보다 크다"는 정보를 색과 크기 모두로 전달합니다.  
  - *EqualEarth*: 전 지구 면적을 균형 있게 보존하므로 Orthographic 대비 면적 비율을 거의 유지합니다. 다만 모양이 약간 눌리는 것을 통해 거리 왜곡을 확인할 수 있습니다.
- **Cities (Point)**  
  - *Orthographic*: 도시가 실제 위치 그대로 보이며 뒷면은 렌더링되지 않아 겹침을 최소화합니다.  
  - *Mercator*: 위도로 갈수록 Y값이 늘어나고, 왜곡 벡터가 길어지면서 "어디에서 어디로 밀렸는지" 즉시 확인 가능합니다. 특히 고위도 도시(레이캬비크 등)는 벡터가 화면 중앙에서 북쪽으로 길게 뻗습니다.  
  - *EqualEarth*: Mercator보다는 왜곡이 적지만, 저위도는 약간 늘어나고 중위도는 눌리는 모습을 벡터 길이로 확인할 수 있습니다. From Projection을 EqualEarth로 두고 To를 Mercator로 두면 평면 보존 투영과 해도 투영의 차이를 직접 비교할 수 있습니다.
  - *노드 색상 모드*: 벡터 대신 색상(주황→검정)으로 왜곡 크기를 표현하여, 지도가 복잡한 지역에서도 어떤 도시가 더 많이 이동했는지 한눈에 파악할 수 있습니다. Geodesic reference를 선택하면 실제 지표 거리 대비 축척 오차(%)를 그대로 색상에 반영합니다.
- **Shipping Lanes (Line)**  
  - *Orthographic*: 실제 대권항로에 가까운 곡률로 나타나며, 3D 구면에서 본 곡선이라는 점을 직감할 수 있습니다.  
  - *Mercator*: 위도로 갈수록 선이 위로 쓸려 올라가며 길이가 늘어나, 항로 길이/위치 판단이 어려워지는 것이 드러납니다.  
  - *EqualEarth*: 면적 보존 특성 덕분에 중·저위도 항로는 비교적 안정적으로 유지되지만, 극지 부근 항로는 여전히 눌리거나 휘어진 형태로 표현되어 거리 왜곡을 보여 줍니다.

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
