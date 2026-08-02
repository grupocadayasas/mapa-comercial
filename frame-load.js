'use strict';

function initializeCadayaClients(rows) {
    const usableRows = rows.filter(row => cleanValue(row.Vendedor) && cleanValue(row.Vendedor) !== 'Vendedor');
    state.dataWarnings = [];
    state.clients = usableRows.map(mapRow).filter(Boolean);

    if (state.clients.length !== 394) {
        throw new Error(`Se esperaban 394 puntos y se obtuvieron ${state.clients.length}.`);
    }

    state.sellerColors = {};
    const sellers = [...new Set(state.clients.map(client => client.seller))].sort((a, b) => a.localeCompare(b, 'es'));
    sellers.forEach((seller, index) => { state.sellerColors[seller] = sellerPalette[index % sellerPalette.length]; });

    state.clients.forEach(client => {
        client.marker = L.marker([client.lat, client.lon], {
            icon: createMarkerIcon(getSellerColor(client.seller)),
            title: client.establishment
        });
        client.marker.bindPopup(popupHtml(client), { maxWidth: 340 });
    });

    resetCadayaFilters();
    populateFilters();
    state.dataReady = true;
    dom.loginButton.disabled = false;
    dom.loginButton.textContent = 'Ingresar';
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles.`;
    restoreSession();
}

loadData = async function loadCadayaEmbeddedData() {
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginButton.onclick = null;
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Cargando la base comercial integrada…';

    try {
        const encoded = String(window.CADAYA_BASE64_DATA || '').trim();
        if (!encoded) throw new Error('No se encontró la base comercial integrada.');

        const csvText = await gunzipCadayaBase64(encoded);
        const rows = parseCadayaCsv(csvText);
        if (!rows.length) throw new Error('La base comercial integrada está vacía.');

        initializeCadayaClients(rows);
    } catch (error) {
        console.error('Carga comercial integrada:', error);
        state.dataReady = false;
        dom.loginMessage.classList.add('error');
        dom.loginMessage.textContent = `No fue posible iniciar la base comercial. ${error?.message || ''}`;
        dom.loginButton.disabled = false;
        dom.loginButton.textContent = 'Reintentar carga';
        dom.loginButton.onclick = event => {
            event.preventDefault();
            loadData();
        };
    }
};
