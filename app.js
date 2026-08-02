'use strict';

const DATA_FILES = ['clientes_cali.1.b64?v=20260802', 'clientes_cali.2.b64?v=20260802'];
const DEFAULT_CENTER = [3.4516, -76.5320];
const DEFAULT_ZOOM = 12;

const users = [
    { username: 'L.Arana', passwordHash: '873f3c4b39aef89074baf071d7c6412060f202cd623d76e99c441ad28f5e2174', role: 'vendedor', seller: 'ARANA LOPEZ LIZETH ASTRID', displayName: 'Lizeth Arana' },
    { username: 'L.Arenas', passwordHash: '4d148fadc791780345a412ffbe3d80ff4f3531373e4ad1e680f503eafeb3ef9b', role: 'vendedor', seller: 'ARENAS ALZATE LAUREN DANIEL', displayName: 'Lauren Arenas' },
    { username: 'C.Potes', passwordHash: '25eab5c4270474d557540e31c110a6637af54468b78daa889d24c8b08e2145eb', role: 'vendedor', seller: 'POTES LOZANO CAMILO ANDRES', displayName: 'Camilo Potes' },
    { username: 'M.Sanchez', passwordHash: '9f5d82bb21ddd9d06e7ccf66aad0bf6640d499e1363038187de83799b9ab9f9d', role: 'vendedor', seller: 'SANCHEZ CASTANEDA MARIA LIZANA', displayName: 'María Lizana Sánchez' },
    { username: 'L.Tamayo', passwordHash: 'b64e82f2c20fb2fec4514ca4dfc4d3e1528dfe2db411261209b74401e22331f9', role: 'vendedor', seller: 'TAMAYO LOPEZ ELIZABETH', displayName: 'Elizabeth Tamayo' },
    { username: 'L.Zuniga', passwordHash: '1396819c44069fb9cf4b831c129deb131d21c410a87da28fedfc6080197f2613', role: 'vendedor', seller: 'ZUNIGA HERRERA LUISA MARIA', displayName: 'Luisa Zúñiga' },
    { username: 'D.Fajardo', passwordHash: '63d6da1dd0a930f84522e49ff170b7d49a94f3b18aad462aa6a016a1543b9e64', role: 'admin', seller: 'TODOS', displayName: 'Danni Fajardo' },
    { username: 'L.Rojas', passwordHash: 'eaa2822627049a742177ef00af522f99a4c6851d83956d25051985d8821030b3', role: 'admin', seller: 'TODOS', displayName: 'Laura Rojas' }
];

const sellerPalette = ['#1565c0', '#c62828', '#2e7d32', '#ef6c00', '#7b1fa2', '#00838f', '#5d4037', '#455a64'];
const zoneColors = {
    'Norte': '#1565c0',
    'Centro': '#2e7d32',
    'Oriente': '#ef6c00',
    'Sur': '#7b1fa2',
    'Ladera/Oeste': '#00838f',
    'Sin zona': '#7d8794'
};
const typeColors = {
    'Agro Punto': '#6d4c41',
    'Veterinaria': '#1565c0',
    'Pet Shop': '#c2185b',
    'Criadero': '#2e7d32',
    'Ecommerce': '#6a1b9a',
    'Sin clasificar': '#7d8794'
};

const state = {
    clients: [],
    visibleClients: [],
    sellerColors: {},
    currentUser: null,
    dataReady: false,
    dataWarnings: [],
    hasFitInitialBounds: false
};

