'use strict';

/**
 * Zonificación comercial detallada de Santiago de Cali.
 *
 * La asignación se calcula con la coordenada real del establecimiento,
 * usando un sistema local rotado para seguir el eje urbano norte-sur de Cali.
 * Es una capa operativa de Grupo Cadaya y no reemplaza límites administrativos.
 */

const CADAYA_ZONE_VERSION = '2026.08.02-1';
const CADAYA_ZONE_CENTER = { lat: 3.425, lon: -76.525 };
const CADAYA_ZONE_ROTATION = 11 * Math.PI / 180;
const CADAYA_KM_LAT = 111.32;
const CADAYA_KM_LON = 111.32 * Math.cos(CADAYA_ZONE_CENTER.lat * Math.PI / 180);

const commercialZoneColors = {
    'Extremo Norte': '#0d47a1',
    'Noroccidente': '#5e35b1',
    'Norte': '#1565c0',
    'Nororiente': '#00838f',
    'Occidente/Ladera': '#6d4c41',
    'Centro-Occidente': '#8d6e63',
    'Centro Histórico y Comercial': '#c62828',
    'Centro Geográfico': '#2e7d32',
    'Centro-Oriente': '#558b2f',
    'Oriente': '#ef6c00',
    'Suroccidente': '#8e24aa',
    'Centro-Sur': '#7b1fa2',
    'Sur': '#ad1457',
    'Suroriente': '#d84315',
    'Extremo Sur/Pance': '#283593',
    'Expansión Sur': '#00695c',
    'Fuera de Cali': '#616161'
};

Object.assign(zoneColors, commercialZoneColors);

const downtownPolygon = [
    [-76.5440, 3.4380],
    [-76.5440, 3.4580],
    [-76.5170, 3.4580],
    [-76.5130, 3.4440],
    [-76.5220, 3.4350],
    [-76.5400, 3.4350]
];

