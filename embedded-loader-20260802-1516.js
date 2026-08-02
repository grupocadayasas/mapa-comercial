'use strict';

async function loadEmbeddedDataFallback() {
    const encoded = String(window.CADAYA_EMBEDDED_B64 || '').replace(/\s+/g, '');
    if (!encoded) throw new Error('No se encontró la base integrada de respaldo.');
    if (encoded.length < 1000 || encoded.length % 4 !== 0) {
        throw new Error(`La base integrada está incompleta (${encoded.length} caracteres).`);
    }

    const compressed = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const csvText = pako.ungzip(compressed, { to: 'string' });
    const parsed = Papa.parse(csvText, {
        header: true,
        delimiter: ';',
        skipEmptyLines: 'greedy',
        transformHeader: header => header.replace(/^\uFEFF/, '').trim()
    });
    if (parsed.errors.length) console.warn('Advertencias al leer la base integrada:', parsed.errors);
    return parsed.data;
}

function normalizeDirectCsvRows(rows) {
    return rows.map(row => ({
        ...row,
        'Comuna Lupap': row['Comuna Lupap'] || row.Comuna || '',
        'Zona final mapa': row['Zona final mapa'] || row['Zona / Subzona'] || row.Zona || '',
        Celular: row.Celular || row['Celular '] || row.Telefono || row['Teléfono'] || ''
    }));
}

async function loadPublishedCsv() {
    const filename = 'Mapa-Comercial.csv';
    const response = await fetch(`${filename}?actualizacion=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);

    const csvText = await response.text();
    if (!csvText || /<!doctype|<html/i.test(csvText)) {
        throw new Error(`${filename}: contenido inválido`);
    }

    const parsed = Papa.parse(csvText, {
        header: true,
        delimiter: ';',
        skipEmptyLines: 'greedy',
        transformHeader: header => header.replace(/^\uFEFF/, '').trim()
    });
    if (parsed.errors.length) console.warn(`Advertencias al leer ${filename}:`, parsed.errors);
    if (!parsed.data.length) throw new Error(`${filename}: el archivo está vacío`);

    const rows = normalizeDirectCsvRows(parsed.data);
    const required = [
        'Vendedor', 'NIT', 'Establecimiento', 'Sucursal',
        'Dirección estandarizada', 'Barrio', 'Comuna Lupap',
        'Latitud completa cbll', 'Longitud completa cbll',
        'Tipo', 'Zona final mapa', 'Macrozona'
    ];
    const missing = required.filter(header => !(header in rows[0]));
    if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}`);
    return rows;
}

function installClients(rows) {
    state.dataWarnings = [];
    state.clients = rows.map(mapRow).filter(Boolean);
    if (!state.clients.length) throw new Error('La base no contiene coordenadas válidas.');

    state.sellerColors = {};
    const sellers = [...new Set(state.clients.map(client => client.seller))]
        .sort((a, b) => a.localeCompare(b, 'es'));
    sellers.forEach((seller, index) => {
        state.sellerColors[seller] = sellerPalette[index % sellerPalette.length];
    });

    state.clients.forEach(client => {
        client.marker = L.marker([client.lat, client.lon], {
            icon: createMarkerIcon(getSellerColor(client.seller)),
            title: client.establishment
        });
        client.marker.bindPopup(popupHtml(client), {
            maxWidth: 360,
            autoPan: true,
            keepInView: false,
            autoPanPaddingTopLeft: L.point(26, 26),
            autoPanPaddingBottomRight: L.point(26, 26)
        });
    });

    populateFilters();
    state.dataReady = true;
    dom.loginButton.disabled = false;
    dom.loginButton.textContent = 'Ingresar';
    dom.loginMessage.classList.remove('error');
    restoreSession();
}

loadData = async function loadCommercialDataFromCsv() {
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Leyendo Mapa-Comercial.csv…';

    try {
        let rows;
        let source;
        try {
            rows = await loadPublishedCsv();
            source = 'Mapa-Comercial.csv';
        } catch (csvError) {
            console.warn('No fue posible usar Mapa-Comercial.csv; se usa el respaldo integrado.', csvError);
            rows = await loadEmbeddedDataFallback();
            source = 'respaldo integrado';
        }

        installClients(rows);
        const omitted = state.dataWarnings.length
            ? ` · ${state.dataWarnings.length} fila(s) omitida(s)`
            : '';
        dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles${omitted}. Fuente: ${source}.`;
    } catch (error) {
        console.error('Carga de la base comercial:', error);
        state.dataReady = false;
        dom.loginMessage.classList.add('error');
        dom.loginMessage.textContent = `No fue posible iniciar la base comercial. ${error?.message || ''}`;
        dom.loginButton.disabled = false;
        dom.loginButton.textContent = 'Reintentar carga';
        dom.loginButton.onclick = event => {
            event.preventDefault();
            loadData();
        };
        const loader = dom.mapLoading?.querySelector('.loader-card');
        if (loader) loader.textContent = 'No fue posible cargar los datos.';
    }
};