const map = L.map('map', { zoomControl: false, preferCanvas: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 48,
    iconCreateFunction(cluster) {
        return L.divIcon({
            className: '',
            html: `<div class="cluster-marker">${cluster.getChildCount()}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21]
        });
    }
});
map.addLayer(markers);

const el = id => document.getElementById(id);
const dom = {
    loginScreen: el('loginScreen'),
    loginForm: el('loginForm'),
    loginButton: el('loginButton'),
    loginMessage: el('loginMessage'),
    username: el('usuario'),
    password: el('clave'),
    showPassword: el('showPassword'),
    app: el('app'),
    sidebar: el('sidebar'),
    sidebarBackdrop: el('sidebarBackdrop'),
    openSidebar: el('openSidebar'),
    closeSidebar: el('closeSidebar'),
    userInitials: el('userInitials'),
    userName: el('userName'),
    userRole: el('userRole'),
    search: el('buscarCliente'),
    sellerFilter: el('filtroVendedor'),
    zoneFilter: el('filtroZona'),
    typeFilter: el('filtroTipo'),
    resetFilters: el('resetFilters'),
    fitVisible: el('fitVisible'),
    fitAll: el('fitAll'),
    locateMe: el('locateMe'),
    logoutButton: el('logoutButton'),
    totalClients: el('totalClientes'),
    visibleClients: el('clientesVisibles'),
    totalNeighborhoods: el('totalBarrios'),
    totalCommunes: el('totalComunas'),
    statsType: el('estadisticasTipo'),
    statsZone: el('estadisticasZona'),
    statsSeller: el('estadisticasVendedores'),
    sellerSection: el('seccionVendedores'),
    filterResultCount: el('filterResultCount'),
    mapStatus: el('mapStatus'),
    mapLoading: el('mapLoading')
};

function normalizeText(value) {
    return String(value ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function cleanValue(value, fallback = '') {
    const result = String(value ?? '').trim();
    return result || fallback;
}

function parseCoordinate(value) {
    let text = cleanValue(value).replace(/\s/g, '');
    if (!text) return NaN;

    if (/^-?\d+\.\d+,\d+$/.test(text)) {
        text = text.replace(',', '');
    } else if (/^-?\d+,\d+$/.test(text)) {
        text = text.replace(',', '.');
    }
    return Number(text);
}

function extractCommune(value) {
    const match = cleanValue(value).match(/\d+/);
    return match ? Number(match[0]) : null;
}

function getZone(commune) {
    if ([2, 4, 5, 6].includes(commune)) return 'Norte';
    if ([3, 8, 9, 10, 11].includes(commune)) return 'Centro';
    if ([7, 12, 13, 14, 15, 16, 21].includes(commune)) return 'Oriente';
    if ([17, 18, 19, 22].includes(commune)) return 'Sur';
    if ([1, 20].includes(commune)) return 'Ladera/Oeste';
    return 'Sin zona';
}

async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function initials(name) {
    return cleanValue(name, 'GC')
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase();
}

function formatSellerName(value) {
    return cleanValue(value)
        .toLowerCase()
        .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
}

function getSellerColor(seller) {
    return state.sellerColors[seller] || '#68707d';
}

function createMarkerIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div class="client-marker" style="background:${color}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 21],
        popupAnchor: [0, -19]
    });
}

function safePhone(value) {
    return cleanValue(value).replace(/[^\d+]/g, '');
}

function isUsefulEmail(value) {
    const text = cleanValue(value);
    return text.includes('@') && !['NO TIENE', 'NO DA DATOS'].includes(normalizeText(text));
}

function popupHtml(client) {
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
                <b>Contacto</b><span>${escapeHtml(client.contact || 'Sin información')}</span>
                <b>Celular</b><span>${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(client.phone)}</a>` : 'Sin información'}</span>
                <b>Correo</b><span>${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : 'Sin información'}</span>
            </div>
            <div class="popup-actions">
                <a href="${mapsUrl}" target="_blank" rel="noopener">Abrir ruta</a>
                ${whatsappUrl ? `<a class="secondary" href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>` : '<span></span>'}
            </div>
        </article>`;
}

function mapRow(row, index) {
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
        zone: getZone(commune),
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
        client.type
    ].join(' '));
    return client;
}

async function loadData() {
    try {
        const responses = await Promise.all(DATA_FILES.map(file => fetch(file, { cache: 'no-store' })));
        const failed = responses.find(response => !response.ok);
        if (failed) throw new Error(`No fue posible leer la base (${failed.status})`);
        const encoded = (await Promise.all(responses.map(response => response.text()))).join('').trim();
        const compressed = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        const csvText = pako.ungzip(compressed, { to: 'string' });
        const parsed = Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: 'greedy',
            transformHeader: header => header.replace(/^\uFEFF/, '').trim()
        });

        if (parsed.errors.length) {
            console.warn('Advertencias al leer el CSV:', parsed.errors);
        }

        state.clients = parsed.data.map(mapRow).filter(Boolean);
        if (!state.clients.length) throw new Error('La base no contiene coordenadas válidas.');

        const sellers = [...new Set(state.clients.map(client => client.seller))].sort((a, b) => a.localeCompare(b, 'es'));
        sellers.forEach((seller, index) => { state.sellerColors[seller] = sellerPalette[index % sellerPalette.length]; });

        state.clients.forEach(client => {
            client.marker = L.marker([client.lat, client.lon], { icon: createMarkerIcon(getSellerColor(client.seller)), title: client.establishment });
            client.marker.bindPopup(popupHtml(client), { maxWidth: 340 });
        });

        populateFilters();
        state.dataReady = true;
        dom.loginButton.disabled = false;
        dom.loginButton.textContent = 'Ingresar';
        dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles.`;

        restoreSession();
    } catch (error) {
        console.error(error);
        dom.loginMessage.classList.add('error');
        dom.loginMessage.textContent = 'No fue posible cargar la base comercial. Revisa el archivo publicado.';
        dom.loginButton.textContent = 'Datos no disponibles';
        dom.mapLoading.querySelector('.loader-card').textContent = 'No fue posible cargar los datos.';
    }
}