function pointInPolygon(lon, lat, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersects = ((yi > lat) !== (yj > lat))
            && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

function toLocalCoordinates(lat, lon) {
    const north = (lat - CADAYA_ZONE_CENTER.lat) * CADAYA_KM_LAT;
    const east = (lon - CADAYA_ZONE_CENTER.lon) * CADAYA_KM_LON;
    const cos = Math.cos(CADAYA_ZONE_ROTATION);
    const sin = Math.sin(CADAYA_ZONE_ROTATION);

    return {
        along: north * cos + east * sin,
        cross: east * cos - north * sin
    };
}

function fromLocalCoordinates(along, cross) {
    const cos = Math.cos(CADAYA_ZONE_ROTATION);
    const sin = Math.sin(CADAYA_ZONE_ROTATION);
    const north = along * cos - cross * sin;
    const east = along * sin + cross * cos;

    return [
        CADAYA_ZONE_CENTER.lat + north / CADAYA_KM_LAT,
        CADAYA_ZONE_CENTER.lon + east / CADAYA_KM_LON
    ];
}

function classifyDetailedZone(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Fuera de Cali';
    if (lat < 3.30 || lat > 3.52 || lon < -76.61 || lon > -76.44) return 'Fuera de Cali';
    if (pointInPolygon(lon, lat, downtownPolygon)) return 'Centro Histórico y Comercial';

    const { along, cross } = toLocalCoordinates(lat, lon);

    if (along >= 7.4) {
        if (cross < -2.3) return 'Noroccidente';
        if (cross > 2.2) return 'Nororiente';
        return 'Extremo Norte';
    }

    if (along >= 4.0) {
        if (cross < -2.5) return 'Noroccidente';
        if (cross > 2.0) return 'Nororiente';
        return 'Norte';
    }

    if (along >= 1.8) {
        if (cross < -3.0) return 'Occidente/Ladera';
        if (cross < -1.2) return 'Centro-Occidente';
        if (cross > 4.2) return 'Oriente';
        if (cross > 1.5) return 'Nororiente';
        return 'Centro Geográfico';
    }

    if (along >= -1.5) {
        if (cross < -3.0) return 'Occidente/Ladera';
        if (cross < -1.2) return 'Centro-Occidente';
        if (cross > 4.0) return 'Oriente';
        if (cross > 1.5) return 'Centro-Oriente';
        return 'Centro Geográfico';
    }

    if (along >= -4.0) {
        if (cross < -2.5) return 'Suroccidente';
        if (cross > 2.0) return 'Suroriente';
        return 'Centro-Sur';
    }

    if (along >= -8.5) {
        if (cross < -2.5) return 'Suroccidente';
        if (cross > 2.0) return 'Suroriente';
        return 'Sur';
    }

    if (cross > 2.0) return 'Expansión Sur';
    return 'Extremo Sur/Pance';
}

function classifyMacroZone(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Sin clasificación';
    if (pointInPolygon(lon, lat, downtownPolygon)) return 'Centro Histórico y Comercial';

    const { along, cross } = toLocalCoordinates(lat, lon);
    if (along >= 4.0) return 'Norte';
    if (cross <= -3.0) return 'Occidente';
    if (along < -1.5) return 'Sur';
    if (cross >= 4.0 || (cross >= 2.0 && along < 1.8)) return 'Oriente';
    return 'Centro Geográfico';
}

function zoneValidationStatus(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Coordenada inválida';
    const { along, cross } = toLocalCoordinates(lat, lon);
    const alongLimits = [-8.5, -4.0, -1.5, 1.8, 4.0, 7.4];
    const crossLimits = [-3.0, -2.5, -2.3, -1.2, 1.5, 2.0, 2.2, 4.0, 4.2];
    const distance = Math.min(
        ...alongLimits.map(value => Math.abs(along - value)),
        ...crossLimits.map(value => Math.abs(cross - value))
    );

    return distance < 0.25
        ? 'Cerca del límite de zona'
        : 'Validada por coordenada';
}

function classifyCaliLocation(lat, lon) {
    return {
        detailedZone: classifyDetailedZone(lat, lon),
        macroZone: classifyMacroZone(lat, lon),
        validation: zoneValidationStatus(lat, lon),
        version: CADAYA_ZONE_VERSION
    };
}

mapRow = function mapRowByCoordinates(row, index) {
    const lat = parseCoordinate(row['Latitud completa cbll']);
    const lon = parseCoordinate(row['Longitud completa cbll']);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        state.dataWarnings.push(`Fila ${index + 2}: coordenadas inválidas`);
        return null;
    }

    const commune = extractCommune(row['Comuna Lupap']);
    const seller = cleanValue(row.Vendedor, 'SIN VENDEDOR');
    const zoneData = classifyCaliLocation(lat, lon);
    const client = {
        id: `${cleanValue(row.NIT)}-${cleanValue(row.Sucursal)}-${index}`,
        seller,
        nit: cleanValue(row.NIT, 'Sin información'),
        establishment: cleanValue(row.Establecimiento, 'Establecimiento sin nombre'),
        contact: cleanValue(row['Persona De contacto']),
        branch: cleanValue(row.Sucursal, '01'),
        address: cleanValue(row['Dirección estandarizada'], 'Sin dirección'),
        neighborhood: cleanValue(row.Barrio, 'Sin barrio'),
        commune,
        zone: zoneData.detailedZone,
        macroZone: zoneData.macroZone,
        zoneValidation: zoneData.validation,
        zoneVersion: zoneData.version,
        lat,
        lon,
        phone: cleanValue(row.Celular),
        email: cleanValue(row.Correo),
        type: cleanValue(row.Tipo, 'Sin clasificar')
    };

    client.searchText = normalizeText([
        client.establishment,
        client.nit,
        client.address,
        client.neighborhood,
        client.contact,
        client.phone,
        client.type,
        client.zone,
        client.macroZone
    ].join(' '));

    return client;
};

