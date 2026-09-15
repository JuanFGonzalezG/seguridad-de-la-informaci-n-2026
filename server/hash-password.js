import bcrypt from 'bcrypt'

const password = process.argv[2]
if (!password) {
  console.error('Uso: node server/hash-password.js "tu-contrasena"')
  process.exit(1)
}

console.log(await bcrypt.hash(password, 10))
