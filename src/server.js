import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import studentsRoutes from './routes/students.js'
import adminRoutes from './routes/admin.js'
dotenv.config()
const app = express()
const allowedOrigins = [
    'http://localhost:5173',
    'https://helaha-website.vercel.app',
]
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests without an Origin
        if (!origin) {
            return callback(null, true)
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options('*', cors())
app.use(express.json())
app.use('/api/students', studentsRoutes)
app.use('/api/admin', adminRoutes)
app.get('/', (req, res) => {
    res.json({
        message: 'Server is working',
    })
})
export default app