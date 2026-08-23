import express from 'express'
import dotenv from 'dotenv'
import studentsRoutes from './routes/students.js'
import adminRoutes from './routes/admin.js'
dotenv.config()
const app = express()
// ===============================
// CORS
// ===============================
const allowedOrigins = [
    'http://localhost:5173',
    'https://helaha-website.vercel.app',
]
app.use((req, res, next) => {
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    )
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    )
    res.setHeader('Vary', 'Origin')
    // Handle browser preflight request
    if (req.method === 'OPTIONS') {
        return res.status(204).end()
    }
    next()
})
// ===============================
// Body
// ===============================

app.use(express.json())
// ===============================
// Routes
// ===============================
app.use('/api/students', studentsRoutes)
app.use('/api/admin', adminRoutes)
// ===============================
// Test
// ===============================
app.get('/', (req, res) => {
    res.json({
        message: 'Server is working',
    })
})
// ===============================
// Vercel
// ===============================
export default app