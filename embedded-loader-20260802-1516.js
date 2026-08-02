'use strict';

loadData = async function loadEmbeddedCommercialData() {
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Preparando la base comercial…';

    try {
        const encoded = String(window.CADAYA_EMBEDDED_B64 || '').replace(/\s+/g, '');
        if (!encoded) throw new Error('No se encontró la base integrada.');
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

        if (parsed.errors.length) console.warn('Advertencias al leer la base:', parsed.errors);

        state.dataWarnings = [];
        state.clients = parsed.data.map(mapRow).filter(Boolean);
        if (state.clients.length !== 394) {
            throw new Error(`Se esperaban 394 puntos comerciales y se obtuvieron ${state.clients.length}.`);
        }

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
            client.marker.bindPopup(popupHtml(client), { maxWidth: 360 });
        });

        populateFilters();
        state.dataReady = true;
        dom.loginButton.disabled = false;
        dom.loginButton.textContent = 'Ingresar';
        dom.loginMessage.classList.remove('error');
        dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles.`;
        restoreSession();
    } catch (error) {
        console.error('Carga de base integrada:', error);
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
