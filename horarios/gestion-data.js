window.CADAYA_SCHEDULE_DATA = {
  version: "1.1.1",
  config: {
    month: "2026-08",
    startDate: "2026-08-03",
    holidays: {
      "2026-08-07": "Batalla de Boyacá",
      "2026-08-17": "Asunción de la Virgen"
    }
  },
  access: [
    {
      name: "DANNI FAJARDO GUZMÁN",
      role: "admin",
      credentialHash: "0214574d7fe8dc8d1e61fc271bdba6e5471cce7762308c7c6b595b34497f78d0"
    },
    {
      name: "LAURA MARCELA ROJAS AYALA",
      role: "viewer",
      credentialHash: "4ef6700d4b46a91da81e12b06c82df3ebc80bc89fa0740be165a9007918a9dcc"
    }
  ],
  patterns: [
    ["CON_SAB", "Malla con sábado"],
    ["SIN_SAB", "Malla sin sábado"],
    ["KALETH", "Malla especial Kaleth"],
    ["SERGIO", "Malla especial Sergio"],
    ["MALLA_C", "Malla C · Vehiculares y auxiliares"],
    ["MALLA_D", "Malla D · Motorizados"],
    ["PENDING", "Pendiente de asignación"]
  ],
  shifts: {
    CON_SAB: {
      label: "Malla con sábado",
      days: {
        1: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        2: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        3: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        4: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        5: ["7:30 a. m.", "2:30 p. m.", "1 hora", 6],
        6: ["7:30 a. m.", "1:30 p. m.", "Sin almuerzo", 6]
      }
    },
    SIN_SAB: {
      label: "Malla sin sábado",
      days: {
        1: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        2: ["8:00 a. m.", "5:30 p. m.", "1 hora", 8.5],
        3: ["8:00 a. m.", "5:30 p. m.", "1 hora", 8.5],
        4: ["8:00 a. m.", "5:30 p. m.", "1 hora", 8.5],
        5: ["9:00 a. m.", "5:30 p. m.", "1 hora", 7.5]
      }
    },
    KALETH: {
      label: "Malla especial Kaleth",
      days: {
        1: ["7:30 a. m.", "4:45 p. m.", "1 hora", 8.25],
        2: ["7:30 a. m.", "5:00 p. m.", "1 hora", 8.5],
        3: ["7:30 a. m.", "4:45 p. m.", "1 hora", 8.25],
        4: ["7:30 a. m.", "5:00 p. m.", "1 hora", 8.5],
        5: ["7:30 a. m.", "5:00 p. m.", "1 hora", 8.5]
      }
    },
    SERGIO: {
      label: "Malla especial Sergio",
      days: {
        1: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        2: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        3: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        4: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        5: ["7:30 a. m.", "4:00 p. m.", "1 hora", 7.5],
        6: ["7:30 a. m.", "12:00 m.", "Sin almuerzo", 4.5]
      }
    },
    MALLA_C: {
      label: "Malla C · Vehiculares y auxiliares",
      days: {
        1: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        2: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        3: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        4: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        5: ["7:30 a. m.", "5:30 p. m.", "1 hora", 9],
        6: ["7:30 a. m.", "1:30 p. m.", "Sin almuerzo", 6]
      }
    },
    MALLA_D: {
      label: "Malla D · Motorizados",
      days: {
        1: ["7:30 a. m.", "4:30 p. m.", "1 hora", 8],
        2: ["8:30 a. m.", "5:30 p. m.", "1 hora", 8],
        3: ["8:30 a. m.", "5:30 p. m.", "1 hora", 8],
        4: ["8:30 a. m.", "5:30 p. m.", "1 hora", 8],
        5: ["8:30 a. m.", "5:30 p. m.", "1 hora", 8],
        6: ["7:30 a. m.", "1:30 p. m.", "Sin almuerzo", 6]
      }
    }
  },
  people: [
    {name:"CAMILO ANDRES POTES LOZANO",area:"Área Comercial",role:"Asesor Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"ELIZABETH TAMAYO LOPEZ",area:"Área Comercial",role:"Asesora Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"LAURENT DANIEL ARENAS ALZATE",area:"Área Comercial",role:"Asesor Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"LIZETH ASTRID ARANA LOPEZ",area:"Área Comercial",role:"Asesora Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"LUISA MARIA ZUNIGA",area:"Área Comercial",role:"Asesora Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"MARIA LIZANA SÁNCHEZ CASTAÑEDA",area:"Área Comercial",role:"Asesora Comercial",site:"Sede habitual",weeks:["CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB","CON_SAB"]},
    {name:"DIANA LORENA MORENO SALCEDO",area:"Facturación",role:"Asistente Administrativa",site:"Ingenio",weeks:["CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB"]},
    {name:"YAMILETH MORALES ESCOBAR",area:"Tesorería y Recaudo",role:"Tesorería",site:"Ingenio",weeks:["SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB"]},
    {name:"KALETH DAVID GARCIA MORENO",area:"Facturación",role:"Facturador Ingenio",site:"Ingenio",weeks:["KALETH","KALETH","KALETH","KALETH","KALETH","KALETH"]},
    {name:"DAVID ALEJANDRO ARANGO SILVA",area:"Facturación",role:"Facturador Acopi",site:"Acopi",weeks:["SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB"]},
    {name:"SERGIO DUVAL HOYOS CAICEDO",area:"Tesorería y Recaudo",role:"Auxiliar Contable",site:"Ingenio",weeks:["SERGIO","SIN_SAB","SERGIO","SIN_SAB","SERGIO","SIN_SAB"]},
    {name:"ALEXANDER MARTINEZ DIAZ",area:"Distribución vehicular y auxiliares",role:"Operador de distribución vehicular",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"CARLOS CASTRO GONZALEZ",area:"Distribución vehicular y auxiliares",role:"Auxiliar de distribución",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"DANIEL STIVEN RAMOS TORRES",area:"Distribución motorizada",role:"Operador de distribución motorizado",site:"Punto habitual / ruta",weeks:["MALLA_D","MALLA_D","MALLA_D","MALLA_D","MALLA_D","MALLA_D"]},
    {name:"EDGAR RAMIREZ RENGIFO",area:"Distribución vehicular y auxiliares",role:"Operador de distribución vehicular",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"EDIER SANTIAGO HERNANDEZ GONZALEZ",area:"Distribución vehicular y auxiliares",role:"Auxiliar de distribución",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"EDISON RACINES MOSQUERA",area:"Auxiliares líderes de bodega",role:"Jefe de Bodega Broker Nestlé",site:"Acopi",weeks:["SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB"]},
    {name:"JEYSON ARLEX TABORDA LARA",area:"Distribución vehicular y auxiliares",role:"Auxiliar de distribución",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"MICHAELL ANDRES MORENO CALLEJAS",area:"Distribución motorizada",role:"Operador de distribución motorizado",site:"Punto habitual / ruta",weeks:["MALLA_D","MALLA_D","MALLA_D","MALLA_D","MALLA_D","MALLA_D"]},
    {name:"PATRICIA PAOLA PARRA SALAS",area:"Líderes de bodega",role:"Asistente de Gerencia Comercial",site:"Acopi",weeks:["SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB"]},
    {name:"YOHANA ANDREA CARDONA OBANDO",area:"Distribución vehicular y auxiliares",role:"Operadora de distribución vehicular",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"YULIETH MARCELA BEDOYA RUIZ",area:"Líderes de bodega",role:"Jefe de Bodega Broker Cadaya",site:"Acopi",weeks:["CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB"]},
    {name:"WUTER YEINS LOPEZ SALDARIAGA",area:"Distribución vehicular y auxiliares",role:"Operador de distribución vehicular",site:"Punto habitual / ruta",weeks:["MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C","MALLA_C"]},
    {name:"JOAQUIN CAICEDO AGUIRRE",area:"Auxiliares líderes de bodega",role:"Supervisor Logístico",site:"Acopi",weeks:["CON_SAB","SIN_SAB","CON_SAB","SIN_SAB","CON_SAB","SIN_SAB"]}
  ]
};
