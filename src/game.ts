import {
    BoardState,
    PieceColor,
    PieceKind,
    PieceState,
    Position,
    createPhigure,
    getPieceAt,
    isSamePosition,
} from "./phigures"

export type GameState = {
    board: BoardState
    currentTurn: PieceColor
    selected: Position | null
    legalMoves: Position[]
    winner: PieceColor | null
    message: string
    lastMove: {
        from: Position
        to: Position
        pieceId: string
    } | null
}

export function createInitialGameState(): GameState {
    return {
        board: createInitialBoard(),
        currentTurn: "white",
        selected: null,
        legalMoves: [],
        winner: null,
        message: "White to move.",
        lastMove: null,
    }
}

export function clickSquare(state: GameState, position: Position): GameState {
    if (state.winner) {
        return {
            ...state,
            message: `Game over. ${getColorLabel(state.winner)} win.`,
        }
    }

    const clickedPiece = getPieceAt(state.board, position)

    if (state.selected) {
        const selectedPiece = getPieceAt(state.board, state.selected)
        if (!selectedPiece) {
            return clearSelection(state, `${getColorLabel(state.currentTurn)} to move.`)
        }

        if (isSamePosition(state.selected, position)) {
            return clearSelection(state, "Selection cleared.")
        }

        if (clickedPiece && clickedPiece.color === state.currentTurn) {
            return selectPiece(state, clickedPiece)
        }

        const isLegalMove = state.legalMoves.some((move) => isSamePosition(move, position))
        if (!isLegalMove) {
            return clearSelection(state, "That move is not allowed.")
        }

        return movePiece(state, selectedPiece, position)
    }

    if (!clickedPiece) {
        return {
            ...state,
            message: `${getColorLabel(state.currentTurn)} to move.`,
        }
    }

    if (clickedPiece.color !== state.currentTurn) {
        return {
            ...state,
            message: `${getColorLabel(state.currentTurn)} to move.`,
        }
    }

    return selectPiece(state, clickedPiece)
}

function selectPiece(state: GameState, piece: PieceState): GameState {
    const legalMoves = getLegalMovesForPiece(state.board, piece)

    return {
        ...state,
        selected: [...piece.addres],
        legalMoves,
        message: legalMoves.length > 0
            ? `${piece.name}: choose a destination square.`
            : `${piece.name} has no legal moves right now.`,
    }
}

function movePiece(state: GameState, piece: PieceState, target: Position): GameState {
    const targetPiece = getPieceAt(state.board, target)
    const nextBoard = simulateMove(state.board, piece.id, target)
    const nextTurn = state.currentTurn === "white" ? "black" : "white"
    const winner = resolveWinner(nextBoard)

    if (winner) {
        return {
            board: nextBoard,
            currentTurn: nextTurn,
            selected: null,
            legalMoves: [],
            winner,
            message: targetPiece?.kind === "king"
                ? `${piece.name} takes the king. ${getColorLabel(winner)} win.`
                : `${getColorLabel(winner)} win.`,
            lastMove: {
                from: [...piece.addres],
                to: [...target],
                pieceId: piece.id,
            },
        }
    }

    const opponentHasMoves = hasAnyLegalMoves(nextBoard, nextTurn)
    const opponentInCheck = isKingInCheck(nextBoard, nextTurn)

    let message = `${getColorLabel(nextTurn)} to move.`
    if (targetPiece) {
        message = `${piece.name} takes ${targetPiece.name}. ${getColorLabel(nextTurn)} to move.`
    }
    if (opponentInCheck) {
        message = `Check on ${getColorLabel(nextTurn)}.`
    }

    if (!opponentHasMoves) {
        if (opponentInCheck) {
            return {
                board: nextBoard,
                currentTurn: nextTurn,
                selected: null,
                legalMoves: [],
                winner: state.currentTurn,
                message: `Checkmate. ${getColorLabel(state.currentTurn)} win.`,
                lastMove: {
                    from: [...piece.addres],
                    to: [...target],
                    pieceId: piece.id,
                },
            }
        }

        return {
            board: nextBoard,
            currentTurn: nextTurn,
            selected: null,
            legalMoves: [],
            winner: null,
            message: "Stalemate. Draw.",
            lastMove: {
                from: [...piece.addres],
                to: [...target],
                pieceId: piece.id,
            },
        }
    }

    return {
        board: nextBoard,
        currentTurn: nextTurn,
        selected: null,
        legalMoves: [],
        winner: null,
        message,
        lastMove: {
            from: [...piece.addres],
            to: [...target],
            pieceId: piece.id,
        },
    }
}

