export const openApiDocument = {
    openapi: "3.0.3",
    info: {
        title: "Local Chess API",
        version: "1.0.0",
        description: "API for a local two-player chess game with board state, click-to-move interaction, and restart support.",
    },
    tags: [
        {
            name: "Game",
            description: "Read and mutate the current chess match state.",
        },
    ],
    paths: {
        "/api/game": {
            get: {
                tags: ["Game"],
                summary: "Get current game state",
                description: "Returns the full in-memory state of the current chess match.",
                responses: {
                    "200": {
                        description: "Current game state",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/GameState",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/click": {
            post: {
                tags: ["Game"],
                summary: "Handle a board click",
                description: "Selects a piece or performs a move by clicking a board square.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/SquareClickRequest",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Updated game state after handling the click",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/GameState",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid square coordinates",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/reset": {
            post: {
                tags: ["Game"],
                summary: "Restart the game",
                description: "Resets the current match to the initial chess setup.",
                responses: {
                    "200": {
                        description: "Fresh initial game state",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/GameState",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            PieceColor: {
                type: "string",
                enum: ["white", "black"],
            },
            PieceKind: {
                type: "string",
                enum: ["peshka", "horse", "elephant", "ladya", "ferz", "king"],
            },
            Position: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                    type: "integer",
                    minimum: 1,
                    maximum: 8,
                },
                example: [5, 2],
            },
            PieceState: {
                type: "object",
                required: ["id", "kind", "color", "name", "addres", "hasMoved"],
                properties: {
                    id: {
                        type: "string",
                        example: "white-peshka-5-2",
                    },
                    kind: {
                        $ref: "#/components/schemas/PieceKind",
                    },
                    color: {
                        $ref: "#/components/schemas/PieceColor",
                    },
                    name: {
                        type: "string",
                        example: "Pawn",
                    },
                    addres: {
                        $ref: "#/components/schemas/Position",
                    },
                    hasMoved: {
                        type: "boolean",
                        example: false,
                    },
                },
            },
            LastMove: {
                type: "object",
                required: ["from", "to", "pieceId"],
                properties: {
                    from: {
                        $ref: "#/components/schemas/Position",
                    },
                    to: {
                        $ref: "#/components/schemas/Position",
                    },
                    pieceId: {
                        type: "string",
                        example: "white-peshka-5-2",
                    },
                },
            },
            GameState: {
                type: "object",
                required: ["board", "currentTurn", "selected", "legalMoves", "winner", "message", "lastMove"],
                properties: {
                    board: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/PieceState",
                        },
                    },
                    currentTurn: {
                        $ref: "#/components/schemas/PieceColor",
                    },
                    selected: {
                        anyOf: [
                            { $ref: "#/components/schemas/Position" },
                            { type: "null" },
                        ],
                    },
                    legalMoves: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/Position",
                        },
                    },
                    winner: {
                        anyOf: [
                            { $ref: "#/components/schemas/PieceColor" },
                            { type: "null" },
                        ],
                    },
                    message: {
                        type: "string",
                        example: "White to move.",
                    },
                    lastMove: {
                        anyOf: [
                            { $ref: "#/components/schemas/LastMove" },
                            { type: "null" },
                        ],
                    },
                },
            },
            SquareClickRequest: {
                type: "object",
                required: ["x", "y"],
                properties: {
                    x: {
                        type: "integer",
                        minimum: 1,
                        maximum: 8,
                        example: 5,
                    },
                    y: {
                        type: "integer",
                        minimum: 1,
                        maximum: 8,
                        example: 2,
                    },
                },
            },
            ErrorResponse: {
                type: "object",
                required: ["error"],
                properties: {
                    error: {
                        type: "string",
                        example: "Square coordinates must be integers from 1 to 8.",
                    },
                },
            },
        },
    },
} as const

export function renderSwaggerHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Chess API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body {
            margin: 0;
            background: #120909;
        }

        #swagger-ui {
            max-width: 1200px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.ui = SwaggerUIBundle({
            url: "/api/openapi.json",
            dom_id: "#swagger-ui",
            deepLinking: true,
            persistAuthorization: false,
        })
    </script>
</body>
</html>`
}
