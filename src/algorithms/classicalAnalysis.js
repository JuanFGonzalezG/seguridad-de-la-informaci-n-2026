export const ALFABETO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
export const MINIMO_CARACTERES = 50

export const FREQ_ESPANOL = {
  A: 12.53, B: 1.42, C: 4.68, D: 5.86, E: 13.68, F: 0.69, G: 1.01, H: 0.70,
  I: 6.25, J: 0.44, K: 0.02, L: 4.97, M: 3.15, N: 6.71, Ñ: 0.31, O: 8.68,
  P: 2.51, Q: 0.88, R: 6.87, S: 7.98, T: 4.63, U: 3.93, V: 0.90, W: 0.01,
  X: 0.22, Y: 0.90, Z: 0.52,
}

export const BIGRAMAS_ESPANOL = {
  'DE': 6.25, 'LA': 4.48, 'QU': 3.97, 'EL': 3.40, 'EN': 2.88, 'RE': 2.65, 'ER': 2.24,
  'LO': 2.20, 'AR': 1.99, 'ES': 1.94, 'LE': 1.87, 'TA': 1.79, 'TE': 1.78, 'OR': 1.68,
  'NT': 1.60, 'DO': 1.55, 'RA': 1.54, 'TO': 1.53, 'ÓN': 1.52, 'ON': 1.49,
}

export const TRIGRAMAS_ESPANOL = {
  'QUE': 3.68, 'DEL': 1.55, 'LAS': 1.42, 'EST': 1.38, 'LOS': 1.35, 'POR': 1.18, 'UNA': 1.13,
  'ARD': 1.10, 'OND': 1.07, 'NTE': 0.95, 'TAR': 0.88, 'MON': 0.82, 'ENT': 0.81, 'UES': 0.79,
}

export const extraerNgramas = (texto, n = 2) => {
  const ngramas = {}
  for (let i = 0; i <= texto.length - n; i++) {
    const ngrama = texto.slice(i, i + n)
    ngramas[ngrama] = (ngramas[ngrama] || 0) + 1
  }
  return ngramas
}

export const puntuacionNgramas = (texto, ngramario = BIGRAMAS_ESPANOL) => {
  const ngramas = extraerNgramas(texto, Object.keys(ngramario)[0]?.length || 2)
  const totalNgramas = Math.max(1, texto.length - (Object.keys(ngramario)[0]?.length || 2) + 1)
  
  const ngramasValidos = Object.keys(ngramario).reduce((suma, ngrama) => {
    return suma + (ngramas[ngrama] || 0)
  }, 0)
  
  return totalNgramas > 0 ? (ngramasValidos / totalNgramas) * 100 : 0
}

export const evaluarCalidadTexto = (texto) => {
  const puntuacionBigramas = puntuacionNgramas(texto, BIGRAMAS_ESPANOL)
  const puntuacionTrigramas = puntuacionNgramas(texto, TRIGRAMAS_ESPANOL)
  
  return {
    bigramas: puntuacionBigramas,
    trigramas: puntuacionTrigramas,
    promedio: (puntuacionBigramas + puntuacionTrigramas) / 2
  }
}

export const limpiarTexto = (texto = '') =>
  texto
    .toUpperCase()
    .replace(/Ñ/g, '§')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/§/g, 'Ñ')
    .split('')
    .filter((caracter) => ALFABETO.includes(caracter))
    .join('')

const indiceDe = (caracter) => ALFABETO.indexOf(caracter)

export const desplazar = (caracter, desplazamiento) => {
  const posicion = (indiceDe(caracter) + desplazamiento) % ALFABETO.length
  return ALFABETO[posicion < 0 ? posicion + ALFABETO.length : posicion]
}

export const indiceCoincidencia = (texto) => {
  const frecuencias = contarFrecuencias(texto)
  const total = texto.length
  const pares = Object.values(frecuencias).reduce((suma, frecuencia) => suma + frecuencia * (frecuencia - 1), 0)
  return total > 1 ? pares / (total * (total - 1)) : 0
}

const indicePromedioPorColumnas = (texto, longitud) => {
  const columnas = Array.from({ length: longitud }, () => '')
  ;[...texto].forEach((letra, posicion) => { columnas[posicion % longitud] += letra })
  return columnas.reduce((suma, columna) => suma + indiceCoincidencia(columna), 0) / longitud
}

