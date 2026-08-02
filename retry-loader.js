'use strict';

// Evita que GitHub Pages entregue fragmentos antiguos o mezclados de la base.
const cadayaNativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = function cadayaFetchWithoutStaleCache(resource, options) {
    let request = resource;
    if (typeof request === 'string' && /clientes_cali\.\d+\.b64/.test(request)) {
        const separator = request.includes('?') ? '&' : '?';
        request = `${request}${separator}cadaya=${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return cadayaNativeFetch(request, { ...options, cache: 'no-store' });
};

const cadayaOriginalLoadData = loadData;
loadData = async function cadayaLoadDataWithRetry() {
    state.dataReady = false;
    let attempt = 0;

    while (attempt < 4 && !state.dataReady) {
        attempt += 1;
        await cadayaOriginalLoadData();
        if (state.dataReady) return;

        if (attempt < 4) {
            dom.loginMessage.classList.remove('error');
            dom.loginMessage.textContent = `Reintentando carga de datos (${attempt + 1}/4)…`;
            await new Promise(resolve => window.setTimeout(resolve, attempt * 650));
        }
    }

    dom.loginButton.disabled = false;
    dom.loginButton.textContent = 'Reintentar carga';
    dom.loginButton.onclick = () => {
        dom.loginButton.disabled = true;
        dom.loginButton.textContent = 'Cargando datos…';
        dom.loginMessage.classList.remove('error');
        dom.loginMessage.textContent = 'Reintentando la carga de la base comercial.';
        loadData();
    };
};