function clearSelection(state: GameState, message: string): GameState {
    return {
        ...state,
        selected: null,
        legalMoves: [],
        message,
    }
}

function getLegalMovesForPiece(board: BoardState, piece: PieceState): Position[] {
    const phigure = createPhigure(piece)
    const candidateMoves = phigure.canMove(board)

    return candidateMoves.filter((move) => {
        const simulatedBoard = simulateMove(board, piece.id, move)
        return !isKingInCheck(simulatedBoard, piece.color)
    })
}

function hasAnyLegalMoves(board: BoardState, color: PieceColor): boolean {
    return board
        .filter((piece) => piece.color === color)
        .some((piece) => getLegalMovesForPiece(board, piece).length > 0)
}

function resolveWinner(board: BoardState): PieceColor | null {
    const whiteKing = board.find((piece) => piece.kind === "king" && piece.color === "white")
    const blackKing = board.find((piece) => piece.kind === "king" && piece.color === "black")

    if (!whiteKing) {
        return "black"
    }

    if (!blackKing) {
        return "white"
    }

    return null
}

function isKingInCheck(board: BoardState, color: PieceColor): boolean {
    const king = board.find((piece) => piece.kind === "king" && piece.color === color)
    if (!king) {
        return true
    }

    return board
        .filter((piece) => piece.color !== color)
        .some((piece) => {
            const phigure = createPhigure(piece)
            return phigure.canAttack(board).some((position) => isSamePosition(position, king.addres))
        })
}

function simulateMove(board: BoardState, pieceId: string, target: Position): BoardState {
    const movingPiece = board.find((piece) => piece.id === pieceId)
    if (!movingPiece) {
        return board
    }

    const updatedBoard = board
        .filter((piece) => piece.id !== pieceId)
        .filter((piece) => !isSamePosition(piece.addres, target))

    const movedPiece: PieceState = {
        ...movingPiece,
        addres: [...target],
        hasMoved: true,
    }

    updatedBoard.push(promoteIfNeeded(movedPiece))

    return updatedBoard
}

function promoteIfNeeded(piece: PieceState): PieceState {
    if (piece.kind !== "peshka") {
        return piece
    }

    if (piece.color === "white" && piece.addres[1] === 8) {
        return {
            ...piece,
            kind: "ferz",
            name: "Queen",
        }
    }

    if (piece.color === "black" && piece.addres[1] === 1) {
        return {
            ...piece,
            kind: "ferz",
            name: "Queen",
        }
    }

    return piece
}

function createInitialBoard(): BoardState {
    const board: BoardState = []

    const backRow: PieceKind[] = ["ladya", "horse", "elephant", "ferz", "king", "elephant", "horse", "ladya"]

    for (let x = 1; x <= 8; x += 1) {
        board.push(createPiece("white", backRow[x - 1], [x, 1], x))
        board.push(createPiece("white", "peshka", [x, 2], x))
        board.push(createPiece("black", "peshka", [x, 7], x))
        board.push(createPiece("black", backRow[x - 1], [x, 8], x))
    }

    return board
}

function createPiece(color: PieceColor, kind: PieceKind, addres: Position, index: number): PieceState {
    return {
        id: `${color}-${kind}-${index}-${addres[1]}`,
        kind,
        color,
        name: getPieceLabel(kind),
        addres,
        hasMoved: false,
    }
}

function getPieceLabel(kind: PieceKind): string {
    switch (kind) {
        case "peshka":
            return "Pawn"
        case "horse":
            return "Knight"
        case "elephant":
            return "Bishop"
        case "ladya":
            return "Rook"
        case "ferz":
            return "Queen"
        case "king":
            return "King"
    }
}

function getColorLabel(color: PieceColor): string {
    return color === "white" ? "White" : "Black"
}