popupHtml = function popupWithGeographicValidation(client) {
    const phone = safePhone(client.phone);
    const email = isUsefulEmail(client.email) ? client.email : '';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.lat},${client.lon}`)}`;
    const whatsappUrl = phone ? `https://wa.me/57${phone.replace(/^57/, '')}` : '';

    return `
        <article class="popup-card">
            <span class="popup-badge">${escapeHtml(client.type)}</span>
            <h3>${escapeHtml(client.establishment)}</h3>
            <div class="popup-grid">
                <b>Vendedor</b><span>${escapeHtml(formatSellerName(client.seller))}</span>
                <b>NIT</b><span>${escapeHtml(client.nit)}</span>
                <b>Sucursal</b><span>${escapeHtml(client.branch)}</span>
                <b>Dirección</b><span>${escapeHtml(client.address)}</span>
                <b>Barrio</b><span>${escapeHtml(client.neighborhood)}</span>
                <b>Comuna</b><span>${client.commune ? `Comuna ${client.commune}` : 'Sin información'}</span>
                <b>Zona detallada</b><span><strong>${escapeHtml(client.zone)}</strong></span>
                <b>Zona general</b><span>${escapeHtml(client.macroZone)}</span>
                <b>Validación</b><span>${escapeHtml(client.zoneValidation)}</span>
                <b>Contacto</b><span>${escapeHtml(client.contact || 'Sin información')}</span>
                <b>Celular</b><span>${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(client.phone)}</a>` : 'Sin información'}</span>
                <b>Correo</b><span>${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : 'Sin información'}</span>
            </div>
            <div class="popup-actions">
                <a href="${mapsUrl}" target="_blank" rel="noopener">Abrir ruta</a>
                ${whatsappUrl ? `<a class="secondary" href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>` : '<span></span>'}
            </div>
        </article>`;
};

function buildZoneReferenceLayer() {
    const alongBreaks = [-13, -8.5, -4.0, -1.5, 1.8, 4.0, 7.4, 10];
    const crossBreaks = [-8, -4.2, -3.0, -2.5, -2.3, -1.2, 1.5, 2.0, 2.2, 4.0, 4.2, 8];
    const layer = L.layerGroup();

    for (let a = 0; a < alongBreaks.length - 1; a += 1) {
        for (let c = 0; c < crossBreaks.length - 1; c += 1) {
            const a0 = alongBreaks[a];
            const a1 = alongBreaks[a + 1];
            const c0 = crossBreaks[c];
            const c1 = crossBreaks[c + 1];
            const center = fromLocalCoordinates((a0 + a1) / 2, (c0 + c1) / 2);
            const zone = classifyDetailedZone(center[0], center[1]);
            const corners = [
                fromLocalCoordinates(a0, c0),
                fromLocalCoordinates(a0, c1),
                fromLocalCoordinates(a1, c1),
                fromLocalCoordinates(a1, c0)
            ];

            L.polygon(corners, {
                color: commercialZoneColors[zone] || '#616161',
                weight: 0.7,
                opacity: 0.65,
                fillColor: commercialZoneColors[zone] || '#616161',
                fillOpacity: 0.075,
                interactive: true
            }).bindTooltip(zone, { sticky: true }).addTo(layer);
        }
    }

    L.polygon(downtownPolygon.map(([lon, lat]) => [lat, lon]), {
        color: commercialZoneColors['Centro Histórico y Comercial'],
        weight: 1.5,
        opacity: 0.9,
        fillColor: commercialZoneColors['Centro Histórico y Comercial'],
        fillOpacity: 0.12
    }).bindTooltip('Centro Histórico y Comercial', { sticky: true }).addTo(layer);

    return layer;
}

const cadayaZoneLayer = buildZoneReferenceLayer();

const ZoneLayerControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar cadaya-zone-control');
        const button = L.DomUtil.create('button', '', container);
        button.type = 'button';
        button.title = 'Mostrar u ocultar zonas comerciales';
        button.setAttribute('aria-label', 'Mostrar u ocultar zonas comerciales');
        button.textContent = 'Zonas';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, 'click', () => {
            if (map.hasLayer(cadayaZoneLayer)) {
                map.removeLayer(cadayaZoneLayer);
                button.classList.remove('active');
            } else {
                cadayaZoneLayer.addTo(map);
                button.classList.add('active');
            }
        });
        return container;
    }
});

new ZoneLayerControl().addTo(map);
