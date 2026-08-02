'use strict';

const CADAYA_DATA_VERSION = '20260802c';

function parseCadayaCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (quoted && next === '"') {
                value += '"';
                i += 1;
            } else {
                quoted = !quoted;
            }
        } else if (char === ';' && !quoted) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(value);
            if (row.some(cell => cell.trim() !== '')) rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    if (value.length || row.length) {
        row.push(value);
        if (row.some(cell => cell.trim() !== '')) rows.push(row);
    }

    if (!rows.length) return [];
    const headers = rows.shift().map(header => header.replace(/^\uFEFF/, '').trim());
    return rows.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

async function fetchCadayaPart(path, attempt = 1) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${path}${separator}v=${CADAYA_DATA_VERSION}-${Date.now()}-${attempt}`;
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const text = (await response.text()).trim();
    if (!text || /<!doctype|<html/i.test(text)) throw new Error(`${path}: contenido inválido`);
    return text;
}

async function gunzipCadayaBase64(encoded) {
    const binary = atob(encoded.replace(/\s+/g, ''));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

    if ('DecompressionStream' in window) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Response(stream).text();
    }

    if (window.pako) return window.pako.ungzip(bytes, { to: 'string' });
    throw new Error('El navegador no dispone de descompresión GZIP.');
}

function resetCadayaFilters() {
    [dom.sellerFilter, dom.zoneFilter, dom.typeFilter].forEach(select => {
        while (select.options.length > 1) select.remove(1);
    });
}
