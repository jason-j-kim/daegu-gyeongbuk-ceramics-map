"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Coordinates = [number, number];
type Geometry =
  | { type: "Polygon"; coordinates: Coordinates[][] }
  | { type: "MultiPolygon"; coordinates: Coordinates[][][] };
type Tourism = { domestic: number; foreign: number; total: number; foreignShare: string };
type Region = { key: string; province: string; name: string; tourism: Tourism | null; geometry: Geometry; centroid: Coordinates };
type Facility = {
  id: string;
  type: "workshop" | "museum";
  area: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  specialty?: string | null;
  source?: string | null;
  person?: string | null;
  ownership?: string | null;
  opened?: string | null;
  hours?: string | null;
  admission?: string | null;
  website?: string | null;
  coordinates: Coordinates;
  coordinateQuality: string;
};
type MapData = {
  meta: { workshopCount: number; museumCount: number; tourismYear: number; dataCollected: string; coordinateNotice: string };
  regions: Region[];
  workshops: Facility[];
  museums: Facility[];
  mountains: { name: string; coordinates: Coordinates; height: number }[];
  rivers: { name: string; coordinates: Coordinates[] }[];
  sources: { label: string; detail?: string; url?: string }[];
};

const W = 850;
const H = 720;

function project([lon, lat]: Coordinates): Coordinates {
  if (lon > 130) return [775 + (lon - 130.75) * 42, 92 - (lat - 37.48) * 68];
  return [44 + ((lon - 127.55) / 2.1) * 760, 684 - ((lat - 35.42) / 1.78) * 626];
}

