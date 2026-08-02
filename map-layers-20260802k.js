'use strict';

const OFFICIAL_FEATURE_SERVICE = 'https://geoportal.cali.gov.co/agserver/rest/services/IDESC/dapm_capas_base_202309281633/FeatureServer';

const macroZoneColors = {
    'Norte': '#1565c0',
    'Centro': '#c62828',
    'Occidente': '#6d4c41',
    'Oriente': '#ef6c00',
    'Sur': '#8e24aa',
    'Sin macrozona': '#68707d'
};

const officialNeighborhoodLayer = L.layerGroup();
const officialCommuneLayer = L.layerGroup();
const commercialMacroZoneLayer = L.layerGroup();

const mapLayerControl = L.control.layers(null, {
    'Barrios · IDESC / respaldo Cadaya': officialNeighborhoodLayer,
    'Comunas · IDESC / respaldo Cadaya': officialCommuneLayer,
    'Macrozonas comerciales · Cadaya': commercialMacroZoneLayer
}, {
    position: 'topright',
    collapsed: true
}).addTo(map);

const layerLoadState = {
    neighborhoods: 'idle',
    communes: 'idle'
};

function updateLayerStatus(message, warning = false) {
    const status = document.getElementById('mapStatus');
    if (!status) return;
    status.innerHTML = `<span class="status-dot${warning ? ' status-dot-warning' : ''}"></span><span>${message}</span>`;
}

function convexHull(points) {
    const unique = [...new Map(points.map(point => [`${point[0].toFixed(7)}:${point[1].toFixed(7)}`, point])).values()];
    if (unique.length <= 2) return unique;
    const sorted = [...unique].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (origin, a, b) =>
        (a[0] - origin[0]) * (b[1] - origin[1])
        - (a[1] - origin[1]) * (b[0] - origin[0]);

    const lower = [];
    sorted.forEach(point => {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
        lower.push(point);
    });

    const upper = [];
    [...sorted].reverse().forEach(point => {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
        upper.push(point);
    });

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function waitForClients(timeout = 8000) {
    return new Promise(resolve => {
        const started = Date.now();
        const check = () => {
            if (window.state?.clients?.length || (typeof state !== 'undefined' && state.clients?.length)) {
                resolve(typeof state !== 'undefined' ? state.clients : window.state.clients);
                return;
            }
            if (Date.now() - started >= timeout) {
                resolve([]);
                return;
            }
            setTimeout(check, 120);
        };
        check();
    });
}

function createCoverageShape(items, options) {
    const points = items.map(item => [item.lon, item.lat]);
    const hull = convexHull(points);
    const color = options.color;

    if (hull.length >= 3) {
        return L.polygon(hull.map(([lon, lat]) => [lat, lon]), {
            color,
            weight: options.weight,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: options.fillOpacity,
            smoothFactor: 1.2
        });
    }

    const centerLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
    const centerLon = items.reduce((sum, item) => sum + item.lon, 0) / items.length;
    return L.circle([centerLat, centerLon], {
        radius: options.radius,
        color,
        weight: options.weight,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: options.fillOpacity
    });
}

async function buildNeighborhoodFallback() {
    const clients = await waitForClients();
    officialNeighborhoodLayer.clearLayers();
    if (!clients.length) return;

    const grouped = clients.reduce((acc, client) => {
        const name = client.neighborhood || 'Sin barrio';
        (acc[name] ||= []).push(client);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, items]) => {
        const shape = createCoverageShape(items, {
            color: '#2563a9',
            weight: 1.25,
            fillOpacity: 0.035,
            radius: 290
        });
        const communes = [...new Set(items.map(item => item.commune).filter(Boolean))]
            .map(value => `Comuna ${value}`)
            .join(', ');
        shape.bindTooltip(
            `<strong>${escapeHtml(name)}</strong>${communes ? `<br>${escapeHtml(communes)}` : ''}<br><small>Cobertura aproximada según clientes Cadaya</small>`,
            { sticky: true, className: 'official-layer-tooltip' }
        );
        shape.addTo(officialNeighborhoodLayer);
    });

    layerLoadState.neighborhoods = 'fallback';
    updateLayerStatus('Barrios visibles mediante cobertura aproximada de los clientes Cadaya.', true);
}

async function buildCommuneFallback() {
    const clients = await waitForClients();
    officialCommuneLayer.clearLayers();
    if (!clients.length) return;

    const grouped = clients.reduce((acc, client) => {
        const name = client.commune ? `Comuna ${client.commune}` : 'Sin comuna';
        (acc[name] ||= []).push(client);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, items]) => {
        const shape = createCoverageShape(items, {
            color: '#c8102e',
            weight: 2.1,
            fillOpacity: 0.025,
            radius: 780
        });
        shape.bindTooltip(
            `<strong>${escapeHtml(name)}</strong><br><small>Cobertura aproximada según clientes Cadaya</small>`,
            { sticky: true, className: 'official-layer-tooltip' }
        );
        shape.addTo(officialCommuneLayer);
    });

    layerLoadState.communes = 'fallback';
    updateLayerStatus('Comunas visibles mediante cobertura aproximada de los clientes Cadaya.', true);
}

