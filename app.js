const YEAR_RANGE = [1984, 2018];

const dom = {
  riverCount: document.querySelector("#river-count"),
  riverTitle: document.querySelector("#river-title"),
  riverSubtitle: document.querySelector("#river-subtitle"),
  metricFlux: document.querySelector("#metric-flux"),
  metricTrend: document.querySelector("#metric-trend"),
  metricArea: document.querySelector("#metric-area"),
  metricImages: document.querySelector("#metric-images"),
  detailList: document.querySelector("#detail-list"),
  seriesCount: document.querySelector("#series-count"),
  search: document.querySelector("#river-search"),
  trendFilter: document.querySelector("#trend-filter"),
  resetView: document.querySelector("#reset-view"),
};

const formatNumber = (value, digits = 3) => {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
};

const formatFlux = (value) => {
  if (value == null || Number.isNaN(value)) return "-";
  return `${formatNumber(value, 4)} Tg yr-1`;
};

const formatArea = (value) => {
  if (value == null || Number.isNaN(value)) return "-";
  return `${formatNumber(value, 0)} km2`;
};

const formatSlope = (value) => {
  if (value == null || Number.isNaN(value)) return "-";
  return formatNumber(value, 6);
};

const trendColor = (trend) => {
  if (trend === "increasing") return "#c46b3d";
  if (trend === "decreasing") return "#1b7f79";
  return "#576f68";
};

let state = {
  map: null,
  markers: null,
  chart: null,
  pointIndex: new Map(),
  timeseries: {},
  selectedId: null,
  allFeatures: [],
};

const createChart = () => {
  const ctx = document.querySelector("#timeseries-chart");
  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "POC flux",
          data: [],
          borderColor: "#0f5e5a",
          backgroundColor: "rgba(15, 94, 90, 0.16)",
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.15,
          spanGaps: false,
        },
      ],
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `POC flux: ${formatFlux(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
          grid: {
            color: "rgba(20, 44, 42, 0.08)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Tg yr-1",
          },
          grid: {
            color: "rgba(20, 44, 42, 0.08)",
          },
        },
      },
    },
  });
};

const initMap = () => {
  state.map = L.map("map", {
    preferCanvas: true,
    worldCopyJump: true,
    zoomSnap: 0.25,
  }).setView([15, 0], 2);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 7,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    }
  ).addTo(state.map);
};

const buildPopupHtml = (props) => `
  <div class="map-popup">
    <h4>River mouth ${props.ID}</h4>
    <p>${props.continent}</p>
    <p>Mean flux: ${formatFlux(props.ave_flux)}</p>
    <p>Trend: <strong style="color:${trendColor(props.trend)}">${props.trend}</strong></p>
  </div>
`;

const markerStyle = (props, selected = false) => ({
  radius: selected ? 7.5 : 4.8,
  fillColor: trendColor(props.trend),
  color: selected ? "#f4f1e8" : "rgba(255,255,255,0.5)",
  weight: selected ? 1.8 : 0.6,
  opacity: 1,
  fillOpacity: selected ? 0.95 : 0.82,
});

const renderMarkers = (trendFilter = "all") => {
  if (state.markers) state.markers.remove();
  state.markers = L.geoJSON(
    {
      type: "FeatureCollection",
      features: state.allFeatures.filter((feature) =>
        trendFilter === "all" ? true : feature.properties.trend === trendFilter
      ),
    },
    {
      pointToLayer(feature, latlng) {
        const isSelected = state.selectedId === feature.properties.ID;
        return L.circleMarker(latlng, markerStyle(feature.properties, isSelected));
      },
      onEachFeature(feature, layer) {
        layer.bindPopup(buildPopupHtml(feature.properties));
        layer.on("click", () => selectRiver(feature.properties.ID, true));
      },
    }
  ).addTo(state.map);
};

const updateDetails = (props) => {
  const rows = [
    ["ID", props.ID],
    ["Continent", props.continent],
    ["Mean width", `${formatNumber(props.width_mean, 0)} m`],
    ["Upstream area", formatArea(props.uparea)],
    ["Slope", formatSlope(props.slope)],
    ["Strahler order", props.ord_stra],
    ["Optical water type", props.OWT],
    ["Trend (MC)", props.trend],
    ["Trend (deterministic)", props.trend2],
  ];
  dom.detailList.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div><dt>${label}</dt><dd>${value ?? "-"}</dd></div>`
    )
    .join("");
};

