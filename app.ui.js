function populateFilters() {
    const sellers = [...new Set(state.clients.map(client => client.seller))].sort((a, b) => a.localeCompare(b, 'es'));
    const zones = [...new Set(state.clients.map(client => client.zone))].sort((a, b) => a.localeCompare(b, 'es'));
    const types = [...new Set(state.clients.map(client => client.type))].sort((a, b) => a.localeCompare(b, 'es'));

    sellers.forEach(seller => dom.sellerFilter.add(new Option(formatSellerName(seller), seller)));
    zones.forEach(zone => dom.zoneFilter.add(new Option(zone, zone)));
    types.forEach(type => dom.typeFilter.add(new Option(type, type)));
}

async function handleLogin(event) {
    event.preventDefault();
    if (!state.dataReady) return;

    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = 'Validando acceso…';
    dom.loginButton.disabled = true;

    const username = dom.username.value.trim();
    const passwordHash = await sha256(dom.password.value);
    const user = users.find(item => item.username === username && item.passwordHash === passwordHash);

    if (!user) {
        dom.loginMessage.classList.add('error');
        dom.loginMessage.textContent = 'Usuario o contraseña incorrectos.';
        dom.loginButton.disabled = false;
        dom.password.select();
        return;
    }

    sessionStorage.setItem('mapaComercialUser', user.username);
    openApp(user);
    dom.loginButton.disabled = false;
}

function restoreSession() {
    const savedUsername = sessionStorage.getItem('mapaComercialUser');
    const user = users.find(item => item.username === savedUsername);
    if (user) openApp(user);
}

function openApp(user) {
    state.currentUser = user;
    dom.loginScreen.classList.add('hidden');
    dom.app.classList.remove('hidden');
    dom.userName.textContent = user.displayName;
    dom.userInitials.textContent = initials(user.displayName);
    dom.userRole.textContent = user.role === 'admin' ? 'Administrador · Todos los vendedores' : formatSellerName(user.seller);
    dom.password.value = '';

    if (user.role === 'vendedor') {
        dom.sellerFilter.value = user.seller;
        dom.sellerFilter.classList.add('hidden');
        dom.sellerSection.classList.add('hidden');
    } else {
        dom.sellerFilter.classList.remove('hidden');
        dom.sellerSection.classList.remove('hidden');
        dom.sellerFilter.value = '';
    }

    applyFilters({ fit: true });
    setTimeout(() => map.invalidateSize(), 80);
}

function logout() {
    sessionStorage.removeItem('mapaComercialUser');
    state.currentUser = null;
    state.hasFitInitialBounds = false;
    markers.clearLayers();
    closeSidebar();
    dom.app.classList.add('hidden');
    dom.loginScreen.classList.remove('hidden');
    dom.loginMessage.classList.remove('error');
    dom.loginMessage.textContent = `${state.clients.length.toLocaleString('es-CO')} puntos comerciales disponibles.`;
    dom.username.focus();
}

function allowedClients() {
    if (!state.currentUser) return [];
    if (state.currentUser.role === 'admin') return state.clients;
    return state.clients.filter(client => client.seller === state.currentUser.seller);
}

function applyFilters(options = {}) {
    const { fit = false } = options;
    const query = normalizeText(dom.search.value);
    const seller = dom.sellerFilter.value;
    const zone = dom.zoneFilter.value;
    const type = dom.typeFilter.value;

    const base = allowedClients();
    const visible = base.filter(client => {
        const matchesSeller = state.currentUser.role === 'vendedor' || !seller || client.seller === seller;
        const matchesZone = !zone || client.zone === zone;
        const matchesType = !type || client.type === type;
        const matchesQuery = !query || client.searchText.includes(query);
        return matchesSeller && matchesZone && matchesType && matchesQuery;
    });

    state.visibleClients = visible;
    markers.clearLayers();
    markers.addLayers(visible.map(client => client.marker));
    updateDashboard(base, visible);

    dom.mapLoading.classList.add('hidden');
    const warningText = state.dataWarnings.length ? ` · ${state.dataWarnings.length} registro(s) omitido(s)` : '';
    dom.mapStatus.innerHTML = `<span class="status-dot"></span><span>${visible.length.toLocaleString('es-CO')} de ${base.length.toLocaleString('es-CO')} puntos visibles${warningText}</span>`;

    if (fit || !state.hasFitInitialBounds) {
        fitClients(visible.length ? visible : base);
        state.hasFitInitialBounds = true;
    }
}

function fitClients(clients) {
    if (!clients.length) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        return;
    }
    if (clients.length === 1) {
        map.setView([clients[0].lat, clients[0].lon], 17);
        clients[0].marker.openPopup();
        return;
    }
    const bounds = L.latLngBounds(clients.map(client => [client.lat, client.lon]));
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 16 });
}

