import express from 'express'
import dotenv from 'dotenv'

import studentsRoutes from './routes/students.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()

app.use((req, res, next) => {
    const origin = req.headers.origin

    if (origin === 'https://helaha-website.vercel.app' || origin === 'http://localhost:5173') {
        res.header('Access-Control-Allow-Origin', origin)
    }

    res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    )

    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
    }

    next()
})

app.use(express.json())

app.use('/api/students', studentsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/', (req, res) => {
    res.json({ message: 'Server is working' })
})

export default app