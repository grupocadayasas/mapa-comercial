window.map = L.map('map').setView([3.4516, -76.5320], 11);
var map = window.map;

L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }
).addTo(map);

var markers = L.markerClusterGroup();
var clientes = [];

var colores = [
    "#1976D2", "#D32F2F", "#22B14C", "#F57C00",
    "#8E24AA", "#0097A7", "#5D4037"
];

var coloresVendedor = {};

function normalizar(texto){
    return String(texto || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function obtenerZona(comuna){
    comuna = parseInt(comuna);
    if ([2,4,5,6].includes(comuna)) return "Norte";
    if ([3,8,9,10,11].includes(comuna)) return "Centro";
    if ([7,12,13,14,15,16,21].includes(comuna)) return "Oriente";
    if ([17,18,19,22].includes(comuna)) return "Sur";
    if ([1,20].includes(comuna)) return "Ladera/Oeste";
    return "Sin Zona";
}

var coloresZona = {
    "Norte": "#1976D2",
    "Centro": "#22B14C",
    "Oriente": "#F57C00",
    "Sur": "#8E24AA",
    "Ladera/Oeste": "#0097A7",
    "Sin Zona": "#999999"
};

fetch('clientes_cali.csv')
.then(r => r.text())
.then(text => {

    let filas = text.split('\n');
    let vendedores = new Set();
    let barrios = new Set();
    let comunas = new Set();

    for (let i = 1; i < filas.length; i++) {

        let cols = filas[i].split(';');

        if (cols.length < 14) continue;

        let vendedor = cols[0].trim();

        let cliente = {
            vendedor: vendedor,
            nit: cols[1],
            cliente: cols[2],
            sucursal: cols[3],
            direccion: cols[5],
            barrio: cols[7],
            comuna: cols[8],
            zona: obtenerZona(cols[8]),
            lat: parseFloat(cols[12]),
            lon: parseFloat(cols[13])
        };

        if (isNaN(cliente.lat) || isNaN(cliente.lon)) continue;

        if (!coloresVendedor[vendedor]) {
            let indice = Object.keys(coloresVendedor).length;
            coloresVendedor[vendedor] = colores[indice % colores.length];
        }

        let icono = L.divIcon({
            className: '',
            html: `
                <div style="
                    width:14px;
                    height:14px;
                    border-radius:50%;
                    border:2px solid white;
                    background:${coloresVendedor[vendedor]};
                    box-shadow:0 0 3px #000;">
                </div>
            `,
            iconSize: [18, 18]
        });

        let marker = L.marker([cliente.lat, cliente.lon], { icon: icono });

        marker.bindPopup(`
            <div style="font-family:Arial,Helvetica,sans-serif;">
                <h3 style="margin:0 0 10px 0;color:#d90000;">
                    ${cliente.cliente}
                </h3>
                <b>Vendedor:</b> ${cliente.vendedor}<br>
                <b>Zona:</b> ${cliente.zona}<br>
                <b>Comuna:</b> ${cliente.comuna}<br>
                <b>Barrio:</b> ${cliente.barrio}<br>
                <b>Sucursal:</b> ${cliente.sucursal}<br>
                <b>NIT:</b> ${cliente.nit}<br>
                <b>Dirección:</b> ${cliente.direccion}
            </div>
        `);

        cliente.marker = marker;
        clientes.push(cliente);

        vendedores.add(vendedor);
        barrios.add(cliente.barrio);
        comunas.add(cliente.comuna);
    }

    document.getElementById('totalClientes').innerText = clientes.length;
    document.getElementById('totalVendedores').innerText = vendedores.size;
    document.getElementById('totalBarrios').innerText = barrios.size;
    document.getElementById('totalComunas').innerText = comunas.size;

    cargarFiltroVendedores(vendedores);
    cargarBuscador();
    aplicarFiltros();
});

function cargarFiltroVendedores(vendedores){

    let combo = document.getElementById('filtroVendedor');

    [...vendedores].sort().forEach(v => {
        let op = document.createElement('option');
        op.value = v;
        op.textContent = v;
        combo.appendChild(op);
    });

    combo.addEventListener('change', aplicarFiltros);
    document.getElementById('filtroZona').addEventListener('change', aplicarFiltros);
}

function aplicarFiltros(){

    let vendedor = document.getElementById('filtroVendedor').value;
    let zona = document.getElementById('filtroZona').value;

    markers.clearLayers();

    let visibles = [];

    clientes.forEach(c => {

        let cumpleVendedor = vendedor === "" || c.vendedor === vendedor;
        let cumpleZona = zona === "" || c.zona === zona;

        if (cumpleVendedor && cumpleZona) {
            markers.addLayer(c.marker);
            visibles.push(c);
        }
    });

    map.addLayer(markers);

    if (markers.getLayers().length > 0) {
        map.fitBounds(markers.getBounds());
    }

    actualizarDashboard(visibles);
}

function actualizarDashboard(visibles){

    document.getElementById('clientesVisibles').innerText = visibles.length;

    let zonas = {};
    let vendedores = {};

    visibles.forEach(c => {
        zonas[c.zona] = (zonas[c.zona] || 0) + 1;
        vendedores[c.vendedor] = (vendedores[c.vendedor] || 0) + 1;
    });

    actualizarZonas(zonas);
    actualizarVendedores(vendedores);
}

function actualizarZonas(zonas){

    let orden = ["Norte", "Centro", "Oriente", "Sur", "Ladera/Oeste", "Sin Zona"];
    let html = '';

    orden.forEach(z => {
        if (!zonas[z]) return;

        html += `
            <div class="item-lista">
                <div class="item-nombre">
                    <span class="color-zona" style="background:${coloresZona[z]}"></span>
                    ${z}
                </div>
                <strong>${zonas[z]}</strong>
            </div>
        `;
    });

    document.getElementById('estadisticasZona').innerHTML = html;
}

function actualizarVendedores(vendedores){

    let html = '';

    Object.keys(vendedores).sort().forEach(v => {
        html += `
            <div class="item-lista">
                <div class="item-nombre">
                    <span class="color-vendedor" style="background:${coloresVendedor[v]}"></span>
                    ${v}
                </div>
                <strong>${vendedores[v]}</strong>
            </div>
        `;
    });

    document.getElementById('estadisticasVendedores').innerHTML = html;
}

function cargarBuscador(){

    let lista = document.getElementById('listaClientes');
    lista.innerHTML = "";

    clientes.forEach(c => {
        let op = document.createElement('option');
        op.value = c.cliente;
        lista.appendChild(op);
    });

    let input = document.getElementById('buscarCliente');

    input.addEventListener('change', buscarCliente);
    input.addEventListener('keydown', function(e){
        if(e.key === "Enter"){
            buscarCliente();
        }
    });
}

function buscarCliente(){

    let textoOriginal = document.getElementById('buscarCliente').value;
    let texto = normalizar(textoOriginal);

    if(texto === "") return;

    let cliente = clientes.find(c =>
        normalizar(c.cliente) === texto
    );

    if(!cliente){
        cliente = clientes.find(c =>
            normalizar(c.cliente).includes(texto)
        );
    }

    if(!cliente){
        alert("No se encontró ningún cliente con: " + textoOriginal);
        return;
    }

    document.getElementById('filtroVendedor').value = "";
    document.getElementById('filtroZona').value = "";

    aplicarFiltros();

    map.setView([cliente.lat, cliente.lon], 18);
    cliente.marker.openPopup();

    if(window.innerWidth <= 768){
        cerrarPanel();
    }
}

if(window.innerWidth <= 768){
    document.getElementById('map').addEventListener('click', function(){
        cerrarPanel();
    });
}