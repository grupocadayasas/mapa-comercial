'use strict';

(function loadCadayaExcelAdminAlwaysVisible() {
    if (!document.querySelector('link[href*="admin-excel-20260802p.css"]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = 'admin-excel-20260802p.css?v=20260802q';
        document.head.appendChild(stylesheet);
    }

    function showExcelLibraryMessage(message, isError = false) {
        const applyMessage = () => {
            const result = document.getElementById('excelValidationResult');
            if (!result) {
                setTimeout(applyMessage, 150);
                return;
            }
            if (result.dataset.libraryMessageShown === 'true') return;
            result.dataset.libraryMessageShown = 'true';
            result.insertAdjacentHTML(
                'afterbegin',
                `<p class="excel-validation-status ${isError ? 'has-errors' : 'is-valid'}">${message}</p>`
            );
        };
        applyMessage();
    }

    function loadAdminModule() {
        if (document.getElementById('cadayaExcelAdminScript')) return;
        const adminScript = document.createElement('script');
        adminScript.id = 'cadayaExcelAdminScript';
        adminScript.src = 'admin-excel-20260802p.js?v=20260802q';
        adminScript.addEventListener('error', () => {
            console.error('No fue posible cargar el módulo Administrar Excel.');
        }, { once: true });
        document.body.appendChild(adminScript);
    }

    function installUnavailableGuard() {
        document.addEventListener('click', event => {
            const button = event.target.closest('#downloadCurrentExcel, #downloadValidatedExcel, #chooseExcelFile, #applyValidatedExcel');
            if (!button || window.XLSX) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            showExcelLibraryMessage('El lector de Excel todavía no está disponible. Espera unos segundos y vuelve a intentarlo.', true);
        }, true);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.appendChild(script);
        });
    }

    async function loadExcelLibrary() {
        if (window.XLSX) {
            showExcelLibraryMessage('✓ Herramienta de Excel lista para descargar y validar archivos.');
            return;
        }

        const sources = [
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
        ];

        for (const source of sources) {
            try {
                await loadScript(source);
                if (window.XLSX) {
                    showExcelLibraryMessage('✓ Herramienta de Excel lista para descargar y validar archivos.');
                    return;
                }
            } catch (error) {
                console.warn(`No fue posible cargar SheetJS desde ${source}`, error);
            }
        }

        showExcelLibraryMessage('El módulo está visible, pero el navegador bloqueó las fuentes del lector de Excel. Recarga la página o revisa el bloqueo de contenido.', true);
    }

    installUnavailableGuard();
    loadAdminModule();
    loadExcelLibrary();
})();
