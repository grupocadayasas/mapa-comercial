'use strict';

(function installCadayaExcelAdmin() {
    const CANONICAL_HEADERS = [
        'Vendedor',
        'NIT',
        'Establecimiento',
        'Persona De contacto',
        'Sucursal',
        'Dirección estandarizada',
        'Barrio',
        'Comuna Lupap',
        'Latitud completa cbll',
        'Longitud completa cbll',
        'Celular',
        'Correo',
        'Tipo',
        'Zona final mapa',
        'Macrozona'
    ];

    const REQUIRED_HEADERS = [
        'Vendedor',
        'NIT',
        'Establecimiento',
        'Sucursal',
        'Dirección estandarizada',
        'Barrio',
        'Comuna Lupap',
        'Latitud completa cbll',
        'Longitud completa cbll',
        'Tipo',
        'Zona final mapa',
        'Macrozona'
    ];

    const HEADER_ALIASES = {
        vendedor: 'Vendedor',
        nit: 'NIT',
        establecimiento: 'Establecimiento',
        personadecontacto: 'Persona De contacto',
        contacto: 'Persona De contacto',
        sucursal: 'Sucursal',
        direccionestandarizada: 'Dirección estandarizada',
        direccion: 'Dirección estandarizada',
        barrio: 'Barrio',
        comunalupap: 'Comuna Lupap',
        comuna: 'Comuna Lupap',
        latitudcompletacbll: 'Latitud completa cbll',
        latitud: 'Latitud completa cbll',
        longitudcompletacbll: 'Longitud completa cbll',
        longitud: 'Longitud completa cbll',
        celular: 'Celular',
        telefono: 'Celular',
        correo: 'Correo',
        email: 'Correo',
        tipo: 'Tipo',
        tipodeestablecimiento: 'Tipo',
        zonafinalmapa: 'Zona final mapa',
        zonasubzona: 'Zona final mapa',
        zonafinal: 'Zona final mapa',
        zona: 'Zona final mapa',
        macrozona: 'Macrozona',
        macrozonafinal: 'Macrozona'
    };

    const adminState = {
        normalizedRows: [],
        validation: null,
        sourceFileName: '',
        section: null,
        input: null,
        result: null,
        applyButton: null,
        downloadValidatedButton: null
    };

    function normalizeHeader(value) {
        return String(value ?? '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function asText(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Number.isInteger(value) ? String(value) : String(value);
        }
        return String(value).trim();
    }

    function cleanIdentifier(value) {
        return asText(value)
            .replace(/\.0+$/, '')
            .replace(/\s+/g, '')
            .trim();
    }

    function normalizeBranch(value) {
        const text = cleanIdentifier(value);
        if (/^\d+$/.test(text)) return text.padStart(2, '0');
        return text || '01';
    }

    function canonicalizeRow(sourceRow, headerMap) {
        const row = {};
        CANONICAL_HEADERS.forEach(header => { row[header] = ''; });

        Object.entries(sourceRow).forEach(([sourceHeader, value]) => {
            const canonical = headerMap[sourceHeader];
            if (canonical) row[canonical] = asText(value);
        });

        row.NIT = cleanIdentifier(row.NIT);
        row.Sucursal = normalizeBranch(row.Sucursal);
        row.Celular = cleanIdentifier(row.Celular);
        row['Comuna Lupap'] = row['Comuna Lupap']
            ? (/^comuna\s+/i.test(row['Comuna Lupap']) ? row['Comuna Lupap'] : `Comuna ${row['Comuna Lupap']}`)
            : '';

        return row;
    }

    function getHeaderMap(headers) {
        const result = {};
        headers.forEach(header => {
            const alias = HEADER_ALIASES[normalizeHeader(header)];
            if (alias) result[header] = alias;
        });
        return result;
    }

    function parseNumber(value) {
        let text = asText(value).replace(/\s/g, '');
        if (/^-?\d+,\d+$/.test(text)) text = text.replace(',', '.');
        if (/^-?\d+\.\d+,\d+$/.test(text)) text = text.replace(',', '');
        const number = Number(text);
        return Number.isFinite(number) ? number : NaN;
    }

    function expectedMacroZone(zone) {
        const normalized = normalizeText(zone);
        if (normalized.includes('NORTE')) return 'NORTE';
        if (normalized.includes('SUR')) return 'SUR';
        if (normalized.includes('ORIENTE')) return 'ORIENTE';
        if (normalized.includes('OCCIDENTE') || normalized.includes('OESTE') || normalized.includes('LADERA')) return 'OCCIDENTE';
        if (normalized.includes('CENTRO')) return 'CENTRO';
        return '';
    }

    function rowKey(row) {
        return `${normalizeText(row.NIT)}|${normalizeText(row.Sucursal)}`;
    }

    function comparableFromClient(client) {
        return {
            Vendedor: client.seller,
            NIT: client.nit,
            Establecimiento: client.establishment,
            'Persona De contacto': client.contact,
            Sucursal: client.branch,
            'Dirección estandarizada': client.address,
            Barrio: client.neighborhood,
            'Comuna Lupap': client.commune ? `Comuna ${client.commune}` : '',
            'Latitud completa cbll': String(client.lat),
            'Longitud completa cbll': String(client.lon),
            Celular: client.phone,
            Correo: client.email,
            Tipo: client.type,
            'Zona final mapa': client.zone,
            Macrozona: client.macroZone
        };
    }

    function comparableSignature(row) {
        return CANONICAL_HEADERS
            .map(header => normalizeText(row[header]))
            .join('|');
    }

    function validateRows(rows, recognizedHeaders) {
        const errors = [];
        const warnings = [];
        const seenKeys = new Map();
        const seenCoordinates = new Map();
        const knownSellers = new Set(users.filter(user => user.seller && user.seller !== 'TODOS').map(user => normalizeText(user.seller)));

        const recognizedCanonical = new Set(Object.values(recognizedHeaders));
        const missingHeaders = REQUIRED_HEADERS.filter(header => !recognizedCanonical.has(header));
        missingHeaders.forEach(header => errors.push({ row: 1, message: `Falta la columna obligatoria “${header}”.` }));

        rows.forEach((row, index) => {
            const excelRow = index + 2;
            REQUIRED_HEADERS.forEach(header => {
                if (!asText(row[header])) errors.push({ row: excelRow, message: `El campo “${header}” está vacío.` });
            });

            const latitude = parseNumber(row['Latitud completa cbll']);
            const longitude = parseNumber(row['Longitud completa cbll']);
            if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
                errors.push({ row: excelRow, message: 'Latitud inválida.' });
            }
            if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
                errors.push({ row: excelRow, message: 'Longitud inválida.' });
            }
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                if (!(latitude >= 3.20 && latitude <= 3.60 && longitude >= -76.70 && longitude <= -76.35)) {
                    warnings.push({ row: excelRow, message: 'La coordenada está fuera del rango habitual de Cali; valida que sea intencional.' });
                }
                const coordinateKey = `${latitude.toFixed(7)}|${longitude.toFixed(7)}`;
                if (seenCoordinates.has(coordinateKey)) {
                    warnings.push({ row: excelRow, message: `Comparte coordenadas con la fila ${seenCoordinates.get(coordinateKey)}.` });
                } else {
                    seenCoordinates.set(coordinateKey, excelRow);
                }
            }

            const key = rowKey(row);
            if (seenKeys.has(key)) {
                errors.push({ row: excelRow, message: `NIT + sucursal duplicados con la fila ${seenKeys.get(key)}.` });
            } else {
                seenKeys.set(key, excelRow);
            }

            if (row.Vendedor && !knownSellers.has(normalizeText(row.Vendedor))) {
                warnings.push({ row: excelRow, message: `El vendedor “${row.Vendedor}” no tiene un usuario asociado actualmente.` });
            }

            if (row.Correo && !/^\S+@\S+\.\S+$/.test(row.Correo)) {
                warnings.push({ row: excelRow, message: 'El correo no tiene un formato válido.' });
            }

            const expectedMacro = expectedMacroZone(row['Zona final mapa']);
            if (expectedMacro && normalizeText(row.Macrozona) !== expectedMacro) {
                warnings.push({ row: excelRow, message: `La zona “${row['Zona final mapa']}” no coincide con la macrozona “${row.Macrozona}”.` });
            }
        });

        const currentRows = state.clients.map(comparableFromClient);
        const currentByKey = new Map(currentRows.map(row => [rowKey(row), row]));
        const incomingByKey = new Map(rows.map(row => [rowKey(row), row]));
        let added = 0;
        let modified = 0;
        let unchanged = 0;

        rows.forEach(row => {
            const current = currentByKey.get(rowKey(row));
            if (!current) added += 1;
            else if (comparableSignature(current) === comparableSignature(row)) unchanged += 1;
            else modified += 1;
        });

        const removed = [...currentByKey.keys()].filter(key => !incomingByKey.has(key)).length;

        return {
            errors,
            warnings,
            missingHeaders,
            total: rows.length,
            added,
            modified,
            unchanged,
            removed,
            valid: errors.length === 0 && rows.length > 0
        };
    }

    function currentRowsForExcel() {
        return state.clients.map(comparableFromClient);
    }

    function workbookForRows(rows, title = 'Mapa Comercial') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows, { header: CANONICAL_HEADERS });
        worksheet['!autofilter'] = { ref: `A1:O${Math.max(2, rows.length + 1)}` };
        worksheet['!cols'] = [
            { wch: 30 }, { wch: 16 }, { wch: 36 }, { wch: 25 }, { wch: 10 },
            { wch: 34 }, { wch: 24 }, { wch: 16 }, { wch: 21 }, { wch: 21 },
            { wch: 17 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Mapa Comercial');

        const uniqueClients = new Set(rows.map(row => normalizeText(row.NIT))).size;
        const summaryRows = [
            ['MAPA COMERCIAL GRUPO CADAYA', ''],
            ['Generado', new Date().toLocaleString('es-CO')],
            ['Puntos comerciales', rows.length],
            ['Clientes únicos', uniqueClients],
            ['Vendedores', new Set(rows.map(row => normalizeText(row.Vendedor)).filter(Boolean)).size],
            ['Barrios', new Set(rows.map(row => normalizeText(row.Barrio)).filter(Boolean)).size],
            ['Comunas', new Set(rows.map(row => normalizeText(row['Comuna Lupap'])).filter(Boolean)).size],
            ['Zonas', new Set(rows.map(row => normalizeText(row['Zona final mapa'])).filter(Boolean)).size],
            ['Macrozonas', new Set(rows.map(row => normalizeText(row.Macrozona)).filter(Boolean)).size]
        ];
        const summary = XLSX.utils.aoa_to_sheet(summaryRows);
        summary['!cols'] = [{ wch: 26 }, { wch: 28 }];
        XLSX.utils.book_append_sheet(workbook, summary, 'Resumen');
        workbook.Props = { Title: title, Company: 'Grupo Cadaya S.A.S.' };
        return workbook;
    }

    function downloadRows(rows, filename) {
        if (!window.XLSX) throw new Error('La librería de Excel no está disponible.');
        XLSX.writeFile(workbookForRows(rows), filename, { compression: true });
    }

    function issueList(items, type) {
        if (!items.length) return '';
        const shown = items.slice(0, 30);
        const more = items.length > shown.length
            ? `<li>… y ${items.length - shown.length} observación(es) adicional(es).</li>`
            : '';
        return `
            <div class="excel-issues excel-issues-${type}">
                <strong>${type === 'error' ? 'Errores que bloquean la carga' : 'Advertencias para revisar'} (${items.length})</strong>
                <ul>${shown.map(item => `<li>Fila ${item.row}: ${escapeHtml(item.message)}</li>`).join('')}${more}</ul>
            </div>`;
    }

    function renderValidation(validation) {
        adminState.result.innerHTML = `
            <div class="excel-validation-summary ${validation.valid ? 'is-valid' : 'has-errors'}">
                <div><strong>${validation.total.toLocaleString('es-CO')}</strong><span>Registros</span></div>
                <div><strong>${validation.added.toLocaleString('es-CO')}</strong><span>Nuevos</span></div>
                <div><strong>${validation.modified.toLocaleString('es-CO')}</strong><span>Modificados</span></div>
                <div><strong>${validation.removed.toLocaleString('es-CO')}</strong><span>Ausentes</span></div>
            </div>
            <p class="excel-validation-status ${validation.valid ? 'is-valid' : 'has-errors'}">
                ${validation.valid
                    ? `✓ Archivo válido. ${validation.warnings.length ? 'Tiene advertencias que conviene revisar.' : 'No se encontraron inconsistencias.'}`
                    : 'El archivo no puede aplicarse hasta corregir los errores.'}
            </p>
            ${issueList(validation.errors, 'error')}
            ${issueList(validation.warnings, 'warning')}`;

        adminState.applyButton.disabled = !validation.valid;
        adminState.downloadValidatedButton.disabled = !validation.valid;
    }

    function rebuildClientMarkers(rows) {
        map.stop();
        map.closePopup();
        markers.clearLayers();
        state.dataWarnings = [];
        state.clients = rows.map(mapRow).filter(Boolean);
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
            client.marker.bindPopup(popupHtml(client), {
                maxWidth: 360,
                autoPan: true,
                keepInView: false,
                autoPanPadding: [26, 26]
            });
        });

        state.hasFitInitialBounds = false;
        state.dashboardCommuneFilter = '';
        dom.search.value = '';
        dom.sellerFilter.value = '';
        dom.macroFilter.value = '';
        dom.zoneFilter.value = '';
        dom.typeFilter.value = '';
        populateFilters();
        applyFilters({ fit: false });
        fitClients(allowedClients(), { animate: false });

        if (typeof refreshMacroZoneLayer === 'function') refreshMacroZoneLayer(state.clients);
        if (typeof buildNeighborhoodFallback === 'function' && window.layerLoadState?.neighborhoods === 'fallback') buildNeighborhoodFallback();
        if (typeof buildCommuneFallback === 'function' && window.layerLoadState?.communes === 'fallback') buildCommuneFallback();
    }

    async function readExcelFile(file) {
        if (!window.XLSX) throw new Error('No fue posible cargar el lector de Excel.');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
        if (!workbook.SheetNames.length) throw new Error('El archivo no contiene hojas.');

        let selectedSheet = workbook.Sheets[workbook.SheetNames[0]];
        for (const sheetName of workbook.SheetNames) {
            const candidate = workbook.Sheets[sheetName];
            const preview = XLSX.utils.sheet_to_json(candidate, { header: 1, defval: '', blankrows: false });
            if (preview.length && preview[0].some(value => HEADER_ALIASES[normalizeHeader(value)] === 'NIT')) {
                selectedSheet = candidate;
                break;
            }
        }

        const rawRows = XLSX.utils.sheet_to_json(selectedSheet, {
            defval: '',
            raw: false,
            blankrows: false
        });
        const sourceHeaders = rawRows.length ? Object.keys(rawRows[0]) : [];
        const headerMap = getHeaderMap(sourceHeaders);
        const rows = rawRows
            .map(row => canonicalizeRow(row, headerMap))
            .filter(row => CANONICAL_HEADERS.some(header => asText(row[header])));

        return { rows, headerMap };
    }

    async function handleFile(file) {
        adminState.result.innerHTML = '<p class="excel-loading">Leyendo y validando el archivo…</p>';
        adminState.applyButton.disabled = true;
        adminState.downloadValidatedButton.disabled = true;

        try {
            const { rows, headerMap } = await readExcelFile(file);
            const validation = validateRows(rows, headerMap);
            adminState.normalizedRows = rows;
            adminState.validation = validation;
            adminState.sourceFileName = file.name;
            renderValidation(validation);
        } catch (error) {
            console.error('Validación de Excel:', error);
            adminState.normalizedRows = [];
            adminState.validation = null;
            adminState.result.innerHTML = `<p class="excel-validation-status has-errors">${escapeHtml(error.message || 'No fue posible leer el archivo.')}</p>`;
        }
    }

    function buildAdminSection() {
        const sidebarScroll = document.querySelector('.sidebar-scroll');
        if (!sidebarScroll || document.getElementById('excelAdminSection')) return;

        const section = document.createElement('details');
        section.id = 'excelAdminSection';
        section.className = 'section dashboard-grid-full excel-admin-section hidden';
        section.innerHTML = `
            <summary>
                <span>Administrar Excel</span>
                <span class="excel-admin-summary">Solo administradores</span>
            </summary>
            <div class="excel-admin-content">
                <p class="dashboard-note">Descarga la base actual o valida un Excel nuevo antes de utilizarlo.</p>
                <div class="excel-admin-actions">
                    <button id="downloadCurrentExcel" class="secondary-button" type="button">Descargar Excel actual</button>
                    <button id="chooseExcelFile" class="primary-button" type="button">Cargar y validar Excel</button>
                </div>
                <input id="excelFileInput" type="file" accept=".xlsx,.xls" hidden>
                <div id="excelValidationResult" class="excel-validation-result">
                    <p class="excel-empty">Todavía no has seleccionado un archivo.</p>
                </div>
                <div class="excel-admin-actions excel-admin-actions-secondary">
                    <button id="downloadValidatedExcel" class="secondary-button" type="button" disabled>Descargar Excel validado</button>
                    <button id="applyValidatedExcel" class="primary-button" type="button" disabled>Usar en esta sesión</button>
                </div>
                <p class="excel-session-warning"><strong>Importante:</strong> “Usar en esta sesión” permite revisar el mapa en este navegador, pero no publica los cambios para los demás usuarios. Para hacerlo permanente se debe publicar la base validada.</p>
            </div>`;

        const logoutButton = dom.logoutButton;
        if (logoutButton) sidebarScroll.insertBefore(section, logoutButton);
        else sidebarScroll.appendChild(section);

        adminState.section = section;
        adminState.input = section.querySelector('#excelFileInput');
        adminState.result = section.querySelector('#excelValidationResult');
        adminState.applyButton = section.querySelector('#applyValidatedExcel');
        adminState.downloadValidatedButton = section.querySelector('#downloadValidatedExcel');

        section.querySelector('#downloadCurrentExcel').addEventListener('click', () => {
            downloadRows(currentRowsForExcel(), `Mapa-Comercial-${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
        section.querySelector('#chooseExcelFile').addEventListener('click', () => adminState.input.click());
        adminState.input.addEventListener('change', () => {
            const file = adminState.input.files?.[0];
            if (file) handleFile(file);
            adminState.input.value = '';
        });
        adminState.downloadValidatedButton.addEventListener('click', () => {
            if (!adminState.validation?.valid) return;
            downloadRows(adminState.normalizedRows, `Mapa-Comercial-VALIDADO-${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
        adminState.applyButton.addEventListener('click', () => {
            if (!adminState.validation?.valid) return;
            rebuildClientMarkers(adminState.normalizedRows);
            adminState.result.insertAdjacentHTML('afterbegin', '<p class="excel-validation-status is-valid">✓ La base validada está activa temporalmente en esta sesión.</p>');
        });
    }

    function toggleAdminSection(user) {
        if (!adminState.section) buildAdminSection();
        adminState.section?.classList.toggle('hidden', user?.role !== 'admin');
    }

    buildAdminSection();

    const originalOpenApp = openApp;
    openApp = function openAppWithExcelAdmin(user) {
        originalOpenApp(user);
        toggleAdminSection(user);
    };

    const originalLogout = logout;
    logout = function logoutWithExcelAdmin() {
        adminState.section?.classList.add('hidden');
        originalLogout();
    };

    if (state.currentUser) toggleAdminSection(state.currentUser);
})();
