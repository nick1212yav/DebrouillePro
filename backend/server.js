import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('🚀 Backend DebrouillePro connecté avec succès !')
})

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`)
})
