'use strict';

// Carga principal: un único archivo Mapa-Comercial.csv en la raíz del repositorio.
// Si todavía no existe o tiene errores, conserva temporalmente la base integrada anterior.
const loadEmbeddedDataFallback = loadData;

loadData = async function loadDirectCsvData() {
    const filename = 'Mapa-Comercial.csv';
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = `Leyendo ${filename}…`;

    try {
        const response = await fetch(`${filename}?actualizacion=${Date.now()}`, {
            cache: 'no-store',
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const csvText = await response.text();
        if (!csvText || /<!doctype|<html/i.test(csvText)) {
            throw new Error('El contenido recibido no es un CSV válido.');
        }

        const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: 'greedy',
            transformHeader: header => header.replace(/^\uFEFF/, '').trim()
        });
        if (parsed.errors.length) console.warn('Advertencias al leer Mapa-Comercial.csv:', parsed.errors);
        if (!parsed.data.length) throw new Error('El CSV está vacío.');

        const normalizedRows = parsed.data.map(row => ({
            ...row,
            'Comuna Lupap': row['Comuna Lupap'] || row.Comuna || '',
            'Zona final mapa': row['Zona final mapa'] || row['Zona / Subzona'] || row.Zona || '',
            Celular: row.Celular || row['Celular '] || row.Telefono || row['Teléfono'] || ''
        }));

        const required = [
            'Vendedor', 'NIT', 'Establecimiento', 'Sucursal',
            'Dirección estandarizada', 'Barrio', 'Comuna Lupap',
            'Latitud completa cbll', 'Longitud completa cbll',
            'Tipo', 'Zona final mapa', 'Macrozona'
        ];
        const missing = required.filter(header => !(header in normalizedRows[0]));
        if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}`);

        state.dataWarnings = [];
        state.clients = normalizedRows.map(mapRow).filter(Boolean);
        if (!state.clients.length) throw new Error('No hay registros con coordenadas válidas.');

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
        const warningText = state.dataWarnings.length
            ? ` · ${state.dataWarnings.length} fila(s) omitida(s)`
            : '';
        dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles${warningText}.`;
        restoreSession();
    } catch (error) {
        console.warn(`No se pudo usar ${filename}; se conserva la base integrada anterior.`, error);
        await loadEmbeddedDataFallback();
        if (state.dataReady) {
            dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles. Pendiente reemplazar ${filename}.`;
        }
    }
};