export const detectarAlgoritmo = (texto) => {
  const ic = indiceCoincidencia(texto)
  if (texto.length < MINIMO_CARACTERES) {
    return { id: 'insuficiente', nombre: 'Texto muy corto', confianza: 0, evidencia: `Se necesitan ${MINIMO_CARACTERES} letras válidas para diagnóstico fiable. Actual: ${texto.length}` }
  }

  const mejorLongitud = Array.from({ length: 11 }, (_, indice) => indice + 2)
    .map((longitud) => ({ longitud, ic: indicePromedioPorColumnas(texto, longitud) }))
    .sort((a, b) => b.ic - a.ic)[0]

  // Detectar Vigenère (IC bajo y mejora significativa en columnas)
  if (ic < 0.06 && mejorLongitud.ic > ic + 0.012) {
    return {
      id: 'vigenere',
      nombre: 'Vigenère probable',
      confianza: Math.min(99, Math.round(70 + (mejorLongitud.ic - ic) * 500)),
      evidencia: `IC global ${ic.toFixed(4)} (bajo); IC en columnas de longitud ${mejorLongitud.longitud}: ${mejorLongitud.ic.toFixed(4)} (mejora significativa).`
    }
  }

  const candidatosCesar = ataqueCesar(texto)
  const mejorCesar = candidatosCesar[0]

  const { candidatos: candidatosAfin } = ataqueAfin(texto)
  const mejorAfin = candidatosAfin[0]

  const calidadCesar = evaluarCalidadTexto(mejorCesar.texto)
  const calidadAfin = evaluarCalidadTexto(mejorAfin.texto)

  const evidenciaBase =
    `César: a=1, b=${mejorCesar.clave} (χ²=${mejorCesar.chi.toFixed(2)}, n-gramas=${calidadCesar.promedio.toFixed(1)}%) · ` +
    `Afín: a=${mejorAfin.a}, b=${mejorAfin.b} (χ²=${mejorAfin.chi.toFixed(2)}, n-gramas=${calidadAfin.promedio.toFixed(1)}%)`

  if (mejorAfin.a === 1) {
    return {
      id: 'cesar',
      nombre: 'César probable',
      confianza: Math.min(99, Math.round(70 + Math.max(0, ic - 0.06) * 200)),
      evidencia: `${evidenciaBase} → El mejor ajuste Afín usa a=1, equivalente a un desplazamiento César puro.`
    }
  }

  const mejoraChi = mejorCesar.chi > 0 ? (mejorCesar.chi - mejorAfin.chi) / mejorCesar.chi : 0
  const mejoraNgramas = calidadAfin.promedio - calidadCesar.promedio

  const UMBRAL_MEJORA_CHI = 0.15
  const UMBRAL_MEJORA_NGRAMAS = 2

  const esAfin = mejoraChi > UMBRAL_MEJORA_CHI || mejoraNgramas > UMBRAL_MEJORA_NGRAMAS

  if (esAfin) {
    const confianza = Math.min(99, Math.round(60 + mejoraChi * 100 + Math.max(0, mejoraNgramas) * 2))
    return {
      id: 'afin',
      nombre: 'Afín probable',
      confianza,
      evidencia: `${evidenciaBase} → El ajuste con a≠1 mejora sustancialmente (Δχ²=${(mejoraChi * 100).toFixed(1)}%, Δn-gramas=${mejoraNgramas.toFixed(1)}pp) sobre el mejor César.`
    }
  }

  return {
    id: 'cesar',
    nombre: 'César probable',
    confianza: Math.min(99, Math.round(70 + Math.max(0, ic - 0.06) * 200)),
    evidencia: `${evidenciaBase} → La mejora de Afín es marginal; se prefiere la hipótesis más simple (César).`
  }
}

export const contarFrecuencias = (texto) =>
  [...ALFABETO].reduce((frecuencias, letra) => {
    frecuencias[letra] = [...texto].filter((caracter) => caracter === letra).length
    return frecuencias
  }, {})