function geometryPath(geometry: Geometry) {
  const polygonPath = (rings: Coordinates[][]) =>
    rings
      .map((ring) =>
        ring
          .map((point, i) => {
            const [x, y] = project(point);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ") + " Z",
      )
      .join(" ");
  if (geometry.type === "Polygon") return polygonPath(geometry.coordinates);
  return geometry.coordinates.map((polygon: Coordinates[][]) => polygonPath(polygon)).join(" ");
}

function linePath(points: Coordinates[]) {
  return points
    .map((point, i) => {
      const [x, y] = project(point);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const nf = new Intl.NumberFormat("ko-KR");
const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

function heatColor(total?: number) {
  if (!total) return "rgba(236,230,218,.78)";
  const min = Math.log(27000);
  const max = Math.log(9800000);
  const t = Math.max(0, Math.min(1, (Math.log(total) - min) / (max - min)));
  const hue = 16 - t * 11;
  const light = 79 - t * 40;
  return `hsl(${hue} 78% ${light}%)`;
}

function heatHeight(total?: number) {
  if (!total) return 0;
  return 10 + Math.max(0, Math.min(1, Math.log10(total / 27000) / 2.58)) * 76;
}

function AppMark() {
  return (
    <span className="app-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<MapData | null>(null);
  const [selectedArea, setSelectedArea] = useState("경북 문경시");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [query, setQuery] = useState("");
  const [layers, setLayers] = useState({ workshops: true, museums: true, mountains: true, rivers: true, tourism: true });
  const [view, setView] = useState({ pitch: 52, yaw: -4, zoom: 0.91 });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, yaw: -4, pitch: 52 });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/map-data.json`)
      .then((r) => r.json())
      .then(setData);
  }, []);

  const facilities = useMemo(() => (data ? [...data.workshops, ...data.museums] : []), [data]);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalizedQuery) return facilities;
    return facilities.filter((f) => [f.name, f.area, f.address, f.specialty, f.person].some((v) => v?.toLowerCase().includes(normalizedQuery)));
  }, [facilities, normalizedQuery]);
  const visibleIds = useMemo(() => new Set(matches.map((f) => f.id)), [matches]);

  const area = data?.regions.find((r) => r.key === selectedArea) ?? null;
  const areaFacilities = facilities.filter((f) => f.area === selectedArea);
  const areaWorkshops = areaFacilities.filter((f) => f.type === "workshop");
  const areaMuseums = areaFacilities.filter((f) => f.type === "museum");
  const rankings = useMemo(
    () => [...(data?.regions ?? [])].filter((r) => r.tourism).sort((a, b) => (b.tourism?.total ?? 0) - (a.tourism?.total ?? 0)).slice(0, 6),
    [data],
  );

  function toggleLayer(key: keyof typeof layers) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectFacility(facility: Facility) {
    setSelectedFacility(facility);
    setSelectedArea(facility.area);
    setQuery(facility.name);
  }

  if (!data) {
    return (
      <main className="loading-screen">
        <AppMark />
        <p>도자문화 지형을 불러오는 중</p>
      </main>
    );
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="대구 경북 도자공방 연구지도 홈">
          <AppMark />
          <span>
            <b>CLAYSCAPE</b>
            <small>DAEGU · GYEONGBUK</small>
          </span>
        </a>
        <div className="project-title">
          <span className="eyebrow">CULTURAL ECOLOGY RESEARCH MAP · 01</span>
          <h1>대구·경북 도자공방 문화생태 지도</h1>
        </div>
        <div className="header-meta">
          <span><i className="status-dot" /> 데이터 기준 {data.meta.dataCollected}</span>
          <button type="button" onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}>연구 설계 보기 ↘</button>
        </div>
      </header>

      <section id="top" className="atlas-grid">
        <aside className="left-panel panel">
          <div className="panel-heading">
            <span className="index">01</span>
            <div><small>DATA LAYERS</small><h2>지도 레이어</h2></div>
          </div>

          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="공방·미술관·지역 검색"
              aria-label="공방 미술관 지역 검색"
            />
            {query && <button type="button" onClick={() => { setQuery(""); setSelectedFacility(null); }} aria-label="검색어 지우기">×</button>}
          </label>

          {normalizedQuery && (
            <div className="search-results" role="listbox" aria-label="검색 결과">
              <div className="results-count">{matches.length}개 결과</div>
              {matches.slice(0, 5).map((f) => (
                <button key={f.id} type="button" onClick={() => selectFacility(f)}>
                  <i className={f.type} />
                  <span><b>{f.name}</b><small>{f.area}</small></span>
                </button>
              ))}
            </div>
          )}

          <div className="layer-list">
            <button type="button" className={layers.workshops ? "active" : ""} onClick={() => toggleLayer("workshops")} aria-pressed={layers.workshops}>
              <span className="layer-symbol workshop-symbol">●</span><span><b>도자공방</b><small>84개 시설</small></span><em>{layers.workshops ? "ON" : "OFF"}</em>
            </button>
            <button type="button" className={layers.museums ? "active" : ""} onClick={() => toggleLayer("museums")} aria-pressed={layers.museums}>
              <span className="layer-symbol museum-symbol">◆</span><span><b>미술관</b><small>20개 기관</small></span><em>{layers.museums ? "ON" : "OFF"}</em>
            </button>
            <button type="button" className={layers.tourism ? "active" : ""} onClick={() => toggleLayer("tourism")} aria-pressed={layers.tourism}>
              <span className="layer-symbol heat-symbol" /><span><b>관광객 밀도</b><small>2024년 입장객</small></span><em>{layers.tourism ? "ON" : "OFF"}</em>
            </button>
            <button type="button" className={layers.mountains ? "active" : ""} onClick={() => toggleLayer("mountains")} aria-pressed={layers.mountains}>
              <span className="layer-symbol mountain-symbol">▲</span><span><b>주요 산</b><small>대표 봉우리</small></span><em>{layers.mountains ? "ON" : "OFF"}</em>
            </button>
            <button type="button" className={layers.rivers ? "active" : ""} onClick={() => toggleLayer("rivers")} aria-pressed={layers.rivers}>
              <span className="layer-symbol river-symbol">〰</span><span><b>주요 하천</b><small>낙동강 수계</small></span><em>{layers.rivers ? "ON" : "OFF"}</em>
            </button>
          </div>

          <div className="heat-legend">
            <div><span>관광객 밀도</span><small>LOG SCALE</small></div>
            <div className="gradient" />
            <div className="legend-labels"><span>2.7만</span><span>970만</span></div>
          </div>

          <div className="data-note">
            <span>!</span>
            <p>관광객 수는 지역 총량이 아니라 <b>주요 관광지점 입장객의 합계</b>입니다.</p>
          </div>
        </aside>

        <section className="map-stage" aria-label="대구 경북 3D 문화생태 지도">
          <div className="map-kicker"><span>35°25′–37°12′ N</span><span>127°33′–129°39′ E</span></div>
          <div
            className={`map-viewport ${isDragging ? "dragging" : ""}`}
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
              setIsDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!isDragging) return;
              setView((v) => ({ ...v, yaw: drag.current.yaw + (e.clientX - drag.current.x) * 0.055, pitch: Math.max(35, Math.min(67, drag.current.pitch - (e.clientY - drag.current.y) * 0.06)) }));
            }}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
            onWheel={(e) => { e.preventDefault(); setView((v) => ({ ...v, zoom: Math.max(0.68, Math.min(1.35, v.zoom - e.deltaY * 0.0007)) })); }}
          >
            <div className="compass"><span>N</span><i /></div>
            <div className="map-shadow" />
            <svg
              className="map-world"
              viewBox={`0 0 ${W} ${H}`}
              style={{ transform: `perspective(1200px) rotateX(${view.pitch}deg) rotateZ(${view.yaw}deg) scale(${view.zoom})` }}
              role="img"
              aria-label="관광객 밀도와 시설 분포를 표시한 대구 경북 지도"
            >
              <defs>
                <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#482319" floodOpacity=".28" /></filter>
                <filter id="river-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2" /></filter>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#8c887d" strokeOpacity=".1" strokeWidth=".65" /></pattern>
              </defs>
              <rect x="0" y="0" width={W} height={H} fill="url(#grid)" rx="24" />

              <g className="terrain-base" transform="translate(0 10)">
                {data.regions.map((region) => <path key={`base-${region.key}`} d={geometryPath(region.geometry)} />)}
              </g>
              <g className="regions">
                {data.regions.map((region) => {
                  const active = selectedArea === region.key;
                  const fill = layers.tourism ? heatColor(region.tourism?.total) : "#d8d2c3";
                  return (
                    <path
                      key={region.key}
                      d={geometryPath(region.geometry)}
                      fill={fill}
                      className={active ? "region active" : "region"}
                      onClick={(e) => { e.stopPropagation(); setSelectedArea(region.key); setSelectedFacility(null); }}
                    >
                      <title>{region.key} · 관광객 {region.tourism ? nf.format(region.tourism.total) + "명" : "자료 없음"}</title>
                    </path>
                  );
                })}
              </g>

              {layers.rivers && (
                <g className="rivers">
                  {data.rivers.map((river) => (
                    <g key={river.name}>
                      <path className="river-glow" d={linePath(river.coordinates)} />
                      <path d={linePath(river.coordinates)} />
                      <text x={project(river.coordinates[Math.floor(river.coordinates.length / 2)])[0]} y={project(river.coordinates[Math.floor(river.coordinates.length / 2)])[1] - 7}>{river.name}</text>
                    </g>
                  ))}
                </g>
              )}

              {layers.tourism && (
                <g className="tourism-columns">
                  {data.regions.filter((r) => r.tourism).map((region) => {
                    const [x, y] = project(region.centroid);
                    const height = heatHeight(region.tourism?.total);
                    return (
                      <g key={`tour-${region.key}`} className={selectedArea === region.key ? "active" : ""} onClick={(e) => { e.stopPropagation(); setSelectedArea(region.key); }}>
                        <line x1={x} y1={y} x2={x} y2={y - height} />
                        <circle cx={x} cy={y - height} r={selectedArea === region.key ? 6 : 4} />
                        {selectedArea === region.key && <text x={x + 10} y={y - height - 2}>{compact.format(region.tourism?.total ?? 0)}명</text>}
                      </g>
                    );
                  })}
                </g>
              )}

              {layers.mountains && (
                <g className="mountains">
                  {data.mountains.map((mountain) => {
                    const [x, y] = project(mountain.coordinates);
                    return (
                      <g key={mountain.name} transform={`translate(${x} ${y})`}>
                        <path d="M0,-18 L-12,8 L12,8 Z" />
                        <path className="snow" d="M0,-18 L-4,-9 L0,-11 L4,-9 Z" />
                        <text x="15" y="-5">{mountain.name}</text>
                      </g>
                    );
                  })}
                </g>
              )}

              <g className="facility-markers">
                {facilities.map((facility) => {
                  if (!visibleIds.has(facility.id)) return null;
                  if (facility.type === "workshop" && !layers.workshops) return null;
                  if (facility.type === "museum" && !layers.museums) return null;
                  const [x, y] = project(facility.coordinates);
                  const selected = selectedFacility?.id === facility.id;
                  return facility.type === "workshop" ? (
                    <circle key={facility.id} cx={x} cy={y} r={selected ? 7 : 3.4} className={selected ? "workshop active" : "workshop"} onClick={(e) => { e.stopPropagation(); selectFacility(facility); }}>
                      <title>{facility.name} · {facility.area}</title>
                    </circle>
                  ) : (
                    <rect key={facility.id} x={x - (selected ? 6 : 4)} y={y - (selected ? 6 : 4)} width={selected ? 12 : 8} height={selected ? 12 : 8} rx="1" className={selected ? "museum active" : "museum"} transform={`rotate(45 ${x} ${y})`} onClick={(e) => { e.stopPropagation(); selectFacility(facility); }}>
                      <title>{facility.name} · {facility.area}</title>
                    </rect>
                  );
                })}
              </g>
            </svg>
          </div>

          <div className="map-controls" aria-label="지도 보기 조절">
            <button type="button" onClick={() => setView((v) => ({ ...v, zoom: Math.min(1.35, v.zoom + .1) }))} aria-label="확대">＋</button>
            <button type="button" onClick={() => setView((v) => ({ ...v, zoom: Math.max(.68, v.zoom - .1) }))} aria-label="축소">−</button>
            <button type="button" onClick={() => setView({ pitch: 52, yaw: -4, zoom: .91 })} aria-label="지도 보기 초기화">↺</button>
          </div>
          <div className="interaction-hint"><span>↔</span> 드래그하여 회전 · 스크롤하여 확대</div>
          <div className="map-caption"><span>FIG. 01</span><p>붉은 지형은 관광지점 입장객의 상대적 밀도, 수직선은 로그 변환된 규모를 나타낸다.</p></div>
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading">
            <span className="index">02</span>
            <div><small>PLACE PROFILE</small><h2>지역 프로필</h2></div>
          </div>

          <div className="place-heading">
            <small>{area?.province === "대구" ? "DAEGU METROPOLITAN CITY" : "GYEONGSANGBUK-DO"}</small>
            <h3>{area?.name ?? selectedArea}</h3>
            <span className="coordinate">{area ? `${area.centroid[1].toFixed(3)}°N · ${area.centroid[0].toFixed(3)}°E` : ""}</span>
          </div>

          <div className="metric-grid">
            <div className="metric featured"><span>2024 관광지점 입장객</span><strong>{area?.tourism ? compact.format(area.tourism.total) : "—"}</strong><small>{area?.tourism ? `${nf.format(area.tourism.total)}명` : "집계 자료 없음"}</small></div>
            <div className="metric"><span>도자공방</span><strong>{areaWorkshops.length}</strong><small>전체의 {Math.round((areaWorkshops.length / data.meta.workshopCount) * 100)}%</small></div>
            <div className="metric"><span>미술관</span><strong>{areaMuseums.length}</strong><small>{areaMuseums.length ? "문화 인프라 확인" : "목록 자료 없음"}</small></div>
          </div>

          {selectedFacility ? (
            <article className="facility-card">
              <div className="facility-type"><i className={selectedFacility.type} />{selectedFacility.type === "workshop" ? "도자공방" : "미술관"}</div>
              <h4>{selectedFacility.name}</h4>
              <p>{selectedFacility.specialty || "전문 분야 정보 확인 중"}</p>
              <dl>
                {selectedFacility.person && <><dt>대표</dt><dd>{selectedFacility.person}</dd></>}
                {selectedFacility.ownership && <><dt>유형</dt><dd>{selectedFacility.ownership}</dd></>}
                {selectedFacility.address && <><dt>주소</dt><dd>{selectedFacility.address}</dd></>}
                {selectedFacility.phone && <><dt>연락처</dt><dd>{selectedFacility.phone}</dd></>}
              </dl>
              <div className="quality-tag">△ {selectedFacility.coordinateQuality}</div>
            </article>
          ) : (
            <div className="area-facilities">
              <div className="subhead"><span>지역 시설</span><small>{areaFacilities.length} PLACES</small></div>
              <div className="facility-list">
                {areaFacilities.slice(0, 7).map((f) => (
                  <button key={f.id} type="button" onClick={() => selectFacility(f)}>
                    <i className={f.type} /><span><b>{f.name}</b><small>{f.specialty || f.ownership || "상세 정보 보기"}</small></span><em>↗</em>
                  </button>
                ))}
                {!areaFacilities.length && <p className="empty">현재 통합 데이터에 등록된 시설이 없습니다.</p>}
              </div>
            </div>
          )}

          <div className="ranking">
            <div className="subhead"><span>관광객 상위 지역</span><small>2024</small></div>
            {rankings.map((r, i) => (
              <button key={r.key} type="button" className={selectedArea === r.key ? "active" : ""} onClick={() => { setSelectedArea(r.key); setSelectedFacility(null); }}>
                <span className="rank">{String(i + 1).padStart(2, "0")}</span><b>{r.key}</b><em>{compact.format(r.tourism?.total ?? 0)}</em>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="research-strip" aria-label="프로젝트 핵심 지표">
        <div><span>84</span><p>수집 공방<small>분석 레코드 기준</small></p></div>
        <div><span>20</span><p>미술관<small>공립·사립·대학</small></p></div>
        <div><span>37</span><p>문경시 공방<small>전체의 44%</small></p></div>
        <div><span>12</span><p>경주시 공방<small>관광 최대 지역</small></p></div>
        <p className="core-question">왜 도자공방은 <b>문경·경주에 집중</b>되는가? 그 집중은 미술관·관광과 연결되는가?</p>
      </section>

      <section id="method" className="method-section">
        <div className="method-intro">
          <span className="eyebrow">RESEARCH FRAME · 2026</span>
          <h2>공방의 위치를 넘어<br />문화생태계의 구조를 읽는다.</h2>
          <p>이 지도는 공방의 점 분포, 문화시설의 연결망, 관광 흐름의 강도를 한 화면에 겹쳐 보여주는 탐색적 연구 도구다.</p>
        </div>
        <div className="method-cards">
          <article><span>01</span><h3>공간 집중</h3><p>문경·경주의 높은 집적이 원료, 전승, 시장, 정책 중 무엇에서 비롯되는지 검토한다.</p></article>
          <article><span>02</span><h3>문화 연결</h3><p>공방과 미술관·박물관·축제 사이의 지리적 근접성이 실제 협력관계로 이어지는지 묻는다.</p></article>
          <article><span>03</span><h3>관광 전환</h3><p>관광객 규모가 공방 생존과 체험·판매 기회로 전환되는 조건과 단절 지점을 찾는다.</p></article>
        </div>
      </section>

      <section className="source-section" aria-label="데이터 출처와 해석 주의사항">
        <div>
          <span className="eyebrow">DATA PROVENANCE</span>
          <h2>자료 출처와<br />해석의 경계</h2>
        </div>
        <div className="source-list">
          {data.sources.map((source, i) => (
            <a key={source.label} href={source.url || "#top"} target={source.url ? "_blank" : undefined} rel={source.url ? "noreferrer" : undefined}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{source.label}</b>
              <small>{source.detail || "원자료 설명 보기"}</small>
              <em>{source.url ? "↗" : "DATA"}</em>
            </a>
          ))}
        </div>
        <aside>
          <b>좌표 정확도</b>
          <p>{data.meta.coordinateNotice}</p>
          <b>관광객 통계</b>
          <p>주요관광지점의 입장객을 합산한 값으로, 해당 시군구를 방문한 고유 관광객 수나 관광 총량과 동일하지 않다.</p>
        </aside>
      </section>

      <footer className="footer">
        <div><AppMark /><span><b>CLAYSCAPE</b><small>대구·경북 도자공방 연구 프로젝트</small></span></div>
        <p>연구용 프로토타입 · 시설 좌표는 시군구 대표점 기반 추정</p>
        <a href="#top">처음으로 ↑</a>
      </footer>
    </main>
  );
}
