'use strict';

const OFFICIAL_FEATURE_SERVICE = 'https://geoportal.cali.gov.co/agserver/rest/services/IDESC/dapm_capas_base_202309281633/FeatureServer';
const ESRI_LEAFLET_URL = 'https://unpkg.com/esri-leaflet@3.0.15/dist/esri-leaflet.js';

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
    'Barrios oficiales · IDESC': officialNeighborhoodLayer,
    'Comunas oficiales · IDESC': officialCommuneLayer,
    'Macrozonas comerciales · Cadaya': commercialMacroZoneLayer
}, {
    position: 'topright',
    collapsed: true
}).addTo(map);

function loadExternalScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (window.L?.esri?.featureLayer) {
            resolve();
            return;
        }

        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', reject, { once: true });
        document.head.appendChild(script);
    });
}

function updateLayerStatus(message, warning = false) {
    const status = document.getElementById('mapStatus');
    if (!status) return;
    status.innerHTML = `<span class="status-dot${warning ? ' status-dot-warning' : ''}"></span><span>${message}</span>`;
}

function bindOfficialTooltip(layer, text) {
    if (!layer || !text) return;
    layer.bindTooltip(text, {
        sticky: true,
        direction: 'top',
        className: 'official-layer-tooltip'
    });
}

function initializeOfficialFeatureLayers() {
    const neighborhoods = L.esri.featureLayer({
        url: `${OFFICIAL_FEATURE_SERVICE}/3`,
        where: '1=1',
        simplifyFactor: 0.35,
        precision: 5,
        minZoom: 11,
        style: () => ({
            color: '#2563a9',
            weight: 1.15,
            opacity: 0.92,
            fillColor: '#2563a9',
            fillOpacity: 0.018
        })
    });

    neighborhoods.on('createfeature', event => {
        const properties = event.feature?.properties || {};
        const comuna = properties.comuna ? ` · Comuna ${properties.comuna}` : '';
        bindOfficialTooltip(event.layer, `${properties.barrio || 'Barrio'}${comuna}`);
    });
    neighborhoods.on('requesterror', event => {
        console.warn('Error al cargar barrios oficiales.', event);
        if (map.hasLayer(officialNeighborhoodLayer)) {
            updateLayerStatus('La capa oficial de barrios no respondió. Los puntos comerciales siguen disponibles.', true);
        }
    });
    neighborhoods.addTo(officialNeighborhoodLayer);

    const communes = L.esri.featureLayer({
        url: `${OFFICIAL_FEATURE_SERVICE}/2`,
        where: '1=1',
        simplifyFactor: 0.2,
        precision: 5,
        minZoom: 10,
        style: () => ({
            color: '#c8102e',
            weight: 2.1,
            opacity: 0.9,
            fillColor: '#c8102e',
            fillOpacity: 0.025
        })
    });

    communes.on('createfeature', event => {
        const properties = event.feature?.properties || {};
        bindOfficialTooltip(event.layer, `Comuna ${properties.comuna || properties.nombre || ''}`.trim());
    });
    communes.on('requesterror', event => {
        console.warn('Error al cargar comunas oficiales.', event);
        if (map.hasLayer(officialCommuneLayer)) {
            updateLayerStatus('La capa oficial de comunas no respondió. Los puntos comerciales siguen disponibles.', true);
        }
    });
    communes.addTo(officialCommuneLayer);
}

loadExternalScriptOnce(ESRI_LEAFLET_URL)
    .then(initializeOfficialFeatureLayers)
    .catch(error => {
        console.warn('No fue posible iniciar las capas oficiales vectoriales.', error);
        officialNeighborhoodLayer._cadayaUnavailable = true;
        officialCommuneLayer._cadayaUnavailable = true;
    });

function convexHull(points) {
    if (points.length <= 2) return points;
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (origin, a, b) =>
        (a[0] - origin[0]) * (b[1] - origin[1])
        - (a[1] - origin[1]) * (b[0] - origin[0]);

    const lower = [];
    sorted.forEach(point => {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    });

    const upper = [];
    [...sorted].reverse().forEach(point => {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    });

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function refreshMacroZoneLayer(clients = []) {
    commercialMacroZoneLayer.clearLayers();
    const grouped = clients.reduce((acc, client) => {
        const name = client.macroZone || 'Sin macrozona';
        (acc[name] ||= []).push(client);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, items]) => {
        const color = macroZoneColors[name] || '#68707d';
        const hull = convexHull(items.map(client => [client.lon, client.lat]));

        let shape;
        if (hull.length >= 3) {
            shape = L.polygon(hull.map(([lon, lat]) => [lat, lon]), {
                color,
                weight: 2,
                opacity: 0.85,
                fillColor: color,
                fillOpacity: 0.075,
                interactive: true
            });
        } else {
            shape = L.circle([items[0].lat, items[0].lon], {
                radius: 750,
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.075
            });
        }

        shape.bindTooltip(
            `<strong>${escapeHtml(name)}</strong><br>${items.length.toLocaleString('es-CO')} punto(s)`,
            { sticky: true, className: 'macrozone-tooltip' }
        );
        shape.addTo(commercialMacroZoneLayer);
    });
}

window.refreshMacroZoneLayer = refreshMacroZoneLayer;
window.CADAYA_MAP_LAYERS = {
    neighborhoods: officialNeighborhoodLayer,
    communes: officialCommuneLayer,
    macroZones: commercialMacroZoneLayer,
    control: mapLayerControl
};