function updateDashboard(base, visible) {
    const uniqueClients = new Set(base.map(client => normalizeText(client.nit))).size;
    const neighborhoods = new Set(visible.map(client => normalizeText(client.neighborhood)).filter(Boolean)).size;
    const communes = new Set(visible.map(client => client.commune).filter(Boolean)).size;

    dom.totalClients.textContent = uniqueClients.toLocaleString('es-CO');
    dom.visibleClients.textContent = visible.length.toLocaleString('es-CO');
    dom.totalNeighborhoods.textContent = neighborhoods.toLocaleString('es-CO');
    dom.totalCommunes.textContent = communes.toLocaleString('es-CO');
    dom.filterResultCount.textContent = `${visible.length.toLocaleString('es-CO')} visibles`;

    renderStats(dom.statsType, countBy(visible, 'type'), typeColors, value => setFilter('type', value));
    renderStats(dom.statsZone, countBy(visible, 'zone'), zoneColors, value => setFilter('zone', value));
    renderStats(dom.statsSeller, countBy(visible, 'seller'), state.sellerColors, value => setFilter('seller', value), formatSellerName);
}

function countBy(items, key) {
    return items.reduce((acc, item) => {
        const value = item[key] || 'Sin clasificar';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function renderStats(container, values, colors, onClick, formatter = value => value) {
    const entries = Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
    if (!entries.length) {
        container.innerHTML = '<div class="empty-state">No hay resultados para mostrar.</div>';
        return;
    }

    container.innerHTML = entries.map(([name, count]) => `
        <button class="stat-row" type="button" data-value="${escapeHtml(name)}">
            <span class="stat-dot" style="background:${colors[name] || '#7d8794'}"></span>
            <span class="stat-name" title="${escapeHtml(formatter(name))}">${escapeHtml(formatter(name))}</span>
            <span class="stat-number">${count.toLocaleString('es-CO')}</span>
        </button>`).join('');

    container.querySelectorAll('.stat-row').forEach(button => {
        button.addEventListener('click', () => onClick(button.dataset.value));
    });
}

function setFilter(filter, value) {
    if (filter === 'type') dom.typeFilter.value = value;
    if (filter === 'zone') dom.zoneFilter.value = value;
    if (filter === 'seller' && state.currentUser.role === 'admin') dom.sellerFilter.value = value;
    applyFilters({ fit: true });
    if (window.innerWidth <= 920) closeSidebar();
}

function resetFilters() {
    dom.search.value = '';
    dom.zoneFilter.value = '';
    dom.typeFilter.value = '';
    dom.sellerFilter.value = state.currentUser.role === 'vendedor' ? state.currentUser.seller : '';
    applyFilters({ fit: true });
}

function locateUser() {
    if (!navigator.geolocation) {
        alert('El navegador no permite obtener la ubicación.');
        return;
    }
    dom.locateMe.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
        const location = [position.coords.latitude, position.coords.longitude];
        map.setView(location, 16);
        L.circleMarker(location, { radius: 8, color: '#c8102e', fillColor: '#ffffff', fillOpacity: 1, weight: 4 })
            .addTo(map)
            .bindPopup('Tu ubicación aproximada')
            .openPopup();
        dom.locateMe.disabled = false;
    }, () => {
        alert('No fue posible obtener tu ubicación. Revisa los permisos del navegador.');
        dom.locateMe.disabled = false;
    }, { enableHighAccuracy: true, timeout: 10000 });
}

function openSidebar() {
    dom.sidebar.classList.add('open');
    dom.sidebarBackdrop.classList.add('open');
}

function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.sidebarBackdrop.classList.remove('open');
}

let searchTimer;
dom.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyFilters(), 220);
});
['change'].forEach(eventName => {
    dom.sellerFilter.addEventListener(eventName, () => applyFilters({ fit: true }));
    dom.zoneFilter.addEventListener(eventName, () => applyFilters({ fit: true }));
    dom.typeFilter.addEventListener(eventName, () => applyFilters({ fit: true }));
});

dom.loginForm.addEventListener('submit', handleLogin);
dom.showPassword.addEventListener('click', () => {
    const isPassword = dom.password.type === 'password';
    dom.password.type = isPassword ? 'text' : 'password';
    dom.showPassword.textContent = isPassword ? 'Ocultar' : 'Mostrar';
});
dom.resetFilters.addEventListener('click', resetFilters);
dom.fitVisible.addEventListener('click', () => { fitClients(state.visibleClients); if (window.innerWidth <= 920) closeSidebar(); });
dom.fitAll.addEventListener('click', () => fitClients(allowedClients()));
dom.locateMe.addEventListener('click', locateUser);
dom.logoutButton.addEventListener('click', logout);
dom.openSidebar.addEventListener('click', openSidebar);
dom.closeSidebar.addEventListener('click', closeSidebar);
dom.sidebarBackdrop.addEventListener('click', closeSidebar);
map.on('click', () => { if (window.innerWidth <= 920) closeSidebar(); });
window.addEventListener('resize', () => map.invalidateSize());

loadData();
