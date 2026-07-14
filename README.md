# 대구·경북 도자공방 3D 연구지도

대구·경북의 도자공방, 미술관, 주요 관광지점 입장객 통계를 한 화면에서 탐색하는 인터랙티브 문화생태 연구지도입니다.

**공개 웹사이트:** https://daegu-gyeongbuk-ceramics-map.joyof15.chatgpt.site

## 주요 기능

- 실제 GeoJSON 행정경계에 기반한 3D 회전·확대 지도
- 도자공방 84개와 미술관 20개 표시
- 2024년 주요 관광지점 입장객을 붉은 농도와 높이로 시각화
- 주요 산과 낙동강·금호강·형산강 등 하천 레이어
- 시설·지역 검색, 레이어 전환, 지역별 상세 패널
- 데스크톱·태블릿·모바일 반응형 화면

## 연구 질문

> 왜 도자공방은 문경·경주에 집중되는가? 그 집중은 미술관·관광과 어떻게 연결되거나 단절되는가?

## 데이터와 주의사항

- 공방 84개, 미술관 20개
- 관광지식정보시스템의 2024년 주요관광지점 입장객 통계
- 공개 South Korea Maps GeoJSON 행정경계
- 시설 위치는 시·군·구 대표점 기반 연구용 추정 좌표
- 관광객 수는 지역의 고유 방문객 총량이 아니라 관광지점별 입장객 합계

## 실행

Node.js 22 이상을 권장합니다.

```bash
npm install
npm run dev
```

## 핵심 파일

- `app/page.tsx`: 지도와 연구 인터페이스
- `app/globals.css`: 시각 디자인과 반응형 레이아웃
- `public/data/map-data.json`: 지도 경계·시설·관광 데이터

## 자료 출처

- [관광지식정보시스템](https://know.tour.go.kr/stat/visitStatDis/report.do)
- [South Korea Maps GeoJSON](https://github.com/southkorea/southkorea-maps)
- [SGIS 행정구역 통계 및 경계](https://www.data.go.kr/data/15129688/fileData.do)

