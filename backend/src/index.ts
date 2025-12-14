import cors from "cors"
import express from "express"

const app = express()
const PORT = process.env.PORT ?? 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
})

// Placeholder API routes
app.get("/api/drawings", (_req, res) => {
  // TODO: Implement drawing list
  res.json({
    drawings: [],
    message: "Drawing list API - not yet implemented",
  })
})

app.get("/api/drawings/:id", (req, res) => {
  // TODO: Implement get drawing by ID
  res.json({
    id: req.params.id,
    message: "Get drawing API - not yet implemented",
  })
})

app.post("/api/drawings", (_req, res) => {
  // TODO: Implement create drawing
  res.status(201).json({
    message: "Create drawing API - not yet implemented",
  })
})

app.put("/api/drawings/:id", (req, res) => {
  // TODO: Implement update drawing
  res.json({
    id: req.params.id,
    message: "Update drawing API - not yet implemented",
  })
})

app.delete("/api/drawings/:id", (req, res) => {
  // TODO: Implement delete drawing
  res.json({
    id: req.params.id,
    message: "Delete drawing API - not yet implemented",
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
