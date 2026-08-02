'use strict';

(function installCadayaUxControls() {
    const sidebar = document.getElementById('sidebar');
    const sidebarScroll = sidebar?.querySelector('.sidebar-scroll');
    const mapToolbar = document.querySelector('.map-toolbar');

    if (sidebarScroll) {
        sidebarScroll.setAttribute('tabindex', '0');
        sidebarScroll.setAttribute('aria-label', 'Dashboard comercial desplazable');

        const controls = document.createElement('div');
        controls.className = 'sidebar-scroll-controls';
        controls.setAttribute('aria-label', 'Desplazar dashboard');
        controls.innerHTML = `
            <button type="button" class="sidebar-scroll-button" data-scroll="up" title="Subir en el dashboard" aria-label="Subir en el dashboard">↑</button>
            <button type="button" class="sidebar-scroll-button" data-scroll="down" title="Bajar en el dashboard" aria-label="Bajar en el dashboard">↓</button>`;
        sidebar.appendChild(controls);

        const scrollByPanel = direction => {
            const distance = Math.max(240, Math.round(sidebarScroll.clientHeight * 0.72));
            sidebarScroll.scrollBy({ top: direction * distance, behavior: 'smooth' });
        };

        controls.querySelector('[data-scroll="up"]').addEventListener('click', () => scrollByPanel(-1));
        controls.querySelector('[data-scroll="down"]').addEventListener('click', () => scrollByPanel(1));

        sidebarScroll.addEventListener('wheel', event => {
            event.stopPropagation();
        }, { passive: true });

        sidebarScroll.addEventListener('keydown', event => {
            if (event.key === 'PageDown') {
                event.preventDefault();
                scrollByPanel(1);
            }
            if (event.key === 'PageUp') {
                event.preventDefault();
                scrollByPanel(-1);
            }
            if (event.key === 'Home') {
                event.preventDefault();
                sidebarScroll.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (event.key === 'End') {
                event.preventDefault();
                sidebarScroll.scrollTo({ top: sidebarScroll.scrollHeight, behavior: 'smooth' });
            }
        });

        const updateScrollButtons = () => {
            const up = controls.querySelector('[data-scroll="up"]');
            const down = controls.querySelector('[data-scroll="down"]');
            up.disabled = sidebarScroll.scrollTop <= 2;
            down.disabled = sidebarScroll.scrollTop + sidebarScroll.clientHeight >= sidebarScroll.scrollHeight - 2;
        };

        sidebarScroll.addEventListener('scroll', updateScrollButtons, { passive: true });
        new ResizeObserver(updateScrollButtons).observe(sidebarScroll);
        setTimeout(updateScrollButtons, 250);
    }

    if (mapToolbar && typeof map !== 'undefined') {
        const zoomGroup = document.createElement('div');
        zoomGroup.className = 'map-zoom-group';
        zoomGroup.setAttribute('aria-label', 'Controles de zoom');
        zoomGroup.innerHTML = `
            <button id="zoomInMap" class="map-button map-zoom-button" type="button" title="Acercar mapa" aria-label="Acercar mapa">＋<span>Acercar</span></button>
            <button id="zoomOutMap" class="map-button map-zoom-button" type="button" title="Alejar mapa" aria-label="Alejar mapa">−<span>Alejar</span></button>`;
        mapToolbar.prepend(zoomGroup);

        document.getElementById('zoomInMap').addEventListener('click', () => {
            map.stop();
            map.zoomIn(1, { animate: true });
        });
        document.getElementById('zoomOutMap').addEventListener('click', () => {
            map.stop();
            map.zoomOut(1, { animate: true });
        });
    }
})();
