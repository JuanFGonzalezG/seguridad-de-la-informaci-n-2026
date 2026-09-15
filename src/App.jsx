import { useEffect, useState } from 'react'
import {
  limpiarTexto,
  detectarAlgoritmo,
  cifrarCesar,
  descifrarCesar,
  cifrarAfin,
  descifrarAfin,
  cifrarVigenere,
  descifrarVigenere,
  analizarCesar,
  analizarAfin,
  analizarVigenere,
  listaFrecuencias,
} from './algorithms'
import './App.css'

const ALGORITMOS = [
  { id: 'cesar', nombre: 'César'},
  { id: 'afin', nombre: 'Afín'},
  { id: 'vigenere', nombre: 'Vigenère'},
]

const leerRespuestaJson = async (response) => {
  const body = await response.text()
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('El servidor no esta disponible. Ejecuta npm run dev y recarga la pagina.')
  }
}

function LoginView({ onLogin }) {
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [roles, setRoles] = useState([])
  const [roleId, setRoleId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!registering) return
    fetch('/api/roles')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar los roles.')
        return leerRespuestaJson(response)
      })
      .then((data) => {
        setRoles(data.roles)
        setRoleId(String(data.roles[0]?.id || ''))
      })
      .catch((rolesError) => setError(rolesError.message))
  }, [registering])

  const submitLogin = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (registering && password !== confirmation) {
      setError('Las contrasenas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(registering ? '/api/register' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, roleId: registering ? Number(roleId) : undefined }),
      })
      const data = await leerRespuestaJson(response)
      if (!response.ok) throw new Error(data.error || 'No fue posible completar la operacion.')
      if (registering) {
        setRegistering(false)
        setPassword('')
        setConfirmation('')
        setNotice('Cuenta creada. Ahora puedes iniciar sesion.')
      } else {
        onLogin(data.user)
      }
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submitLogin}>
        <h1>{registering ? 'Crear cuenta' : 'Acceso al Sistema'}</h1>
        <label htmlFor="username">Usuario:</label>
        <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ej: usuario" required autoComplete="username" />
        <label htmlFor="password">Contrasena:</label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        {registering && (
          <>
            <label htmlFor="confirmation">Confirmar contrasena:</label>
            <input id="confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
            <label htmlFor="role">Rol:</label>
            <select id="role" value={roleId} onChange={(event) => setRoleId(event.target.value)} required>
              <option value="" disabled>Selecciona un rol</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
            </select>
          </>
        )}
        {notice && <p className="login-notice" role="status">{notice}</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" className="login-submit" disabled={loading}>{loading ? 'Validando...' : registering ? 'Registrarme' : 'Iniciar Sesion'}</button>
        <button type="button" className="login-switch" onClick={() => { setRegistering(!registering); setError(''); setNotice('') }}>
          {registering ? 'Ya tengo una cuenta' : 'Crear una cuenta'}
        </button>
      </form>
    </main>
  )
}