export const listaFrecuencias = (texto) => {
  const frecuencias = contarFrecuencias(texto)
  return [...ALFABETO]
    .map((letra) => ({ letra, cantidad: frecuencias[letra], porcentaje: texto.length ? frecuencias[letra] / texto.length * 100 : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad || ALFABETO.indexOf(a.letra) - ALFABETO.indexOf(b.letra))
}

export const chiCuadrado = (texto) => {
  const total = texto.length
  if (!total) return Infinity
  const frecuencias = contarFrecuencias(texto)
  return [...ALFABETO].reduce((suma, letra) => {
    const observado = frecuencias[letra]
    const esperado = (FREQ_ESPANOL[letra] / 100) * total
    return esperado > 0 ? suma + ((observado - esperado) ** 2) / esperado : suma
  }, 0)
}

export const cifrarCesar = (texto, clave) => [...texto].map((letra) => desplazar(letra, clave)).join('')
export const descifrarCesar = (texto, clave) => cifrarCesar(texto, -clave)

const validarSoloAlfabeto = (texto) => {
  const invalido = [...texto].find((c) => !ALFABETO.includes(c))
  if (invalido !== undefined) {
    throw new Error(`Carácter no soportado: "${invalido}". Use limpiarTexto() antes de cifrar/descifrar.`)
  }
}

export const cifrarAfin = (texto, a, b) => {
  if (inversoModular(a, ALFABETO.length) === null) {
    throw new Error(`El valor a=${a} no tiene inverso modular`)
  }
  validarSoloAlfabeto(texto)
  return [...texto].map((letra) => desplazar('A', (a * indiceDe(letra) + b) % ALFABETO.length)).join('')
}

export const descifrarAfin = (texto, a, b) => {
  const inverso = inversoModular(a, ALFABETO.length)
  if (inverso === null) throw new Error(`El valor a=${a} no tiene inverso modular`)
  validarSoloAlfabeto(texto)
  return [...texto].map((letra) => desplazar('A', inverso * (indiceDe(letra) - b))).join('')
}
export const cifrarVigenere = (texto, clave) => {
  const claveNormalizada = limpiarTexto(clave)
  if (!claveNormalizada) throw new Error('La clave no puede estar vacía')
  return [...texto].map((letra, indice) => {
    const desplazamiento = indiceDe(claveNormalizada[indice % claveNormalizada.length])
    return desplazar(letra, desplazamiento)
  }).join('')
}

export const descifrarVigenere = (texto, clave) => {
  const claveNormalizada = limpiarTexto(clave)
  if (!claveNormalizada) throw new Error('La clave no puede estar vacía')
  return [...texto].map((letra, indice) => {
    const desplazamiento = indiceDe(claveNormalizada[indice % claveNormalizada.length])
    return desplazar(letra, -desplazamiento)
  }).join('')
}

export const analizarCesar = (texto) => {
  const ic = indiceCoincidencia(texto)
  const candidatos = ataqueCesar(texto)
  const mejorCandidato = candidatos[0]
  const calidadTexto = evaluarCalidadTexto(mejorCandidato.texto)
  
  return {
    ic: ic.toFixed(4),
    icEsperado: '≈ 0.077',
    mejorRotacion: mejorCandidato.clave,
    mejorTexto: mejorCandidato.texto,
    chiCuadrado: mejorCandidato.chi.toFixed(2),
    ngramas: {
      bigramas: calidadTexto.bigramas.toFixed(1) + '%',
      trigramas: calidadTexto.trigramas.toFixed(1) + '%',
      promedio: calidadTexto.promedio.toFixed(1) + '%'
    },
    todosLosCandidatos: candidatos.slice(0, 5).map(c => ({
      k: c.clave,
      texto: c.texto.substring(0, 50),
      chi: c.chi.toFixed(2),
      ngramas: evaluarCalidadTexto(c.texto).promedio.toFixed(1) + '%'
    }))
  }
}

export const analizarAfin = (texto) => {
  const ic = indiceCoincidencia(texto)
  const resultado = ataqueAfin(texto)
  const mejorCandidato = resultado.candidatos[0]
  const mejorTextoDescifrado = mejorCandidato.texto
  
  const frecuenciasDescifrado = listaFrecuencias(mejorTextoDescifrado)
  const letraFrecuente = frecuenciasDescifrado[0]?.letra || 'A'
  
  const topFrecuencias = frecuenciasDescifrado.slice(0, 10).map(f => ({
    letra: f.letra,
    cantidad: f.cantidad,
    porcentaje: f.porcentaje.toFixed(2)
  }))
  
  const calidadTexto = evaluarCalidadTexto(mejorTextoDescifrado)
  
  return {
    ic: ic.toFixed(4),
    icEsperado: '≈ 0.077',
    letraFrecuente: letraFrecuente,
    mejorA: mejorCandidato.a,
    mejorB: mejorCandidato.b,
    mejorTexto: mejorTextoDescifrado,
    chiCuadrado: mejorCandidato.chi.toFixed(2),
    frecuencias: topFrecuencias,
    ngramas: {
      bigramas: calidadTexto.bigramas.toFixed(1) + '%',
      trigramas: calidadTexto.trigramas.toFixed(1) + '%',
      promedio: calidadTexto.promedio.toFixed(1) + '%'
    },
    todosLosCandidatos: resultado.candidatos.slice(0, 3).map(c => ({
      a: c.a,
      b: c.b,
      texto: c.texto.substring(0, 50),
      chi: c.chi.toFixed(2),
      ngramas: evaluarCalidadTexto(c.texto).promedio.toFixed(1) + '%'
    }))
  }
}

export const analizarVigenere = (texto) => {
  const ic = indiceCoincidencia(texto)
  
  const maxLongitudClave = texto.length > 500 ? 12 : 8
  
  const mejorLongitud = Array.from({ length: maxLongitudClave }, (_, indice) => indice + 2)
    .map((longitud) => {
      const columnas = Array.from({ length: longitud }, () => '')
      ;[...texto].forEach((letra, posicion) => { columnas[posicion % longitud] += letra })
      return { longitud, ic: columnas.reduce((suma, columna) => suma + indiceCoincidencia(columna), 0) / longitud }
    })
    .sort((a, b) => b.ic - a.ic)[0]
  
  const resultado = ataqueVigenere(texto)
  const calidadTexto = evaluarCalidadTexto(resultado.descifrado)
  
  return {
    ic: ic.toFixed(4),
    icEsperado: '≈ 0.040',
    icBajo: ic < 0.06,
    longitudSugerida: resultado.longitudSugerida,
    mejorLongitud: mejorLongitud.longitud,
    icPorColumnas: mejorLongitud.ic.toFixed(4),
    claveEstimada: resultado.clave,
    descifrado: resultado.descifrado,
    ngramas: {
      bigramas: calidadTexto.bigramas.toFixed(1) + '%',
      trigramas: calidadTexto.trigramas.toFixed(1) + '%',
      promedio: calidadTexto.promedio.toFixed(1) + '%'
    },
    repeticiones: resultado.repeticiones.length,
    metodo: 'Kasiski - Análisis de repeticiones de trigramas'
  }
}

const inversoModular = (numero, modulo) => {
  for (let candidato = 1; candidato < modulo; candidato += 1) {
    if ((numero * candidato) % modulo === 1) return candidato
  }
  return null
}

export const ataqueCesar = (texto) =>
  Array.from({ length: ALFABETO.length }, (_, clave) => {
    const candidato = descifrarCesar(texto, clave)
    return { clave, texto: candidato, chi: chiCuadrado(candidato) }
  }).sort((a, b) => a.chi - b.chi)

export const ataqueAfin = (texto) => {
  const letraFrecuente = listaFrecuencias(texto)[0]?.letra || 'A'
  const candidatos = []
  for (let a = 1; a < ALFABETO.length; a += 1) {
    const inverso = inversoModular(a, ALFABETO.length)
    if (inverso === null) continue
    let mejor = null
    for (let b = 0; b < ALFABETO.length; b += 1) {
      const candidatoTexto = [...texto]
        .map((letra) => desplazar('A', inverso * (indiceDe(letra) - b)))
        .join('')
      const chi = chiCuadrado(candidatoTexto)
      if (!mejor || chi < mejor.chi) mejor = { a, b, texto: candidatoTexto, chi }
    }
    candidatos.push(mejor)
  }
  candidatos.sort((x, y) => x.chi - y.chi)
  return { letraFrecuente, candidatos }
}

const mejorDesplazamientoColumna = (columna) => {
  let mejor = { desplazamiento: 0, chi: Infinity }
  for (let clave = 0; clave < ALFABETO.length; clave += 1) {
    const candidato = descifrarCesar(columna, clave)
    const chi = chiCuadrado(candidato)
    if (chi < mejor.chi) mejor = { desplazamiento: clave, chi }
  }
  return mejor.desplazamiento
}

const longitudMasVotada = (distancias, maximo = 12) => {
  const votos = Array.from({ length: maximo }, () => 0)
  distancias.forEach((distancia) => {
    for (let longitud = 2; longitud <= maximo; longitud += 1) {
      if (distancia % longitud === 0) votos[longitud - 1] += 1
    }
  })

  const maximoVotos = Math.max(0, ...votos.slice(1))
  if (maximoVotos === 0) return 1
  for (let longitud = maximo; longitud >= 2; longitud -= 1) {
    if (votos[longitud - 1] === maximoVotos) return longitud
  }
  return 1
}

export const ataqueVigenere = (texto) => {
  const repeticiones = {}
  for (let indice = 0; indice < texto.length - 2; indice += 1) {
    const trigram = texto.slice(indice, indice + 3)
    repeticiones[trigram] ||= []
    repeticiones[trigram].push(indice)
  }
  const distancias = Object.values(repeticiones)
    .filter((posiciones) => posiciones.length > 1)
    .flatMap((posiciones) => posiciones.slice(1).map((posicion, indice) => posicion - posiciones[indice]))
  const longitudSugerida = distancias.length ? longitudMasVotada(distancias) : 1
  const desplazamientos = Array.from({ length: longitudSugerida }, (_, indice) => {
    const columna = [...texto].filter((_, posicion) => posicion % longitudSugerida === indice).join('')
    return mejorDesplazamientoColumna(columna)
  })
  const clave = desplazamientos.map((desplazamiento) => ALFABETO[desplazamiento]).join('')
  const descifrado = [...texto].map((letra, indice) => descifrarCesar(letra, desplazamientos[indice % longitudSugerida])).join('')
  return { longitudSugerida, clave, descifrado, repeticiones: Object.keys(repeticiones).filter((trigram) => repeticiones[trigram].length > 1).slice(0, 8) }
}