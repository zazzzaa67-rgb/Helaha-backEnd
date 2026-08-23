import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'

import studentsRoutes from './routes/students.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use('/api/students', studentsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/', (req, res) => {
    res.json({ message: 'Server is working' })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})