const updateMetrics = (props, series) => {
  dom.metricFlux.textContent = formatFlux(props.ave_flux);
  dom.metricTrend.textContent = props.trend;
  dom.metricTrend.style.color = trendColor(props.trend);
  dom.metricArea.textContent = formatArea(props.uparea);
  dom.metricImages.textContent = formatNumber(props.image_num, 0);
  dom.seriesCount.textContent = `${series.valid_count} valid years`;
};

const updateChart = (series) => {
  const values = series.values.map((value) => (value == null ? null : Number(value)));
  const validValues = values.filter((value) => value != null && Number.isFinite(value));
  const maxValue = validValues.length ? Math.max(...validValues) : 0;
  const yMax = maxValue > 0 ? maxValue * 1.1 : 1;

  state.chart.data.labels = series.years;
  state.chart.data.datasets[0].data = values;
  state.chart.options.scales.y.min = 0;
  state.chart.options.scales.y.max = yMax;
  state.chart.update();
};

const refreshSelectedMarkerStyle = () => {
  if (!state.markers) return;
  state.markers.eachLayer((layer) => {
    const props = layer.feature.properties;
    layer.setStyle(markerStyle(props, props.ID === state.selectedId));
  });
};

function selectRiver(id, flyTo = false) {
  const feature = state.pointIndex.get(Number(id));
  if (!feature) return;
  const series = state.timeseries[String(id)];
  if (!series) return;

  state.selectedId = Number(id);
  const props = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;

  dom.riverTitle.textContent = `River mouth ${props.ID}`;
  dom.riverSubtitle.textContent = `${props.continent} | ${YEAR_RANGE[0]}-${YEAR_RANGE[1]} annual POC flux record`;

  updateMetrics(props, series);
  updateDetails(props);
  updateChart(series);
  refreshSelectedMarkerStyle();

  if (flyTo) {
    state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 4), {
      duration: 0.7,
    });
  }
}

const handleSearch = () => {
  const value = Number(dom.search.value);
  if (!Number.isFinite(value)) return;
  selectRiver(value, true);
};

const loadData = async () => {
  let points;
  let timeseries;
  let summary;

  if (window.__POC_DATA__) {
    ({ riverPoints: points, timeseries, summary } = window.__POC_DATA__);
  } else {
    const [pointsRes, tsRes, summaryRes] = await Promise.all([
      fetch("./data/river_points.geojson"),
      fetch("./data/poc_timeseries.json"),
      fetch("./data/summary.json"),
    ]);
    points = await pointsRes.json();
    timeseries = await tsRes.json();
    summary = await summaryRes.json();
  }

  state.allFeatures = points.features;
  state.timeseries = timeseries;
  state.pointIndex = new Map(points.features.map((feature) => [feature.properties.ID, feature]));
  dom.riverCount.textContent = `${summary.river_count.toLocaleString("en-US")} rivers`;

  renderMarkers();
  selectRiver(points.features[0].properties.ID, false);
};

const wireEvents = () => {
  dom.search.addEventListener("change", handleSearch);
  dom.search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleSearch();
  });
  dom.trendFilter.addEventListener("change", () => {
    renderMarkers(dom.trendFilter.value);
    refreshSelectedMarkerStyle();
  });
  dom.resetView.addEventListener("click", () => {
    state.map.setView([15, 0], 2);
  });
};

const boot = async () => {
  initMap();
  createChart();
  wireEvents();
  await loadData();
};

boot().catch((error) => {
  console.error(error);
  dom.riverTitle.textContent = "Data failed to load";
  dom.riverSubtitle.textContent = "Please serve the folder through a local or static web server.";
});
