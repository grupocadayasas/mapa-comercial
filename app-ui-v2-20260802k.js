'use strict';

state.dashboardCommuneFilter = '';
map.options.zoomSnap = 0.5;
map.options.zoomDelta = 0.5;

markers.options.zoomToBoundsOnClick = true;
markers.options.spiderfyOnMaxZoom = true;
markers.options.disableClusteringAtZoom = 17;
markers.options.removeOutsideVisibleBounds = true;

function clearDynamicOptions(select) {
    while (select && select.options.length > 1) select.remove(1);
}

function uniqueSorted(values, formatter = value => value) {
    return [...new Set(values.filter(Boolean))]
        .sort((a, b) => formatter(a).localeCompare(formatter(b), 'es'));
}

function populateFilters() {
    [dom.sellerFilter, dom.macroFilter, dom.zoneFilter, dom.typeFilter].forEach(clearDynamicOptions);

    const sellers = uniqueSorted(state.clients.map(client => client.seller), formatSellerName);
    const macroZones = uniqueSorted(state.clients.map(client => client.macroZone || 'Sin macrozona'));
    const zones = uniqueSorted(state.clients.map(client => client.zone));
    const types = uniqueSorted(state.clients.map(client => client.type));

    sellers.forEach(seller => dom.sellerFilter.add(new Option(formatSellerName(seller), seller)));
    macroZones.forEach(zone => dom.macroFilter.add(new Option(zone, zone)));
    zones.forEach(zone => dom.zoneFilter.add(new Option(zone, zone)));
    types.forEach(type => dom.typeFilter.add(new Option(type, type)));

    state.clients.forEach(client => {
        const popup = client.marker?.getPopup?.();
        if (popup) {
            popup.options.autoPan = true;
            popup.options.keepInView = false;
            popup.options.autoPanPaddingTopLeft = L.point(26, 26);
            popup.options.autoPanPaddingBottomRight = L.point(26, 26);
        }
    });

    if (typeof refreshMacroZoneLayer === 'function') refreshMacroZoneLayer(state.clients);
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
    state.dashboardCommuneFilter = '';
    state.hasFitInitialBounds = false;

    dom.loginScreen.classList.add('hidden');
    dom.app.classList.remove('hidden');
    dom.userName.textContent = user.displayName;
    dom.userInitials.textContent = initials(user.displayName);
    dom.userRole.textContent = user.role === 'admin'
        ? 'Administrador · Todos los vendedores'
        : formatSellerName(user.seller);
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

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            map.invalidateSize({ pan: false });
            applyFilters({ fit: false });
            fitClients(allowedClients(), { animate: false });
            state.hasFitInitialBounds = true;
        });
    });
}

