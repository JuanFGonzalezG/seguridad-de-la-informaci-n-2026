CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  intentos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMP NULL
);

INSERT INTO roles (name)
VALUES ('Administrador'), ('Usuario')
ON CONFLICT (name) DO NOTHING;

-- Genera password_hash en el backend con bcrypt antes de insertar usuarios.
-- Ejemplo: INSERT INTO usuarios (username, password_hash, rol_id)
-- VALUES ('admin', '$2b$10$...', (SELECT id FROM roles WHERE name = 'Administrador'));
