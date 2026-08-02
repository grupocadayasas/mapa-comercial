'use strict';

const CADAYA_DATA_VERSION = '20260802d';

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
    const text = await response.text();
    if (!text || /<!doctype|<html/i.test(text)) throw new Error(`${path}: contenido inválido`);
    return text;
}

function decodeCadayaBase64(encoded) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = String(encoded || '').replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+$/g, '');

    if (clean.length < 1000) {
        throw new Error(`Base comercial incompleta (${clean.length} caracteres).`);
    }

    const remainder = clean.length % 4;
    if (remainder === 1) {
        throw new Error(`Base comercial truncada (${clean.length} caracteres Base64).`);
    }

    const outputLength = Math.floor(clean.length * 6 / 8);
    const output = new Uint8Array(outputLength);
    let outputIndex = 0;

    for (let index = 0; index < clean.length; index += 4) {
        const a = alphabet.indexOf(clean[index]);
        const b = alphabet.indexOf(clean[index + 1]);
        const c = index + 2 < clean.length ? alphabet.indexOf(clean[index + 2]) : 0;
        const d = index + 3 < clean.length ? alphabet.indexOf(clean[index + 3]) : 0;

        if (a < 0 || b < 0 || c < 0 || d < 0) {
            throw new Error(`Contenido Base64 inválido cerca de la posición ${index}.`);
        }

        const value = (a << 18) | (b << 12) | (c << 6) | d;
        if (outputIndex < output.length) output[outputIndex++] = (value >> 16) & 255;
        if (index + 2 < clean.length && outputIndex < output.length) output[outputIndex++] = (value >> 8) & 255;
        if (index + 3 < clean.length && outputIndex < output.length) output[outputIndex++] = value & 255;
    }

    return output.slice(0, outputIndex);
}

async function gunzipCadayaBase64(encoded) {
    const bytes = decodeCadayaBase64(encoded);

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