function logout() {
    sessionStorage.removeItem('mapaComercialUser');
    state.currentUser = null;
    state.hasFitInitialBounds = false;
    state.dashboardCommuneFilter = '';
    map.stop();
    map.closePopup();
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

function currentFilteredClients() {
    const query = normalizeText(dom.search.value);
    const seller = dom.sellerFilter.value;
    const macroZone = dom.macroFilter.value;
    const zone = dom.zoneFilter.value;
    const type = dom.typeFilter.value;
    const commune = state.dashboardCommuneFilter;

    return allowedClients().filter(client => {
        const matchesSeller = state.currentUser.role === 'vendedor' || !seller || client.seller === seller;
        const matchesMacroZone = !macroZone || client.macroZone === macroZone;
        const matchesZone = !zone || client.zone === zone;
        const matchesType = !type || client.type === type;
        const matchesCommune = !commune || `Comuna ${client.commune}` === commune;
        const matchesQuery = !query || client.searchText.includes(query);
        return matchesSeller && matchesMacroZone && matchesZone && matchesType && matchesCommune && matchesQuery;
    });
}

function applyFilters(options = {}) {
    const { fit = false, openSinglePopup = false } = options;
    const base = allowedClients();
    const visible = currentFilteredClients();

    state.visibleClients = visible;
    map.stop();
    map.closePopup();
    markers.clearLayers();
    markers.addLayers(visible.map(client => client.marker));
    updateDashboard(base, visible);

    dom.mapLoading.classList.add('hidden');
    const warningText = state.dataWarnings.length ? ` · ${state.dataWarnings.length} registro(s) omitido(s)` : '';
    const actionText = fit ? '' : ' · Pulsa “Ver resultados” para centrar';
    dom.mapStatus.innerHTML = `<span class="status-dot"></span><span>${visible.length.toLocaleString('es-CO')} de ${base.length.toLocaleString('es-CO')} puntos visibles${warningText}${actionText}</span>`;

    if (fit) {
        fitClients(visible.length ? visible : base, { openSinglePopup, animate: false });
    }
}

function fitProfile(clients) {
    const count = clients.length;
    const latitudes = clients.map(client => client.lat);
    const longitudes = clients.map(client => client.lon);
    const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const lonSpan = Math.max(...longitudes) - Math.min(...longitudes);
    const span = Math.max(latSpan, lonSpan);

    if (count === 1) return { zoom: 16, maxZoom: 16 };
    if (span > 0.15 || count > 180) return { maxZoom: 12.5 };
    if (span > 0.09 || count > 80) return { maxZoom: 13 };
    if (span > 0.05 || count > 35) return { maxZoom: 13.5 };
    if (span > 0.025 || count > 12) return { maxZoom: 14 };
    if (count > 4) return { maxZoom: 14.5 };
    return { maxZoom: 15 };
}

function fitClients(clients, options = {}) {
    const { openSinglePopup = false, animate = false } = options;
    map.stop();
    map.closePopup();

    if (!clients.length) {
        map.setView(DEFAULT_CENTER, 12.5, { animate: false });
        return;
    }

    const profile = fitProfile(clients);
    if (clients.length === 1) {
        const client = clients[0];
        map.setView([client.lat, client.lon], profile.zoom, { animate });
        if (openSinglePopup) {
            setTimeout(() => client.marker.openPopup(), 80);
        }
        return;
    }

    const bounds = L.latLngBounds(clients.map(client => [client.lat, client.lon]));
    if (!bounds.isValid()) {
        map.setView(DEFAULT_CENTER, 12.5, { animate: false });
        return;
    }

    const mobile = window.innerWidth <= 920;
    map.fitBounds(bounds, {
        padding: mobile ? [24, 24] : [42, 42],
        maxZoom: profile.maxZoom,
        animate
    });
}

function updateZoneChoices() {
    const current = dom.zoneFilter.value;
    const selectedMacro = dom.macroFilter.value;
    const selectedSeller = dom.sellerFilter.value;

    let source = allowedClients();
    if (state.currentUser.role === 'admin' && selectedSeller) {
        source = source.filter(client => client.seller === selectedSeller);
    }
    if (selectedMacro) source = source.filter(client => client.macroZone === selectedMacro);

    const zones = uniqueSorted(source.map(client => client.zone));
    clearDynamicOptions(dom.zoneFilter);
    zones.forEach(zone => dom.zoneFilter.add(new Option(zone, zone)));
    dom.zoneFilter.value = zones.includes(current) ? current : '';
}

function updateDashboard(base, visible) {
    const uniqueClients = new Set(visible.map(client => normalizeText(client.nit))).size;
    const neighborhoods = new Set(visible.map(client => normalizeText(client.neighborhood)).filter(Boolean)).size;
    const communes = new Set(visible.map(client => client.commune).filter(Boolean)).size;
    const zones = new Set(visible.map(client => client.zone).filter(Boolean)).size;
    const macroZones = new Set(visible.map(client => client.macroZone).filter(Boolean)).size;

    dom.totalClients.textContent = uniqueClients.toLocaleString('es-CO');
    dom.visibleClients.textContent = visible.length.toLocaleString('es-CO');
    dom.totalNeighborhoods.textContent = neighborhoods.toLocaleString('es-CO');
    dom.totalCommunes.textContent = communes.toLocaleString('es-CO');
    dom.totalZones.textContent = zones.toLocaleString('es-CO');
    dom.totalMacroZones.textContent = macroZones.toLocaleString('es-CO');
    dom.filterResultCount.textContent = `${visible.length.toLocaleString('es-CO')} visibles`;

    dom.mapDashVisible.textContent = visible.length.toLocaleString('es-CO');
    dom.mapDashZones.textContent = zones.toLocaleString('es-CO');
    dom.mapDashMacro.textContent = macroZones.toLocaleString('es-CO');

    renderStats(dom.statsType, countBy(visible, 'type'), typeColors, value => setFilter('type', value));
    renderStats(dom.statsMacroZone, countBy(visible, 'macroZone'), macroZoneColors, value => setFilter('macroZone', value));
    renderStats(dom.statsZone, countBy(visible, 'zone'), zoneColors, value => setFilter('zone', value));
    renderStats(dom.statsCommune, countBy(visible, 'communeLabel'), {}, value => setFilter('commune', value));
    renderStats(dom.statsSeller, countBy(visible, 'seller'), state.sellerColors, value => setFilter('seller', value), formatSellerName);
}

function countBy(items, key) {
    return items.reduce((acc, item) => {
        let value;
        if (key === 'communeLabel') value = item.commune ? `Comuna ${item.commune}` : 'Sin comuna';
        else value = item[key] || 'Sin clasificar';
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

    const max = Math.max(...entries.map(([, count]) => count), 1);
    container.innerHTML = entries.map(([name, count]) => `
        <button class="stat-row" type="button" data-value="${escapeHtml(name)}" title="Filtrar por ${escapeHtml(formatter(name))}">
            <span class="stat-dot" style="background:${colors[name] || '#7d8794'}"></span>
            <span class="stat-name" title="${escapeHtml(formatter(name))}">${escapeHtml(formatter(name))}</span>
            <span class="stat-number">${count.toLocaleString('es-CO')}</span>
            <span class="stat-progress" style="--stat-width:${Math.max(7, count / max * 100)}%"></span>
        </button>`).join('');

    container.querySelectorAll('.stat-row').forEach(button => {
        button.addEventListener('click', () => onClick(button.dataset.value));
    });
}

function setFilter(filter, value) {
    if (filter === 'type') dom.typeFilter.value = value;
    if (filter === 'macroZone') {
        dom.macroFilter.value = value;
        updateZoneChoices();
    }
    if (filter === 'zone') dom.zoneFilter.value = value;
    if (filter === 'seller' && state.currentUser.role === 'admin') {
        dom.sellerFilter.value = value;
        updateZoneChoices();
    }
    if (filter === 'commune') state.dashboardCommuneFilter = value;

    applyFilters({ fit: true });
    if (window.innerWidth <= 920) closeSidebar();
}

function resetFilters() {
    dom.search.value = '';
    dom.macroFilter.value = '';
    dom.zoneFilter.value = '';
    dom.typeFilter.value = '';
    dom.sellerFilter.value = state.currentUser.role === 'vendedor' ? state.currentUser.seller : '';
    state.dashboardCommuneFilter = '';
    updateZoneChoices();
    applyFilters({ fit: false });
}

function locateUser() {
    if (!navigator.geolocation) {
        alert('El navegador no permite obtener la ubicación.');
        return;
    }
    dom.locateMe.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
        const location = [position.coords.latitude, position.coords.longitude];
        map.stop();
        map.setView(location, 15.5, { animate: false });
        L.circleMarker(location, {
            radius: 8,
            color: '#c8102e',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 4
        })
            .addTo(map)
            .bindPopup('Tu ubicación aproximada', { autoPanPadding: [24, 24] })
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
    searchTimer = setTimeout(() => applyFilters({ fit: false }), 220);
});

dom.sellerFilter.addEventListener('change', () => {
    state.dashboardCommuneFilter = '';
    updateZoneChoices();
    applyFilters({ fit: false });
});
dom.macroFilter.addEventListener('change', () => {
    state.dashboardCommuneFilter = '';
    updateZoneChoices();
    applyFilters({ fit: false });
});
dom.zoneFilter.addEventListener('change', () => {
    state.dashboardCommuneFilter = '';
    applyFilters({ fit: false });
});
dom.typeFilter.addEventListener('change', () => {
    state.dashboardCommuneFilter = '';
    applyFilters({ fit: false });
});

dom.loginForm.addEventListener('submit', handleLogin);
dom.showPassword.addEventListener('click', () => {
    const isPassword = dom.password.type === 'password';
    dom.password.type = isPassword ? 'text' : 'password';
    dom.showPassword.textContent = isPassword ? 'Ocultar' : 'Mostrar';
});
dom.resetFilters.addEventListener('click', resetFilters);
dom.fitVisible.addEventListener('click', () => {
    fitClients(state.visibleClients.length ? state.visibleClients : allowedClients(), {
        openSinglePopup: state.visibleClients.length === 1,
        animate: false
    });
    if (window.innerWidth <= 920) closeSidebar();
});
dom.fitAll.addEventListener('click', () => fitClients(allowedClients(), { animate: false }));
dom.locateMe.addEventListener('click', locateUser);
dom.logoutButton.addEventListener('click', logout);
dom.openSidebar.addEventListener('click', openSidebar);
dom.closeSidebar.addEventListener('click', closeSidebar);
dom.sidebarBackdrop.addEventListener('click', closeSidebar);
map.on('click', () => { if (window.innerWidth <= 920) closeSidebar(); });
window.addEventListener('resize', () => {
    map.stop();
    map.invalidateSize({ pan: false });
});

loadData();
