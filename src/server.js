import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import studentsRoutes from './routes/students.js'
import adminRoutes from './routes/admin.js'
dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/students', studentsRoutes)
app.use('/api/admin', adminRoutes)
app.get('/', (req, res) => {
    res.json({ message: 'Server is working' })
})
export default app