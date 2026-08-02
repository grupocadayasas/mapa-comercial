'use strict';

const IDESC_WMS_URL = 'https://ws-idesc.cali.gov.co/geoserver/idesc/wms';

const officialNeighborhoodLayer = L.tileLayer.wms(IDESC_WMS_URL, {
    layers: 'idesc:mc_barrios',
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    opacity: 0.58,
    tiled: true,
    attribution: 'Barrios: IDESC Cali'
});

const officialCommuneLayer = L.tileLayer.wms(IDESC_WMS_URL, {
    layers: 'idesc:mc_comunas',
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    opacity: 0.62,
    tiled: true,
    attribution: 'Comunas: IDESC Cali'
});

const commercialMacroZoneLayer = L.layerGroup();
const macroZoneColors = {
    'Norte': '#1565c0',
    'Centro': '#c62828',
    'Occidente': '#6d4c41',
    'Oriente': '#ef6c00',
    'Sur': '#8e24aa',
    'Sin macrozona': '#68707d'
};

const mapLayerControl = L.control.layers(null, {
    'Barrios oficiales · IDESC': officialNeighborhoodLayer,
    'Comunas oficiales · IDESC': officialCommuneLayer,
    'Macrozonas comerciales · Cadaya': commercialMacroZoneLayer
}, {
    position: 'topright',
    collapsed: window.innerWidth <= 920
}).addTo(map);

function convexHull(points) {
    if (points.length <= 2) return points;
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (origin, a, b) => (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
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

function refreshMacroZoneLayer(clients = []) {
    commercialMacroZoneLayer.clearLayers();
    const grouped = clients.reduce((acc, client) => {
        const name = client.macroZone || 'Sin macrozona';
        (acc[name] ||= []).push(client);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([name, items]) => {
        const color = macroZoneColors[name] || '#68707d';
        const lonLatPoints = items.map(client => [client.lon, client.lat]);
        const hull = convexHull(lonLatPoints);

        let shape;
        if (hull.length >= 3) {
            shape = L.polygon(hull.map(([lon, lat]) => [lat, lon]), {
                color,
                weight: 2,
                opacity: 0.88,
                fillColor: color,
                fillOpacity: 0.09,
                interactive: true
            });
        } else {
            const center = [items[0].lat, items[0].lon];
            shape = L.circle(center, {
                radius: 900,
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.09
            });
        }

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
    control: mapLayerControl
};
