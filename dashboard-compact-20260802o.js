'use strict';

(function installCompactDashboard() {
    const sidebarScroll = document.querySelector('.sidebar-scroll');
    if (!sidebarScroll || typeof dom === 'undefined') return;

    sidebarScroll.classList.add('dashboard-compact-layout');

    const searchSection = dom.search?.closest('.section');
    if (searchSection) {
        searchSection.classList.add('dashboard-grid-full', 'search-only-section');
        const title = searchSection.querySelector('.section-title span:first-child');
        if (title) title.textContent = 'Buscar clientes';
    }

    const dashboardSection = document.querySelector('.dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('dashboard-grid-full');
        const note = dashboardSection.querySelector('.dashboard-note');
        if (note) {
            note.classList.add('dashboard-filter-help');
            note.textContent = 'Pulsa una opción para filtrar. Púlsala nuevamente para cancelar la selección.';
        }
    }

    [dom.statsMacroZone, dom.statsZone, dom.statsType, dom.statsSeller].forEach(container => {
        container?.closest('.section')?.classList.add('dashboard-grid-half');
    });

    const communeSection = dom.statsCommune?.closest('.section');
    let communeDetails = null;
    if (communeSection && communeSection.tagName !== 'DETAILS') {
        communeDetails = document.createElement('details');
        communeDetails.className = 'section dashboard-grid-full commune-collapsible';
        communeDetails.innerHTML = `
            <summary>
                <span>Por comuna</span>
                <span id="communeSummaryMeta" class="commune-summary-meta">Recogido</span>
            </summary>
            <div class="commune-collapsible-content"></div>`;
        communeSection.replaceWith(communeDetails);
        communeDetails.querySelector('.commune-collapsible-content').appendChild(dom.statsCommune);
    } else if (communeSection) {
        communeDetails = communeSection;
        communeDetails.classList.add('dashboard-grid-full', 'commune-collapsible');
    }

    const logoutButton = dom.logoutButton;
    if (logoutButton) logoutButton.classList.add('dashboard-grid-full');

    const layerNoteSection = [...sidebarScroll.querySelectorAll('.section')]
        .find(section => section.querySelector('.dashboard-note')?.textContent.includes('Capas:'));
    if (layerNoteSection) layerNoteSection.classList.add('dashboard-grid-full');

    function selectedValueForContainer(container) {
        if (container === dom.statsMacroZone) return dom.macroFilter.value;
        if (container === dom.statsZone) return dom.zoneFilter.value;
        if (container === dom.statsType) return dom.typeFilter.value;
        if (container === dom.statsSeller) return state.currentUser?.role === 'admin' ? dom.sellerFilter.value : '';
        if (container === dom.statsCommune) return state.dashboardCommuneFilter || '';
        return '';
    }

    function syncActiveDashboardButtons() {
        [dom.statsMacroZone, dom.statsZone, dom.statsType, dom.statsSeller, dom.statsCommune].forEach(container => {
            if (!container) return;
            const selected = selectedValueForContainer(container);
            container.querySelectorAll('.stat-row').forEach(button => {
                const active = Boolean(selected) && button.dataset.value === selected;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
                button.title = active
                    ? `Quitar filtro ${button.dataset.value}`
                    : `Filtrar por ${button.dataset.value}`;
            });
        });

        const communeMeta = document.getElementById('communeSummaryMeta');
        if (communeMeta) {
            const count = new Set(state.visibleClients.map(client => client.commune).filter(Boolean)).size;
            communeMeta.textContent = state.dashboardCommuneFilter
                ? state.dashboardCommuneFilter
                : `${count.toLocaleString('es-CO')} comuna${count === 1 ? '' : 's'}`;
        }
    }

    const originalUpdateDashboard = updateDashboard;
    updateDashboard = function updateDashboardWithActiveFilters(base, visible) {
        originalUpdateDashboard(base, visible);
        syncActiveDashboardButtons();
    };

    setFilter = function toggleDashboardFilter(filter, value) {
        if (filter === 'macroZone') {
            const isActive = dom.macroFilter.value === value;
            dom.macroFilter.value = isActive ? '' : value;
            dom.zoneFilter.value = '';
            state.dashboardCommuneFilter = '';
            updateZoneChoices();
        }

        if (filter === 'zone') {
            const isActive = dom.zoneFilter.value === value;
            dom.zoneFilter.value = isActive ? '' : value;
            state.dashboardCommuneFilter = '';
        }

        if (filter === 'type') {
            dom.typeFilter.value = dom.typeFilter.value === value ? '' : value;
            state.dashboardCommuneFilter = '';
        }

        if (filter === 'seller' && state.currentUser?.role === 'admin') {
            dom.sellerFilter.value = dom.sellerFilter.value === value ? '' : value;
            dom.macroFilter.value = '';
            dom.zoneFilter.value = '';
            state.dashboardCommuneFilter = '';
            updateZoneChoices();
        }

        if (filter === 'commune') {
            state.dashboardCommuneFilter = state.dashboardCommuneFilter === value ? '' : value;
        }

        applyFilters({ fit: true });
        if (window.innerWidth <= 920) closeSidebar();
    };

    // Asegura que los botones ya renderizados adopten el nuevo comportamiento visual.
    const refreshWhenReady = () => {
        if (!state.dataReady) {
            setTimeout(refreshWhenReady, 120);
            return;
        }
        syncActiveDashboardButtons();
    };
    refreshWhenReady();
})();

(function loadExcelAdminModule() {
    if (document.getElementById('cadayaExcelAdminLoader')) return;
    const script = document.createElement('script');
    script.id = 'cadayaExcelAdminLoader';
    script.src = 'admin-excel-loader-20260802p.js?v=20260802p';
    script.defer = true;
    document.body.appendChild(script);
})();
