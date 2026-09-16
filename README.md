# Seguridad de la Información 2026

Proyecto de autenticación segura con Node.js, Express, PostgreSQL, React y BCrypt.

## Comandos principales y su función

Estos son los comandos más importantes para ejecutar y probar la aplicación:

```bash
npm install
```
Instala todas las dependencias del proyecto.

```bash
npm run dev
```
Ejecuta el backend y el frontend en paralelo para desarrollo se usa para ejecutar globalmente el programa.

```bash
npm run server
```
Inicia únicamente el backend Express.

```bash
npm run client
```
Inicia únicamente el frontend con Vite.

```bash
npm run build
```
Genera la versión de producción del frontend

## Descripción

Este proyecto implementa una aplicación web con:
- autenticación segura
- hashing de contraseñas con BCrypt
- control de sesiones
- protección básica contra ataques de fuerza bruta
- interfaz en React para la autenticación y un sistema de cifrado clásico

## Requisitos

Antes de ejecutar el proyecto, asegúrate de tener instalado:
- Node.js 18 o superior
- npm
- PostgreSQL
- acceso a una base de datos PostgreSQL (local o remota)

## Estructura del proyecto

```bash
.
├── index.html
├── package.json
├── vite.config.js
├── .env
├── public/
├── server/
│   └── index.js
├── sql/
│   └── schema.sql
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   ├── index.css
│   └── algorithms/
└── README.md
```

## Variables de entorno

Crea o ajusta el archivo `.env` con el siguiente formato:

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/base_datos?sslmode=require
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=development
```

Ejemplo:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/seguridad_db
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=development
```

## Base de datos

1. Crea una base de datos PostgreSQL.
2. Ejecuta el script SQL contenido en `sql/schema.sql`.

Ejemplo con psql:

```bash
psql -U postgres -d seguridad_db -f sql/schema.sql
```

## Instalación

Desde la raíz del proyecto:

```bash
npm install
```

## Ejecución

### Modo desarrollo

Ejecuta frontend y backend en paralelo:

```bash
npm run dev
```

Esto inicia:
- frontend con Vite en el puerto 5173
- backend Express en el puerto 3001

### Solo backend

```bash
npm run server
```

### Solo frontend

```bash
npm run client
```

### Build de producción

```bash
npm run build
```

### Vista previa de producción

```bash
npm run preview
```

## Endpoints principales

### Salud del servidor

```http
GET /api/health
```

### Obtener roles

```http
GET /api/roles
```

### Registrar usuario

```http
POST /api/register
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "password": "12345678",
  "roleId": 1
}
```

### Iniciar sesión

```http
POST /api/login
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "password": "12345678"
}
```

### Obtener sesión actual

```http
GET /api/me
```

### Cerrar sesión

```http
POST /api/logout
```

## Consideraciones de seguridad

- Las contraseñas no se almacenan en texto plano.
- Se usa BCrypt para generar el hash.
- La lógica de autenticación debe ejecutarse en el backend.
- No se recomienda validar credenciales ni autenticación en el navegador.

## Solución de problemas

### Error: DATABASE_URL no está configurada
Verifica que el archivo `.env` exista y contenga la variable `DATABASE_URL`.

### Error de conexión a PostgreSQL
Revisa:
- que la base de datos esté activa
- que el usuario y la contraseña sean correctos
- que la URL en `.env` sea válida

### Error de CORS
Asegúrate de que `CLIENT_ORIGIN` coincida con la URL del frontend, por ejemplo:

```env
CLIENT_ORIGIN=http://localhost:5173
```

## Créditos

Proyecto académico de Seguridad de la Información - 2026.
