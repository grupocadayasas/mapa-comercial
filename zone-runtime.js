'use strict';

Object.assign(zoneColors, {
    'Centro': '#c62828',
    'Centro-Oriente': '#558b2f',
    'Centro-Sur': '#7b1fa2',
    'Norte': '#1565c0',
    'Norte-Oriente': '#00838f',
    'Occidente': '#6d4c41',
    'Oriente': '#ef6c00',
    'Sur': '#ad1457',
    'Sur-Occidente': '#8e24aa',
    'Sur-Oriente': '#d84315',
    'Sin zona': '#7d8794'
});

mapRow = function mapRowUsingPublishedExcel(row, index) {
    const lat = parseCoordinate(row['Latitud completa cbll']);
    const lon = parseCoordinate(row['Longitud completa cbll']);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        state.dataWarnings.push(`Fila ${index + 2}: coordenadas inválidas`);
        return null;
    }

    const commune = extractCommune(row['Comuna Lupap']);
    const seller = cleanValue(row.Vendedor, 'SIN VENDEDOR');
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
        zone: cleanValue(row['Zona final mapa'], 'Sin zona'),
        macroZone: cleanValue(row.Macrozona, 'Sin macrozona'),
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
        client.macroZone,
        client.commune ? `Comuna ${client.commune}` : ''
    ].join(' '));

    return client;
};

popupHtml = function popupUsingPublishedExcel(client) {
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
                <b>Zona / Subzona</b><span><strong>${escapeHtml(client.zone)}</strong></span>
                <b>Macrozona</b><span>${escapeHtml(client.macroZone)}</span>
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
