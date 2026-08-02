'use strict';

function readCadayaTextFrame(path, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const frame = document.createElement('iframe');
        let finished = false;
        const timer = window.setTimeout(() => finish(new Error(`${path}: tiempo de espera agotado`)), timeoutMs);

        function cleanup() {
            window.clearTimeout(timer);
            frame.remove();
        }

        function finish(error, value) {
            if (finished) return;
            finished = true;
            cleanup();
            if (error) reject(error); else resolve(value);
        }

        frame.hidden = true;
        frame.setAttribute('aria-hidden', 'true');
        frame.onload = () => {
            try {
                const text = frame.contentDocument?.body?.innerText || frame.contentDocument?.documentElement?.textContent || '';
                if (!text.trim()) throw new Error(`${path}: contenido vacío`);
                finish(null, text.trim());
            } catch (error) {
                finish(error);
            }
        };
        frame.onerror = () => finish(new Error(`${path}: no fue posible abrir el archivo`));
        frame.src = path;
        document.body.appendChild(frame);
    });
}

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

loadData = async function loadCadayaWithoutFetch() {
    dom.loginButton.disabled = true;
    dom.loginButton.textContent = 'Cargando datos…';
    dom.loginButton.onclick = null;
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Cargando la base comercial…';

    try {
        let encoded = '';

        if (Array.isArray(window.CADAYA_B64_PARTS) && window.CADAYA_B64_PARTS.length === 4) {
            encoded = window.CADAYA_B64_PARTS.join('');
        } else {
            const [part1, part2] = await Promise.all([
                readCadayaTextFrame('clientes_cali.1.b64'),
                readCadayaTextFrame('clientes_cali.2.b64')
            ]);
            encoded = part1 + part2;
        }

        const csvText = await gunzipCadayaBase64(encoded);
        const rows = parseCadayaCsv(csvText);
        initializeCadayaClients(rows);
    } catch (error) {
        console.error('Carga comercial sin fetch:', error);
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