function TablaFrecuencias({ texto }) {
  const frecuencias = listaFrecuencias(texto)

  return (
    <div className="frecuencias-section">
      <h5>Análisis de Frecuencia de Letras</h5>
      <table className="frecuencias-table">
        <thead>
          <tr>
            <th>Letra</th>
            <th>Frecuencia</th>
            <th>Porcentaje</th>
          </tr>
        </thead>
        <tbody>
          {frecuencias.map((frecuencia, indice) => (
            <tr key={frecuencia.letra} className={indice === 0 ? 'highlight-row' : ''}>
              <td className="letra-cell"><strong>{frecuencia.letra}</strong></td>
              <td>{frecuencia.cantidad}</td>
              <td>{frecuencia.porcentaje.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota-frecuencias">Los datos se calculan sobre el texto descifrado. La letra destacada es la más frecuente.</p>
    </div>
  )
}

function EncryptMode({ algoritmo }) {
  const [textoOriginal, setTextoOriginal] = useState('')
  const [clave, setClave] = useState('')
  const [paramA, setParamA] = useState('5')
  const [paramB, setParamB] = useState('7')
  const [cifrado, setCifrado] = useState('')

  const manejarCifrado = () => {
    const texto = limpiarTexto(textoOriginal)
    if (!texto) {
      alert('Por favor ingresa un texto')
      return
    }

    try {
      let resultado
      if (algoritmo === 'cesar') {
        const claveNum = parseInt(clave) || 0
        resultado = cifrarCesar(texto, claveNum)
      } else if (algoritmo === 'afin') {
        const a = parseInt(paramA) || 1
        const b = parseInt(paramB) || 0
        resultado = cifrarAfin(texto, a, b)
      } else {
        if (!clave.trim()) {
          alert('Ingresa una clave')
          return
        }
        resultado = cifrarVigenere(texto, clave)
      }
      setCifrado(resultado)
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="mode-panel">
      <h3>Cifrado {ALGORITMOS.find((algo) => algo.id === algoritmo)?.nombre}</h3>

      <div className="control-group">
        <label>Mensaje:</label>
        <textarea
          value={textoOriginal}
          onChange={(e) => setTextoOriginal(e.target.value)}
          placeholder="Ej: hola"
        />
      </div>

      {algoritmo === 'cesar' && (
        <div className="control-group">
          <label>Saltos:</label>
          <input
            type="number"
            min="0"
            max="26"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej: 3"
          />
        </div>
      )}

      {algoritmo === 'afin' && (
        <>
          <div className="control-group">
            <label>valor de a:</label>
            <input
              type="number"
              value={paramA}
              onChange={(e) => setParamA(e.target.value)}
              placeholder="Ej: 5"
            />
          </div>
          <div className="control-group">
            <label>valor de b:</label>
            <input
              type="number"
              value={paramB}
              onChange={(e) => setParamB(e.target.value)}
              placeholder="Ej: 8"
            />
          </div>
        </>
      )}

      {algoritmo === 'vigenere' && (
        <div className="control-group">
          <label>palabra clave:</label>
          <input
            type="text"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej: clave"
          />
        </div>
      )}

      <button onClick={manejarCifrado} className="btn-primary">
        cifrar
      </button>

      {cifrado && (
        <div className="result-box">
          <label>Texto cifrado</label>
          <textarea readOnly value={cifrado} />
          <button
            className="btn-copy"
            onClick={() => navigator.clipboard.writeText(cifrado)}
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  )
}

function DecryptMode({ algoritmo }) {
  const [textoCifrado, setTextoCifrado] = useState('')
  const [clave, setClave] = useState('')
  const [paramA, setParamA] = useState('5')
  const [paramB, setParamB] = useState('7')
  const [descifrado, setDescifrado] = useState('')
  const [diagnostico, setDiagnostico] = useState(null)
  const [algoritmoDetectado, setAlgoritmoDetectado] = useState(null)
  const [confianza, setConfianza] = useState(0)

  const manejarDescifrado = () => {
    const texto = limpiarTexto(textoCifrado)
    if (!texto) {
      alert('Por favor ingresa un texto cifrado')
      return
    }

    // Detectar algoritmo automáticamente
    const deteccion = detectarAlgoritmo(texto)

    if (deteccion.id === 'insuficiente') {
      alert(`Se necesitan al menos ${deteccion.evidencia.match(/\d+/)?.[0] || 50} letras válidas para distinguir el cifrado`)
      return
    }

    const algoritmoUsado = deteccion.id

    setAlgoritmoDetectado(algoritmoUsado)
    setConfianza(deteccion.confianza)

    try {
      let resultado = ''
      let info = null

      if (algoritmoUsado === 'cesar') {
        info = analizarCesar(texto)
        const claveNum = algoritmo === 'auto' ? info.mejorRotacion : (parseInt(clave) || info.mejorRotacion)
        resultado = descifrarCesar(texto, claveNum)
      } else if (algoritmoUsado === 'afin') {
        info = analizarAfin(texto)
        const a = algoritmo === 'auto' ? info.mejorA : (parseInt(paramA) || info.mejorA)
        const b = algoritmo === 'auto' ? info.mejorB : (parseInt(paramB) || info.mejorB)
        resultado = descifrarAfin(texto, a, b)
      } else if (algoritmoUsado === 'vigenere') {
        info = analizarVigenere(texto)
        if (clave.trim()) {
          resultado = descifrarVigenere(texto, clave)
        } else {
          resultado = info.descifrado
          setClave(info.claveEstimada)
        }
      }
      
      setDescifrado(resultado)
      setDiagnostico(info)
    } catch (error) {
      alert('Error al descifrar: ' + error.message)
      console.error(error)
    }
  }

  return (
    <div className="mode-panel">
      <h3>Descifrar</h3>
      <div className="control-group">
        <label>Mensaje a Descifrar:</label>
        <textarea
          value={textoCifrado}
          onChange={(e) => setTextoCifrado(e.target.value)}
          placeholder="Ej: texto a Descifrar"
        />
      </div>

      {algoritmo === 'cesar' && (
        <div className="control-group">
          <label>Saltos (clave k):</label>
          <input
            type="number"
            min="0"
            max="26"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej: 3"
          />
        </div>
      )}

      {algoritmo === 'afin' && (
        <>
          <div className="control-group">
            <label>valor de a:</label>
            <input
              type="number"
              value={paramA}
              onChange={(e) => setParamA(e.target.value)}
              placeholder="Ej: 5"
            />
          </div>
          <div className="control-group">
            <label>valor de b:</label>
            <input
              type="number"
              value={paramB}
              onChange={(e) => setParamB(e.target.value)}
              placeholder="Ej: 8"
            />
          </div>
        </>
      )}

      {algoritmo === 'vigenere' && (
        <div className="control-group">
          <label>palabra clave:</label>
          <input
            type="text"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Ej: clave"
          />
        </div>
      )}

      <button onClick={manejarDescifrado} className="btn-primary">
        descifrar
      </button>

      {diagnostico && algoritmoDetectado === 'cesar' && (
        <div className="diagnostico-box">
          <h4>Análisis César</h4>
          <div className="info-row">
            <span className="label">Índice de Coincidencia (IC):</span>
            <span className="value">{diagnostico.ic}</span>
            <span className="nota">Esperado: {diagnostico.icEsperado}</span>
          </div>
          <div className="info-row">
            <span className="label">Mejor rotación encontrada:</span>
            <span className="value">k = {diagnostico.mejorRotacion}</span>
            <span className="nota">Chi-cuadrado: {diagnostico.chiCuadrado}</span>
          </div>
          <div className="info-row">
            <span className="label">Método:</span>
            <span className="nota">Fuerza bruta - Prueba de todas las rotaciones posibles</span>
          </div>
          <TablaFrecuencias texto={descifrado} />
        </div>
      )}

      {diagnostico && algoritmoDetectado === 'afin' && (
        <div className="diagnostico-box">
          <h4>Análisis Afín</h4>
          <div className="info-row">
            <span className="label">Índice de Coincidencia (IC):</span>
            <span className="value">{diagnostico.ic}</span>
            <span className="nota">Esperado: {diagnostico.icEsperado}</span>
          </div>
          <div className="info-row">
            <span className="label">Letra más frecuente:</span>
            <span className="value">{diagnostico.letraFrecuente}</span>
          </div>
          <div className="info-row">
            <span className="label">Mejor pareja de parámetros:</span>
            <span className="value">a = {diagnostico.mejorA}, b = {diagnostico.mejorB}</span>
            <span className="nota">Chi-cuadrado: {diagnostico.chiCuadrado}</span>
          </div>
          <div className="info-row">
            <span className="label">Método:</span>
            <span className="nota">Resolución de ecuación lineal - Se buscan parejas válidas (a, b)</span>
          </div>

          {diagnostico.frecuencias && diagnostico.frecuencias.length > 0 && (
            <div className="frecuencias-section">
              <h5>Análisis de Frecuencia de Letras</h5>
              <table className="frecuencias-table">
                <thead>
                  <tr>
                    <th>Letra</th>
                    <th>Frecuencia</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostico.frecuencias.map((freq, idx) => (
                    <tr key={idx} className={idx === 0 ? 'highlight-row' : ''}>
                      <td className="letra-cell"><strong>{freq.letra}</strong></td>
                      <td>{freq.cantidad}</td>
                      <td>{freq.porcentaje}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="nota-frecuencias">Los datos se calculan sobre el texto descifrado. La letra destacada es la más frecuente.</p>
            </div>
          )}
        </div>
      )}

      {diagnostico && algoritmoDetectado === 'vigenere' && (
        <div className="diagnostico-box">
          <h4>Análisis Vigenère</h4>
          <div className="info-row">
            <span className="label">Índice de Coincidencia (IC):</span>
            <span className="value">{diagnostico.ic}</span>
            <span className="nota">Esperado: {diagnostico.icEsperado} - IC bajo detectado ✓</span>
          </div>
          <div className="info-row">
            <span className="label">Longitud de clave sugerida:</span>
            <span className="value">{diagnostico.longitudSugerida}</span>
            <span className="nota">IC en columnas: {diagnostico.icPorColumnas}</span>
          </div>
          <div className="info-row">
            <span className="label">Clave estimada (Kasiski):</span>
            <span className="value">{diagnostico.claveEstimada}</span>
            <span className="nota">Encontradas {diagnostico.repeticiones} repeticiones de trigramas</span>
          </div>
          <div className="info-row">
            <span className="label">Método:</span>
            <span className="nota">Kasiski - Análisis de repeticiones y análisis de frecuencias por columna</span>
          </div>
          <TablaFrecuencias texto={descifrado} />
        </div>
      )}

      {descifrado && (
        <div className="result-box">
          <div className="result-header">
            <strong>Algoritmo:</strong> {ALGORITMOS.find((a) => a.id === algoritmoDetectado)?.nombre}
            <span className="confidence">Confianza: {confianza}%</span>
          </div>
          <label>Texto descifrado</label>
          <textarea readOnly value={descifrado} />
          <button
            className="btn-copy"
            onClick={() => navigator.clipboard.writeText(descifrado)}
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  )
}

function App() {
  const [usuario, setUsuario] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [sidebarAbierta, setSidebarAbierta] = useState(true)
  const [modo, setModo] = useState('cifrar')
  const [algoritmo, setAlgoritmo] = useState('cesar')

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUsuario(data?.user || null))
      .catch(() => setUsuario(null))
      .finally(() => setVerificandoSesion(false))
  }, [])

  const cerrarSesion = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    setUsuario(null)
  }

  if (verificandoSesion) return <div className="session-loading">Verificando sesion...</div>
  if (!usuario) return <LoginView onLogin={setUsuario} />

  return (
    <main className="app-shell">
      <div className={`sidebar ${sidebarAbierta ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setSidebarAbierta(!sidebarAbierta)}
            aria-label="Toggle sidebar"
            title={sidebarAbierta ? 'Cerrar menú' : 'Abrir menú'}
          >
            ☰
          </button>
          <button className="logout-btn" onClick={cerrarSesion}>Cerrar sesion</button>
        </div>

        {sidebarAbierta && (
          <nav className="sidebar-nav">
            {modo === 'cifrar' && (
              <div className="nav-section">
                <h3>Algoritmos</h3>
                {ALGORITMOS.map((algo) => (
                  <button
                    key={algo.id}
                    className={`nav-btn ${algoritmo === algo.id ? 'active' : ''}`}
                    onClick={() => setAlgoritmo(algo.id)}
                  >
                    {algo.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="nav-section">
              <h3>Acciones</h3>
              <button
                className={`nav-btn ${modo === 'cifrar' ? 'active' : ''}`}
                onClick={() => setModo('cifrar')}
              >
                Cifrar
              </button>
              <button
                className={`nav-btn ${modo === 'descifrar' ? 'active' : ''}`}
                onClick={() => {
                  setModo('descifrar')
                  setAlgoritmo('auto')
                }}
              >
                Descifrar
              </button>
            </div>
          </nav>
        )}
      </div>

      <section className="app-content">
        <header className="app-header">
          <h2>{modo === 'cifrar' ? 'Cifrar' : 'Descifrar'}</h2>
        </header>

        {modo === 'cifrar' ? (
          <EncryptMode algoritmo={algoritmo} />
        ) : (
          <DecryptMode algoritmo={algoritmo} />
        )}
      </section>
    </main>
  )
}

export default App
