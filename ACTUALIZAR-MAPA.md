# Actualizar la base del Mapa Comercial

El sitio lee directamente el archivo **`Mapa-Comercial.csv`** ubicado en la raíz del repositorio.

## Procedimiento

1. Guarda o exporta la base como CSV UTF-8 separado por punto y coma (`;`).
2. Conserva exactamente el nombre **`Mapa-Comercial.csv`**.
3. Reemplaza el archivo existente en la carpeta clonada del repositorio.
4. Haz doble clic en **`ACTUALIZAR-MAPA.bat`**.
5. Espera entre 1 y 3 minutos y abre:
   `https://grupocadayasas.github.io/mapa-comercial/`

El mapa solicita el CSV con una dirección diferente en cada carga para evitar que Chrome conserve una versión anterior.

## Columnas requeridas

- Vendedor
- NIT
- Establecimiento
- Sucursal
- Dirección estandarizada
- Barrio
- Comuna
- Latitud completa cbll
- Longitud completa cbll
- Tipo
- Zona / Subzona
- Macrozona

También se acepta `Comuna Lupap` en lugar de `Comuna`, y `Zona final mapa` en lugar de `Zona / Subzona`.
