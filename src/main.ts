import express, { Request, Response } from "express"
import path from "path"
import { clickSquare, createInitialGameState, GameState } from "./game"
import { openApiDocument, renderSwaggerHtml } from "./openapi"
import { Position } from "./phigures"

const app = express()
const port = Number(process.env.PORT) || 3456
const publicDir = path.join(__dirname, "..", "public")

let gameState = createInitialGameState()

app.use(express.json())
app.use(express.static(publicDir))

app.get("/api/openapi.json", (_req: Request, res: Response) => {
    res.json(openApiDocument)
})

app.get("/api/docs", (_req: Request, res: Response) => {
    res.type("html").send(renderSwaggerHtml())
})

app.get("/api/game", (_req: Request, res: Response) => {
    res.json(gameState)
})

app.post("/api/click", (req: Request, res: Response) => {
    const { x, y } = req.body as Partial<{ x: number, y: number }>

    if (!isBoardNumber(x) || !isBoardNumber(y)) {
        res.status(400).json({
            error: "Square coordinates must be integers from 1 to 8.",
        })
        return
    }

    const position: Position = [x, y]
    gameState = clickSquare(gameState, position)
    res.json(gameState)
})

app.post("/api/reset", (_req: Request, res: Response) => {
    gameState = createInitialGameState()
    res.json(gameState)
})

app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"))
})

app.listen(port, () => {
    console.log(`Chess UI: http://localhost:${port}`)
})

function isBoardNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8
}
