'use strict';

const CADAYA_ZONE_CENTER = { lat: 3.425, lon: -76.525 };
const CADAYA_ZONE_ROTATION = 11 * Math.PI / 180;
const CADAYA_KM_LAT = 111.32;
const CADAYA_KM_LON = 111.32 * Math.cos(CADAYA_ZONE_CENTER.lat * Math.PI / 180);

Object.assign(zoneColors, {
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
});

const cadayaDowntown = [
    [-76.5440, 3.4380], [-76.5440, 3.4580], [-76.5170, 3.4580],
    [-76.5130, 3.4440], [-76.5220, 3.4350], [-76.5400, 3.4350]
];

function cadayaPointInPolygon(lon, lat, polygon) {
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

function cadayaLocal(lat, lon) {
    const north = (lat - CADAYA_ZONE_CENTER.lat) * CADAYA_KM_LAT;
    const east = (lon - CADAYA_ZONE_CENTER.lon) * CADAYA_KM_LON;
    const cos = Math.cos(CADAYA_ZONE_ROTATION);
    const sin = Math.sin(CADAYA_ZONE_ROTATION);
    return {
        along: north * cos + east * sin,
        cross: east * cos - north * sin
    };
}

function cadayaZoneByCoordinates(lat, lon) {
    if (lat < 3.30 || lat > 3.52 || lon < -76.61 || lon > -76.44) return 'Fuera de Cali';
    if (cadayaPointInPolygon(lon, lat, cadayaDowntown)) return 'Centro Histórico y Comercial';

    const { along, cross } = cadayaLocal(lat, lon);
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
    return cross > 2.0 ? 'Expansión Sur' : 'Extremo Sur/Pance';
}

function cadayaZoneOverride(row, automaticZone) {
    const finalFromFile = cleanValue(row['Zona final mapa']);
    if (finalFromFile) return finalFromFile;

    const nit = cleanValue(row.NIT);
    const establishment = normalizeText(row.Establecimiento);
    const branch = cleanValue(row.Sucursal, '01');
    if (nit === '70693426' && establishment === 'VARIEDADES CANINAS' && branch === '01') {
        return 'Noroccidente';
    }
    return automaticZone;
}

mapRow = function mapRowUsingCoordinateZone(row, index) {
    const lat = parseCoordinate(row['Latitud completa cbll']);
    const lon = parseCoordinate(row['Longitud completa cbll']);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        state.dataWarnings.push(`Fila ${index + 2}: coordenadas inválidas`);
        return null;
    }

    const commune = extractCommune(row['Comuna Lupap']);
    const seller = cleanValue(row.Vendedor, 'SIN VENDEDOR');
    const automaticZone = cadayaZoneByCoordinates(lat, lon);
    const zone = cadayaZoneOverride(row, automaticZone);
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
        zone,
        lat,
        lon,
        phone: cleanValue(row.Celular),
        email: cleanValue(row.Correo),
        type: cleanValue(row.Tipo, 'Sin clasificar')
    };

    client.searchText = normalizeText([
        client.establishment, client.nit, client.address, client.neighborhood,
        client.contact, client.phone, client.type, client.zone
    ].join(' '));
    return client;
};

popupHtml = function popupWithZone(client) {
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
                <b>Zona</b><span><strong>${escapeHtml(client.zone)}</strong></span>
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
