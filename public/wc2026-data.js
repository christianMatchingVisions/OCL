/**
 * wc2026-data.js — Módulo de datos: Mundial 2026 e historia de la Copa del Mundo.
 * Datos verificados con FIFA, RSSSF y Wikipedia (junio de 2026).
 * Deben coincidir 1:1 con las tablas HTML de /mundial/estadisticas-mundial-2026/.
 * Ranking FIFA: publicación del 10 de junio de 2026, la última antes del torneo.
 * Tabla histórica: hasta Qatar 2022; puntos según el criterio de 3 por victoria.
 * Participaciones de los equipos de 2026: incluyen el Mundial 2026.
 * Vanilla JS, sin dependencias. Lo consume /wc2026-stats.js.
 */
(function () {
  "use strict";

  window.WC2026_DATA = {
    torneo: {
      anio: 2026,
      equipos: 48,
      partidos: 104,
      grupos: 12,
      sedes: 16,
      fechas: "del 11 de junio al 19 de julio de 2026",
      anfitriones: "EE. UU., Canadá y México"
    },

    /* mejorRank: 1 = campeón ... 8 = debuta en 2026 (menor es mejor). */
    equipos: [
      { id: "mexico", nombre: "México", bandera: "🇲🇽", grupo: "A", ranking: 14, confederacion: "CONCACAF", participaciones: 18, titulos: 0, mejor: "Cuartos de final (1970, 1986)", mejorRank: 5 },
      { id: "sudafrica", nombre: "Sudáfrica", bandera: "🇿🇦", grupo: "A", ranking: 60, confederacion: "CAF", participaciones: 4, titulos: 0, mejor: "Fase de grupos (1998, 2002, 2010)", mejorRank: 7 },
      { id: "corea-del-sur", nombre: "Corea del Sur", bandera: "🇰🇷", grupo: "A", ranking: 25, confederacion: "AFC", participaciones: 12, titulos: 0, mejor: "Cuarto lugar (2002)", mejorRank: 4 },
      { id: "republica-checa", nombre: "República Checa", bandera: "🇨🇿", grupo: "A", ranking: 40, confederacion: "UEFA", participaciones: 10, titulos: 0, mejor: "Subcampeón (1934, 1962)", mejorRank: 2 },
      { id: "canada", nombre: "Canadá", bandera: "🇨🇦", grupo: "B", ranking: 30, confederacion: "CONCACAF", participaciones: 3, titulos: 0, mejor: "Fase de grupos (1986, 2022)", mejorRank: 7 },
      { id: "bosnia", nombre: "Bosnia y Herzegovina", bandera: "🇧🇦", grupo: "B", ranking: 64, confederacion: "UEFA", participaciones: 2, titulos: 0, mejor: "Fase de grupos (2014)", mejorRank: 7 },
      { id: "qatar", nombre: "Qatar", bandera: "🇶🇦", grupo: "B", ranking: 56, confederacion: "AFC", participaciones: 2, titulos: 0, mejor: "Fase de grupos (2022)", mejorRank: 7 },
      { id: "suiza", nombre: "Suiza", bandera: "🇨🇭", grupo: "B", ranking: 19, confederacion: "UEFA", participaciones: 13, titulos: 0, mejor: "Cuartos de final (1934, 1938, 1954)", mejorRank: 5 },
      { id: "brasil", nombre: "Brasil", bandera: "🇧🇷", grupo: "C", ranking: 6, confederacion: "CONMEBOL", participaciones: 23, titulos: 5, mejor: "Campeón (1958, 1962, 1970, 1994, 2002)", mejorRank: 1 },
      { id: "marruecos", nombre: "Marruecos", bandera: "🇲🇦", grupo: "C", ranking: 7, confederacion: "CAF", participaciones: 7, titulos: 0, mejor: "Cuarto lugar (2022)", mejorRank: 4 },
      { id: "haiti", nombre: "Haití", bandera: "🇭🇹", grupo: "C", ranking: 83, confederacion: "CONCACAF", participaciones: 2, titulos: 0, mejor: "Fase de grupos (1974)", mejorRank: 7 },
      { id: "escocia", nombre: "Escocia", bandera: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", grupo: "C", ranking: 42, confederacion: "UEFA", participaciones: 9, titulos: 0, mejor: "Fase de grupos (8 veces, 1954-1998)", mejorRank: 7 },
      { id: "estados-unidos", nombre: "Estados Unidos", bandera: "🇺🇸", grupo: "D", ranking: 17, confederacion: "CONCACAF", participaciones: 12, titulos: 0, mejor: "Tercer lugar (1930)", mejorRank: 3 },
      { id: "turquia", nombre: "Turquía", bandera: "🇹🇷", grupo: "D", ranking: 22, confederacion: "UEFA", participaciones: 3, titulos: 0, mejor: "Tercer lugar (2002)", mejorRank: 3 },
      { id: "paraguay", nombre: "Paraguay", bandera: "🇵🇾", grupo: "D", ranking: 41, confederacion: "CONMEBOL", participaciones: 9, titulos: 0, mejor: "Cuartos de final (2010)", mejorRank: 5 },
      { id: "australia", nombre: "Australia", bandera: "🇦🇺", grupo: "D", ranking: 27, confederacion: "AFC", participaciones: 7, titulos: 0, mejor: "Octavos de final (2006, 2022)", mejorRank: 6 },
      { id: "alemania", nombre: "Alemania", bandera: "🇩🇪", grupo: "E", ranking: 10, confederacion: "UEFA", participaciones: 21, titulos: 4, mejor: "Campeón (1954, 1974, 1990, 2014)", mejorRank: 1 },
      { id: "curazao", nombre: "Curazao", bandera: "🇨🇼", grupo: "E", ranking: 82, confederacion: "CONCACAF", participaciones: 1, titulos: 0, mejor: "Debut en 2026", mejorRank: 8 },
      { id: "costa-de-marfil", nombre: "Costa de Marfil", bandera: "🇨🇮", grupo: "E", ranking: 33, confederacion: "CAF", participaciones: 4, titulos: 0, mejor: "Fase de grupos (2006, 2010, 2014)", mejorRank: 7 },
      { id: "ecuador", nombre: "Ecuador", bandera: "🇪🇨", grupo: "E", ranking: 23, confederacion: "CONMEBOL", participaciones: 5, titulos: 0, mejor: "Octavos de final (2006)", mejorRank: 6 },
      { id: "paises-bajos", nombre: "Países Bajos", bandera: "🇳🇱", grupo: "F", ranking: 8, confederacion: "UEFA", participaciones: 12, titulos: 0, mejor: "Subcampeón (1974, 1978, 2010)", mejorRank: 2 },
      { id: "japon", nombre: "Japón", bandera: "🇯🇵", grupo: "F", ranking: 18, confederacion: "AFC", participaciones: 8, titulos: 0, mejor: "Octavos de final (2002, 2010, 2018, 2022)", mejorRank: 6 },
      { id: "suecia", nombre: "Suecia", bandera: "🇸🇪", grupo: "F", ranking: 38, confederacion: "UEFA", participaciones: 13, titulos: 0, mejor: "Subcampeón (1958)", mejorRank: 2 },
      { id: "tunez", nombre: "Túnez", bandera: "🇹🇳", grupo: "F", ranking: 45, confederacion: "CAF", participaciones: 7, titulos: 0, mejor: "Fase de grupos (6 veces, 1978-2022)", mejorRank: 7 },
      { id: "belgica", nombre: "Bélgica", bandera: "🇧🇪", grupo: "G", ranking: 9, confederacion: "UEFA", participaciones: 15, titulos: 0, mejor: "Tercer lugar (2018)", mejorRank: 3 },
      { id: "egipto", nombre: "Egipto", bandera: "🇪🇬", grupo: "G", ranking: 29, confederacion: "CAF", participaciones: 4, titulos: 0, mejor: "Octavos de final (1934)", mejorRank: 6 },
      { id: "iran", nombre: "Irán", bandera: "🇮🇷", grupo: "G", ranking: 20, confederacion: "AFC", participaciones: 7, titulos: 0, mejor: "Fase de grupos (6 veces, 1978-2022)", mejorRank: 7 },
      { id: "nueva-zelanda", nombre: "Nueva Zelanda", bandera: "🇳🇿", grupo: "G", ranking: 85, confederacion: "OFC", participaciones: 3, titulos: 0, mejor: "Fase de grupos (1982, 2010)", mejorRank: 7 },
      { id: "espana", nombre: "España", bandera: "🇪🇸", grupo: "H", ranking: 2, confederacion: "UEFA", participaciones: 17, titulos: 1, mejor: "Campeón (2010)", mejorRank: 1 },
      { id: "cabo-verde", nombre: "Cabo Verde", bandera: "🇨🇻", grupo: "H", ranking: 67, confederacion: "CAF", participaciones: 1, titulos: 0, mejor: "Debut en 2026", mejorRank: 8 },
      { id: "arabia-saudita", nombre: "Arabia Saudita", bandera: "🇸🇦", grupo: "H", ranking: 61, confederacion: "AFC", participaciones: 7, titulos: 0, mejor: "Octavos de final (1994)", mejorRank: 6 },
      { id: "uruguay", nombre: "Uruguay", bandera: "🇺🇾", grupo: "H", ranking: 16, confederacion: "CONMEBOL", participaciones: 15, titulos: 2, mejor: "Campeón (1930, 1950)", mejorRank: 1 },
      { id: "francia", nombre: "Francia", bandera: "🇫🇷", grupo: "I", ranking: 3, confederacion: "UEFA", participaciones: 17, titulos: 2, mejor: "Campeón (1998, 2018)", mejorRank: 1 },
      { id: "senegal", nombre: "Senegal", bandera: "🇸🇳", grupo: "I", ranking: 15, confederacion: "CAF", participaciones: 4, titulos: 0, mejor: "Cuartos de final (2002)", mejorRank: 5 },
      { id: "irak", nombre: "Irak", bandera: "🇮🇶", grupo: "I", ranking: 57, confederacion: "AFC", participaciones: 2, titulos: 0, mejor: "Fase de grupos (1986)", mejorRank: 7 },
      { id: "noruega", nombre: "Noruega", bandera: "🇳🇴", grupo: "I", ranking: 31, confederacion: "UEFA", participaciones: 4, titulos: 0, mejor: "Octavos de final (1998)", mejorRank: 6 },
      { id: "argentina", nombre: "Argentina", bandera: "🇦🇷", grupo: "J", ranking: 1, confederacion: "CONMEBOL", participaciones: 19, titulos: 3, mejor: "Campeón (1978, 1986, 2022)", mejorRank: 1 },
      { id: "argelia", nombre: "Argelia", bandera: "🇩🇿", grupo: "J", ranking: 28, confederacion: "CAF", participaciones: 5, titulos: 0, mejor: "Octavos de final (2014)", mejorRank: 6 },
      { id: "austria", nombre: "Austria", bandera: "🇦🇹", grupo: "J", ranking: 24, confederacion: "UEFA", participaciones: 8, titulos: 0, mejor: "Tercer lugar (1954)", mejorRank: 3 },
      { id: "jordania", nombre: "Jordania", bandera: "🇯🇴", grupo: "J", ranking: 63, confederacion: "AFC", participaciones: 1, titulos: 0, mejor: "Debut en 2026", mejorRank: 8 },
      { id: "portugal", nombre: "Portugal", bandera: "🇵🇹", grupo: "K", ranking: 5, confederacion: "UEFA", participaciones: 9, titulos: 0, mejor: "Tercer lugar (1966)", mejorRank: 3 },
      { id: "rd-congo", nombre: "República Democrática del Congo", bandera: "🇨🇩", grupo: "K", ranking: 46, confederacion: "CAF", participaciones: 2, titulos: 0, mejor: "Fase de grupos (1974)", mejorRank: 7 },
      { id: "uzbekistan", nombre: "Uzbekistán", bandera: "🇺🇿", grupo: "K", ranking: 50, confederacion: "AFC", participaciones: 1, titulos: 0, mejor: "Debut en 2026", mejorRank: 8 },
      { id: "colombia", nombre: "Colombia", bandera: "🇨🇴", grupo: "K", ranking: 13, confederacion: "CONMEBOL", participaciones: 7, titulos: 0, mejor: "Cuartos de final (2014)", mejorRank: 5 },
      { id: "inglaterra", nombre: "Inglaterra", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", grupo: "L", ranking: 4, confederacion: "UEFA", participaciones: 17, titulos: 1, mejor: "Campeón (1966)", mejorRank: 1 },
      { id: "croacia", nombre: "Croacia", bandera: "🇭🇷", grupo: "L", ranking: 11, confederacion: "UEFA", participaciones: 7, titulos: 0, mejor: "Subcampeón (2018)", mejorRank: 2 },
      { id: "ghana", nombre: "Ghana", bandera: "🇬🇭", grupo: "L", ranking: 73, confederacion: "CAF", participaciones: 5, titulos: 0, mejor: "Cuartos de final (2010)", mejorRank: 5 },
      { id: "panama", nombre: "Panamá", bandera: "🇵🇦", grupo: "L", ranking: 34, confederacion: "CONCACAF", participaciones: 2, titulos: 0, mejor: "Fase de grupos (2018)", mejorRank: 7 }
    ],

    /* Las 22 ediciones disputadas, con el total de goles y partidos de cada una. */
    ediciones: [
      { anio: 1930, sede: "Uruguay", campeon: "Uruguay", subcampeon: "Argentina", final: "4-2", goles: 70, partidos: 18 },
      { anio: 1934, sede: "Italia", campeon: "Italia", subcampeon: "Checoslovaquia", final: "2-1 (t. extra)", goles: 70, partidos: 17 },
      { anio: 1938, sede: "Francia", campeon: "Italia", subcampeon: "Hungría", final: "4-2", goles: 84, partidos: 18 },
      { anio: 1950, sede: "Brasil", campeon: "Uruguay", subcampeon: "Brasil", final: "2-1", goles: 88, partidos: 22 },
      { anio: 1954, sede: "Suiza", campeon: "Alemania", subcampeon: "Hungría", final: "3-2", goles: 140, partidos: 26 },
      { anio: 1958, sede: "Suecia", campeon: "Brasil", subcampeon: "Suecia", final: "5-2", goles: 126, partidos: 35 },
      { anio: 1962, sede: "Chile", campeon: "Brasil", subcampeon: "Checoslovaquia", final: "3-1", goles: 89, partidos: 32 },
      { anio: 1966, sede: "Inglaterra", campeon: "Inglaterra", subcampeon: "Alemania", final: "4-2 (t. extra)", goles: 89, partidos: 32 },
      { anio: 1970, sede: "México", campeon: "Brasil", subcampeon: "Italia", final: "4-1", goles: 95, partidos: 32 },
      { anio: 1974, sede: "Alemania", campeon: "Alemania", subcampeon: "Países Bajos", final: "2-1", goles: 97, partidos: 38 },
      { anio: 1978, sede: "Argentina", campeon: "Argentina", subcampeon: "Países Bajos", final: "3-1 (t. extra)", goles: 102, partidos: 38 },
      { anio: 1982, sede: "España", campeon: "Italia", subcampeon: "Alemania", final: "3-1", goles: 146, partidos: 52 },
      { anio: 1986, sede: "México", campeon: "Argentina", subcampeon: "Alemania", final: "3-2", goles: 132, partidos: 52 },
      { anio: 1990, sede: "Italia", campeon: "Alemania", subcampeon: "Argentina", final: "1-0", goles: 115, partidos: 52 },
      { anio: 1994, sede: "Estados Unidos", campeon: "Brasil", subcampeon: "Italia", final: "0-0 (3-2 en penales)", goles: 141, partidos: 52 },
      { anio: 1998, sede: "Francia", campeon: "Francia", subcampeon: "Brasil", final: "3-0", goles: 171, partidos: 64 },
      { anio: 2002, sede: "Corea del Sur y Japón", campeon: "Brasil", subcampeon: "Alemania", final: "2-0", goles: 161, partidos: 64 },
      { anio: 2006, sede: "Alemania", campeon: "Italia", subcampeon: "Francia", final: "1-1 (5-3 en penales)", goles: 147, partidos: 64 },
      { anio: 2010, sede: "Sudáfrica", campeon: "España", subcampeon: "Países Bajos", final: "1-0 (t. extra)", goles: 145, partidos: 64 },
      { anio: 2014, sede: "Brasil", campeon: "Alemania", subcampeon: "Argentina", final: "1-0 (t. extra)", goles: 171, partidos: 64 },
      { anio: 2018, sede: "Rusia", campeon: "Francia", subcampeon: "Croacia", final: "4-2", goles: 169, partidos: 64 },
      { anio: 2022, sede: "Qatar", campeon: "Argentina", subcampeon: "Francia", final: "3-3 (4-2 en penales)", goles: 172, partidos: 64 }
    ],

    /* Clasificación histórica 1930-2022 (top 25 por puntos; 3 por victoria, 1 por empate).
       Rusia incluye a la URSS; Serbia, a Yugoslavia; República Checa y Eslovaquia
       heredan el registro de Checoslovaquia, según la convención de la FIFA. */
    tablaHistorica: [
      { pos: 1, nombre: "Brasil", bandera: "🇧🇷", part: 22, pj: 114, g: 76, e: 19, p: 19, gf: 237, gc: 108, pts: 247, titulos: 5 },
      { pos: 2, nombre: "Alemania", bandera: "🇩🇪", part: 20, pj: 112, g: 68, e: 21, p: 23, gf: 232, gc: 130, pts: 225, titulos: 4 },
      { pos: 3, nombre: "Argentina", bandera: "🇦🇷", part: 18, pj: 88, g: 47, e: 17, p: 24, gf: 152, gc: 101, pts: 158, titulos: 3 },
      { pos: 4, nombre: "Italia", bandera: "🇮🇹", part: 18, pj: 83, g: 45, e: 21, p: 17, gf: 128, gc: 77, pts: 156, titulos: 4 },
      { pos: 5, nombre: "Francia", bandera: "🇫🇷", part: 16, pj: 73, g: 39, e: 14, p: 20, gf: 136, gc: 85, pts: 131, titulos: 2 },
      { pos: 6, nombre: "Inglaterra", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", part: 16, pj: 74, g: 32, e: 22, p: 20, gf: 104, gc: 68, pts: 118, titulos: 1 },
      { pos: 7, nombre: "España", bandera: "🇪🇸", part: 16, pj: 67, g: 31, e: 17, p: 19, gf: 108, gc: 75, pts: 110, titulos: 1 },
      { pos: 8, nombre: "Países Bajos", bandera: "🇳🇱", part: 11, pj: 55, g: 30, e: 14, p: 11, gf: 96, gc: 52, pts: 104, titulos: 0 },
      { pos: 9, nombre: "Uruguay", bandera: "🇺🇾", part: 14, pj: 59, g: 25, e: 13, p: 21, gf: 89, gc: 76, pts: 88, titulos: 2 },
      { pos: 10, nombre: "Bélgica", bandera: "🇧🇪", part: 14, pj: 51, g: 21, e: 10, p: 20, gf: 69, gc: 74, pts: 73, titulos: 0 },
      { pos: 11, nombre: "Suecia", bandera: "🇸🇪", part: 12, pj: 51, g: 19, e: 13, p: 19, gf: 80, gc: 73, pts: 70, titulos: 0 },
      { pos: 12, nombre: "Rusia", bandera: "🇷🇺", part: 11, pj: 45, g: 19, e: 10, p: 16, gf: 77, gc: 54, pts: 67, titulos: 0 },
      { pos: 13, nombre: "México", bandera: "🇲🇽", part: 17, pj: 60, g: 17, e: 15, p: 28, gf: 62, gc: 101, pts: 66, titulos: 0 },
      { pos: 14, nombre: "Serbia", bandera: "🇷🇸", part: 13, pj: 49, g: 18, e: 9, p: 22, gf: 71, gc: 71, pts: 63, titulos: 0 },
      { pos: 15, nombre: "Portugal", bandera: "🇵🇹", part: 8, pj: 35, g: 17, e: 6, p: 12, gf: 61, gc: 41, pts: 57, titulos: 0 },
      { pos: 16, nombre: "Polonia", bandera: "🇵🇱", part: 9, pj: 38, g: 17, e: 6, p: 15, gf: 49, gc: 50, pts: 57, titulos: 0 },
      { pos: 17, nombre: "Suiza", bandera: "🇨🇭", part: 12, pj: 41, g: 14, e: 8, p: 19, gf: 55, gc: 73, pts: 50, titulos: 0 },
      { pos: 18, nombre: "Hungría", bandera: "🇭🇺", part: 9, pj: 32, g: 15, e: 3, p: 14, gf: 87, gc: 57, pts: 48, titulos: 0 },
      { pos: 19, nombre: "Croacia", bandera: "🇭🇷", part: 6, pj: 30, g: 13, e: 8, p: 9, gf: 43, gc: 33, pts: 47, titulos: 0 },
      { pos: 20, nombre: "Eslovaquia", bandera: "🇸🇰", part: 9, pj: 34, g: 12, e: 6, p: 16, gf: 49, gc: 52, pts: 42, titulos: 0 },
      { pos: 21, nombre: "República Checa", bandera: "🇨🇿", part: 9, pj: 33, g: 12, e: 5, p: 16, gf: 47, gc: 49, pts: 41, titulos: 0 },
      { pos: 22, nombre: "Austria", bandera: "🇦🇹", part: 7, pj: 29, g: 12, e: 4, p: 13, gf: 43, gc: 47, pts: 40, titulos: 0 },
      { pos: 23, nombre: "Chile", bandera: "🇨🇱", part: 9, pj: 33, g: 11, e: 7, p: 15, gf: 40, gc: 49, pts: 40, titulos: 0 },
      { pos: 24, nombre: "Estados Unidos", bandera: "🇺🇸", part: 11, pj: 37, g: 9, e: 8, p: 20, gf: 40, gc: 66, pts: 35, titulos: 0 },
      { pos: 25, nombre: "Dinamarca", bandera: "🇩🇰", part: 6, pj: 23, g: 9, e: 6, p: 8, gf: 31, gc: 29, pts: 33, titulos: 0 }
    ],

    /* Los 15 máximos goleadores de la historia de los Mundiales. */
    goleadores: [
      { nombre: "Miroslav Klose", pais: "Alemania", bandera: "🇩🇪", goles: 16, partidos: 24, ediciones: "2002-2014" },
      { nombre: "Ronaldo", pais: "Brasil", bandera: "🇧🇷", goles: 15, partidos: 19, ediciones: "1998-2006" },
      { nombre: "Gerd Müller", pais: "Alemania", bandera: "🇩🇪", goles: 14, partidos: 13, ediciones: "1970-1974" },
      { nombre: "Just Fontaine", pais: "Francia", bandera: "🇫🇷", goles: 13, partidos: 6, ediciones: "1958" },
      { nombre: "Lionel Messi", pais: "Argentina", bandera: "🇦🇷", goles: 13, partidos: 26, ediciones: "2006-2022" },
      { nombre: "Pelé", pais: "Brasil", bandera: "🇧🇷", goles: 12, partidos: 14, ediciones: "1958-1970" },
      { nombre: "Kylian Mbappé", pais: "Francia", bandera: "🇫🇷", goles: 12, partidos: 14, ediciones: "2018-2022" },
      { nombre: "Sándor Kocsis", pais: "Hungría", bandera: "🇭🇺", goles: 11, partidos: 5, ediciones: "1954" },
      { nombre: "Jürgen Klinsmann", pais: "Alemania", bandera: "🇩🇪", goles: 11, partidos: 17, ediciones: "1990-1998" },
      { nombre: "Helmut Rahn", pais: "Alemania", bandera: "🇩🇪", goles: 10, partidos: 10, ediciones: "1954-1958" },
      { nombre: "Gary Lineker", pais: "Inglaterra", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", goles: 10, partidos: 12, ediciones: "1986-1990" },
      { nombre: "Gabriel Batistuta", pais: "Argentina", bandera: "🇦🇷", goles: 10, partidos: 12, ediciones: "1994-2002" },
      { nombre: "Teófilo Cubillas", pais: "Perú", bandera: "🇵🇪", goles: 10, partidos: 13, ediciones: "1970-1982" },
      { nombre: "Thomas Müller", pais: "Alemania", bandera: "🇩🇪", goles: 10, partidos: 19, ediciones: "2010-2022" },
      { nombre: "Grzegorz Lato", pais: "Polonia", bandera: "🇵🇱", goles: 10, partidos: 20, ediciones: "1974-1982" }
    ],

    /* Récords históricos por categoría: goles, jugadores, equipos, asistencia, torneos. */
    records: [
      { id: "mayor-goleada", categoria: "goles", titulo: "Mayor goleada en un partido", valor: "10-1", poseedor: "Hungría vs El Salvador", edicion: "1982" },
      { id: "mas-goles-un-partido", categoria: "goles", titulo: "Más goles en un solo partido (ambos equipos)", valor: "12 goles", poseedor: "Austria 7-5 Suiza", edicion: "1954" },
      { id: "gol-mas-rapido", categoria: "goles", titulo: "Gol más rápido desde el saque inicial", valor: "10.8 segundos", poseedor: "Hakan Şükür (Turquía, ante Corea del Sur)", edicion: "2002" },
      { id: "mas-goles-una-edicion-jugador", categoria: "goles", titulo: "Más goles de un jugador en una sola edición", valor: "13 goles", poseedor: "Just Fontaine (Francia)", edicion: "1958" },
      { id: "mas-goles-un-partido-jugador", categoria: "goles", titulo: "Más goles de un jugador en un solo partido", valor: "5 goles", poseedor: "Oleg Salenko (Rusia, ante Camerún)", edicion: "1994" },
      { id: "final-con-mas-goles", categoria: "goles", titulo: "La final con más goles", valor: "7 goles", poseedor: "Brasil 5-2 Suecia", edicion: "1958" },
      { id: "mas-goles-carrera", categoria: "jugadores", titulo: "Más goles en Mundiales en toda una carrera", valor: "16 goles", poseedor: "Miroslav Klose (Alemania)", edicion: "2002-2014" },
      { id: "mas-partidos-jugados", categoria: "jugadores", titulo: "Más partidos jugados en Mundiales", valor: "26 partidos", poseedor: "Lionel Messi (Argentina)", edicion: "2006-2022" },
      { id: "mas-titulos-jugador", categoria: "jugadores", titulo: "Más títulos mundiales como jugador", valor: "3 títulos", poseedor: "Pelé (Brasil)", edicion: "1958, 1962, 1970" },
      { id: "goleador-mas-joven", categoria: "jugadores", titulo: "Goleador más joven de la historia", valor: "17 años y 239 días", poseedor: "Pelé (Brasil, ante Gales)", edicion: "1958" },
      { id: "goleador-mayor-edad", categoria: "jugadores", titulo: "Goleador de mayor edad de la historia", valor: "42 años y 39 días", poseedor: "Roger Milla (Camerún, ante Rusia)", edicion: "1994" },
      { id: "goles-en-cinco-mundiales", categoria: "jugadores", titulo: "Único jugador con goles en cinco Mundiales distintos", valor: "5 torneos", poseedor: "Cristiano Ronaldo (Portugal)", edicion: "2006-2022" },
      { id: "mas-mundiales-jugados", categoria: "jugadores", titulo: "Más Mundiales disputados por un jugador", valor: "5 ediciones", poseedor: "Antonio Carbajal, Lothar Matthäus, Rafael Márquez, Andrés Guardado, Lionel Messi y Cristiano Ronaldo", edicion: "1950-2022" },
      { id: "mas-titulos-seleccion", categoria: "equipos", titulo: "Más títulos mundiales de una selección", valor: "5 títulos", poseedor: "Brasil", edicion: "1958-2002" },
      { id: "presente-en-todos", categoria: "equipos", titulo: "Única selección presente en todos los Mundiales", valor: "22 de 22 ediciones hasta 2022 (23 con 2026)", poseedor: "Brasil", edicion: "1930-2026" },
      { id: "mas-finales-seleccion", categoria: "equipos", titulo: "Más finales de Copa del Mundo disputadas", valor: "8 finales", poseedor: "Alemania", edicion: "1954-2014" },
      { id: "bicampeones-consecutivos", categoria: "equipos", titulo: "Únicos bicampeones consecutivos", valor: "2 títulos seguidos", poseedor: "Italia (1934 y 1938) y Brasil (1958 y 1962)", edicion: "1934-1962" },
      { id: "anfitrion-pierde-estreno", categoria: "equipos", titulo: "Primer anfitrión que pierde su partido inaugural", valor: "0-2 ante Ecuador", poseedor: "Qatar", edicion: "2022" },
      { id: "mayor-asistencia-partido", categoria: "asistencia", titulo: "Mayor asistencia oficial en un partido", valor: "173,850 espectadores", poseedor: "Uruguay vs Brasil, Maracaná, Río de Janeiro", edicion: "1950" },
      { id: "mayor-asistencia-total", categoria: "asistencia", titulo: "Mayor asistencia total en un Mundial", valor: "3,587,538 espectadores", poseedor: "Estados Unidos 1994 (52 partidos)", edicion: "1994" },
      { id: "mayor-asistencia-promedio", categoria: "asistencia", titulo: "Mayor asistencia promedio por partido", valor: "68,991 espectadores", poseedor: "Estados Unidos 1994", edicion: "1994" },
      { id: "mas-goles-una-edicion", categoria: "torneos", titulo: "Más goles en una sola edición", valor: "172 goles", poseedor: "Qatar 2022 (64 partidos)", edicion: "2022" },
      { id: "mejor-promedio-goles", categoria: "torneos", titulo: "Mayor promedio de goles por partido", valor: "5.38", poseedor: "Suiza 1954 (140 goles en 26 partidos)", edicion: "1954" },
      { id: "mundial-mas-grande", categoria: "torneos", titulo: "El Mundial más grande de la historia", valor: "48 equipos y 104 partidos", poseedor: "Canadá, México y EE. UU. 2026", edicion: "2026" },
      { id: "triple-anfitrion", categoria: "torneos", titulo: "Primer país en organizar tres Mundiales", valor: "3 ediciones", poseedor: "México", edicion: "1970, 1986, 2026" }
    ],

    /* Títulos por confederación, 1930-2022 (22 ediciones en total). */
    titulosConfederacion: [
      { confederacion: "UEFA", region: "Europa", titulos: 12, color: "#d4a017" },
      { confederacion: "CONMEBOL", region: "Sudamérica", titulos: 10, color: "#22c55e" }
    ]
  };
})();
