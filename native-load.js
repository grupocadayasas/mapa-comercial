'use strict';

loadData = async function loadCadayaDataNative() {
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginButton.onclick = null;
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Cargando y validando la base comercial…';

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const [part1, part2] = await Promise.all([
                fetchCadayaPart('clientes_cali.1.b64', attempt),
                fetchCadayaPart('clientes_cali.2.b64', attempt)
            ]);
            const csvText = await gunzipCadayaBase64(part1 + part2);
            const rows = parseCadayaCsv(csvText);
            if (!rows.length) throw new Error('La base CSV está vacía.');

            state.dataWarnings = [];
            state.clients = rows.map(mapRow).filter(Boolean);
            if (!state.clients.length) throw new Error('La base no contiene coordenadas válidas.');

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
            dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles.`;
            dom.mapLoading.querySelector('.loader-card').textContent = 'Cargando clientes y ubicaciones…';
            restoreSession();
            return;
        } catch (error) {
            lastError = error;
            console.error(`Carga Cadaya intento ${attempt}:`, error);
            if (attempt < 3) {
                dom.loginMessage.textContent = `Reintentando carga (${attempt + 1}/3)…`;
                await new Promise(resolve => setTimeout(resolve, attempt * 700));
            }
        }
    }

    state.dataReady = false;
    dom.loginMessage.classList.add('error');
    dom.loginMessage.textContent = `No fue posible cargar la base comercial. ${lastError?.message || ''}`;
    dom.loginButton.disabled = false;
    dom.loginButton.textContent = 'Reintentar carga';
    dom.loginButton.onclick = event => {
        event.preventDefault();
        loadData();
    };
    dom.mapLoading.querySelector('.loader-card').textContent = 'No fue posible cargar los datos.';
};
