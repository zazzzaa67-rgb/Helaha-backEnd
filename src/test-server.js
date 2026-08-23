import express from 'express'

const app = express()

const server = app.listen(5000, () => {
    console.log('TEST SERVER RUNNING')
})

server.on('close', () => {
    console.log('SERVER CLOSED')
})

server.on('error', (error) => {
    console.error('SERVER ERROR:', error)
})

process.on('exit', (code) => {
    console.log('NODE EXITED:', code)
})