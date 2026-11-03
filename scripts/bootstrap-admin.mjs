import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'
const { Pool } = pg
const username = process.env.ADMIN_BOOTSTRAP_USERNAME
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
if (!username || !password || password.length < 12) throw new Error('Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD (12+ characters).')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const hash = await bcrypt.hash(password, 12)
await pool.query('INSERT INTO admin (id, username, password_hash) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = true, updated_at = now()', [crypto.randomUUID(), username, hash])
await pool.end()
console.log(`Admin ${username} bootstrapped.`)
