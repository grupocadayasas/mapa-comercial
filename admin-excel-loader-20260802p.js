'use strict';

(function loadCadayaExcelAdmin() {
    if (document.getElementById('cadayaExcelAdminScript')) return;

    if (!document.querySelector('link[href*="admin-excel-20260802p.css"]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = 'admin-excel-20260802p.css?v=20260802p';
        document.head.appendChild(stylesheet);
    }

    const loadAdminScript = () => {
        if (document.getElementById('cadayaExcelAdminScript')) return;
        const adminScript = document.createElement('script');
        adminScript.id = 'cadayaExcelAdminScript';
        adminScript.src = 'admin-excel-20260802p.js?v=20260802p';
        adminScript.defer = true;
        document.body.appendChild(adminScript);
    };

    if (window.XLSX) {
        loadAdminScript();
        return;
    }

    const xlsxScript = document.createElement('script');
    xlsxScript.id = 'cadayaSheetJs';
    xlsxScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    xlsxScript.crossOrigin = 'anonymous';
    xlsxScript.addEventListener('load', loadAdminScript, { once: true });
    xlsxScript.addEventListener('error', () => {
        console.error('No fue posible cargar el lector de archivos Excel.');
    }, { once: true });
    document.head.appendChild(xlsxScript);
})();