async function fetchOfficialGeoJson(layerNumber, fields) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const params = new URLSearchParams({
        where: '1=1',
        outFields: fields,
        returnGeometry: 'true',
        outSR: '4326',
        f: 'geojson'
    });

    try {
        const response = await fetch(`${OFFICIAL_FEATURE_SERVICE}/${layerNumber}/query?${params.toString()}`, {
            mode: 'cors',
            cache: 'force-cache',
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const geojson = await response.json();
        if (!geojson?.features?.length) throw new Error('La capa no devolvió polígonos.');
        return geojson;
    } finally {
        clearTimeout(timeout);
    }
}

async function ensureNeighborhoodLayer() {
    if (layerLoadState.neighborhoods !== 'idle') return;
    layerLoadState.neighborhoods = 'loading';
    updateLayerStatus('Cargando capa de barrios…');

    try {
        const geojson = await fetchOfficialGeoJson(3, 'gid,id_barrio,barrio,comuna');
        officialNeighborhoodLayer.clearLayers();
        L.geoJSON(geojson, {
            style: {
                color: '#2563a9',
                weight: 1.1,
                opacity: 0.9,
                fillColor: '#2563a9',
                fillOpacity: 0.018
            },
            onEachFeature(feature, layer) {
                const properties = feature.properties || {};
                const commune = properties.comuna ? ` · Comuna ${properties.comuna}` : '';
                layer.bindTooltip(`${properties.barrio || 'Barrio'}${commune}`, {
                    sticky: true,
                    className: 'official-layer-tooltip'
                });
            }
        }).addTo(officialNeighborhoodLayer);
        layerLoadState.neighborhoods = 'official';
        updateLayerStatus('Capa oficial de barrios cargada.');
    } catch (error) {
        console.warn('No fue posible descargar barrios oficiales; se usa respaldo Cadaya.', error);
        await buildNeighborhoodFallback();
    }
}

async function ensureCommuneLayer() {
    if (layerLoadState.communes !== 'idle') return;
    layerLoadState.communes = 'loading';
    updateLayerStatus('Cargando capa de comunas…');

    try {
        const geojson = await fetchOfficialGeoJson(2, 'gid,comuna,nombre');
        officialCommuneLayer.clearLayers();
        L.geoJSON(geojson, {
            style: {
                color: '#c8102e',
                weight: 2.1,
                opacity: 0.9,
                fillColor: '#c8102e',
                fillOpacity: 0.025
            },
            onEachFeature(feature, layer) {
                const properties = feature.properties || {};
                const label = properties.comuna || properties.nombre || '';
                layer.bindTooltip(`Comuna ${label}`.trim(), {
                    sticky: true,
                    className: 'official-layer-tooltip'
                });
            }
        }).addTo(officialCommuneLayer);
        layerLoadState.communes = 'official';
        updateLayerStatus('Capa oficial de comunas cargada.');
    } catch (error) {
        console.warn('No fue posible descargar comunas oficiales; se usa respaldo Cadaya.', error);
        await buildCommuneFallback();
    }
}

map.on('overlayadd', event => {
    if (event.layer === officialNeighborhoodLayer) ensureNeighborhoodLayer();
    if (event.layer === officialCommuneLayer) ensureCommuneLayer();
});

function refreshMacroZoneLayer(clients = []) {
    commercialMacroZoneLayer.clearLayers();
    const grouped = clients.reduce((acc, client) => {
        const name = client.macroZone || 'Sin macrozona';
        (acc[name] ||= []).push(client);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, items]) => {
        const color = macroZoneColors[name] || '#68707d';
        const shape = createCoverageShape(items, {
            color,
            weight: 2,
            fillOpacity: 0.09,
            radius: 900
        });
        shape.bindTooltip(`<strong>${escapeHtml(name)}</strong><br>${items.length.toLocaleString('es-CO')} punto(s)`, {
            sticky: true,
            className: 'macrozone-tooltip'
        });
        shape.addTo(commercialMacroZoneLayer);

        const centerLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
        const centerLon = items.reduce((sum, item) => sum + item.lon, 0) / items.length;
        L.marker([centerLat, centerLon], {
            interactive: false,
            icon: L.divIcon({
                className: 'macrozone-label-wrapper',
                html: `<span class="macrozone-label" style="--macro-color:${color}">${escapeHtml(name)}</span>`,
                iconSize: [130, 28],
                iconAnchor: [65, 14]
            })
        }).addTo(commercialMacroZoneLayer);
    });
}

window.refreshMacroZoneLayer = refreshMacroZoneLayer;
window.CADAYA_MAP_LAYERS = {
    neighborhoods: officialNeighborhoodLayer,
    communes: officialCommuneLayer,
    macroZones: commercialMacroZoneLayer,
    control: mapLayerControl,
    loadNeighborhoods: ensureNeighborhoodLayer,
    loadCommunes: ensureCommuneLayer
};
