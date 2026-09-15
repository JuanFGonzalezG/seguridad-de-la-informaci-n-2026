import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import pg from 'pg'

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT || 3001)
const isProduction = process.env.NODE_ENV === 'production'
const maxAttempts = 5
const lockMinutes = 15
const sessions = new Map()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no esta configurada')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

const clearExpiredAttempts = (user) => {
  if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) <= new Date()) {
    return { intentos: 0, bloqueado_hasta: null }
  }
  return { intentos: user.intentos, bloqueado_hasta: user.bloqueado_hasta }
}

const loginProtection = async (req, res, next) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  if (!username) return next()

  const result = await pool.query(
    `SELECT id, intentos, bloqueado_hasta
     FROM usuarios
     WHERE LOWER(username) = $1`,
    [username],
  )
  const user = result.rows[0]
  if (!user) return next()

  const state = clearExpiredAttempts(user)
  if (state.bloqueado_hasta && new Date(state.bloqueado_hasta) > new Date()) {
    const seconds = Math.ceil((new Date(state.bloqueado_hasta) - Date.now()) / 1000)
    return res.status(429).json({ error: `Demasiados intentos. Intenta de nuevo en ${seconds} segundos.` })
  }

  req.loginUser = { ...user, ...state, username }
  next()
}

app.get('/api/health', async (_req, res) => {
  const result = await pool.query(`
    SELECT
      to_regclass('public.roles') IS NOT NULL AS roles,
      to_regclass('public.usuarios') IS NOT NULL AS usuarios
  `)
  res.json({ ok: true, schema: result.rows[0] })
})

app.get('/api/roles', async (_req, res) => {
  const result = await pool.query('SELECT id, name AS nombre FROM roles ORDER BY id')
  res.json({ roles: result.rows })
})

app.post('/api/register', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const roleId = Number(req.body?.roleId)
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' })
  if (!Number.isInteger(roleId)) return res.status(400).json({ error: 'Selecciona un rol valido.' })
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    return res.status(400).json({ error: 'El usuario debe tener entre 3 y 50 caracteres validos.' })
  }
  if (password.length < 8) return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres.' })

  const roleResult = await pool.query('SELECT id FROM roles WHERE id = $1', [roleId])
  if (!roleResult.rows[0]) return res.status(400).json({ error: 'El rol seleccionado no existe.' })

  const passwordHash = await bcrypt.hash(password, 10)
  try {
    const result = await pool.query(
      `INSERT INTO usuarios (username, password_hash, rol_id)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [username, passwordHash, roleId],
    )
    res.status(201).json({ user: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese usuario ya existe.' })
    throw error
  }
})

app.post('/api/login', loginProtection, async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' })

  const result = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.rol_id, r.name AS rol
     FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
     WHERE LOWER(u.username) = $1`,
    [username],
  )
  const user = result.rows[0]
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false

  if (!valid) {
    if (req.loginUser) {
      const attempts = req.loginUser.intentos + 1
      const lockedUntil = attempts >= maxAttempts
        ? new Date(Date.now() + lockMinutes * 60 * 1000)
        : null
      await pool.query(
        `UPDATE usuarios
         SET intentos = $1, bloqueado_hasta = $2
         WHERE id = $3`,
        [lockedUntil ? 0 : attempts, lockedUntil, req.loginUser.id],
      )
      if (lockedUntil) return res.status(429).json({ error: `Cuenta bloqueada temporalmente durante ${lockMinutes} minutos.` })
    }
    return res.status(401).json({ error: 'Credenciales invalidas.' })
  }

  await pool.query(
    'UPDATE usuarios SET intentos = 0, bloqueado_hasta = NULL WHERE id = $1',
    [user.id],
  )

  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { id: user.id, username: user.username, rol: user.rol })
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000,
  })
  res.json({ user: { username: user.username, rol: user.rol } })
})

const requireAuth = (req, res, next) => {
  const session = sessions.get(req.cookies.session)
  if (!session) return res.status(401).json({ error: 'Sesion no valida.' })
  req.sessionUser = session
  next()
}

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.sessionUser }))

app.post('/api/logout', (req, res) => {
  sessions.delete(req.cookies.session)
  res.clearCookie('session')
  res.status(204).end()
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Error interno del servidor.' })
})

app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`))
