export type Position = [number, number]
export type Offset = [number, number]
export type PieceColor = "white" | "black"
export type PieceKind = "peshka" | "horse" | "elephant" | "ladya" | "ferz" | "king"

export type PieceState = {
    id: string
    kind: PieceKind
    color: PieceColor
    name: string
    addres: Position
    hasMoved: boolean
}

export type BoardState = PieceState[]

type PhigureSetup = {
    color: PieceColor
    name: string
    addres: Position
    hasMoved?: boolean
    id?: string
}

export abstract class Phigure {
    public id: string
    public name: string
    public color: PieceColor
    public addres: Position
    public hasMoved: boolean

    protected constructor(set: PhigureSetup) {
        this.id = set.id ?? `${set.color}-${set.name}-${set.addres[0]}-${set.addres[1]}`
        this.color = set.color
        this.addres = [...set.addres]
        this.name = set.name
        this.hasMoved = set.hasMoved ?? false
    }

    move(go: Position): Position {
        this.addres = [...go]
        this.hasMoved = true
        return this.addres
    }

    abstract canMove(board: BoardState): Position[]

    canAttack(board: BoardState): Position[] {
        return this.canMove(board)
    }

    toPieceState(): PieceState {
        return {
            id: this.id,
            kind: this.getKind(),
            color: this.color,
            name: this.name,
            addres: [...this.addres],
            hasMoved: this.hasMoved,
        }
    }

    protected abstract getKind(): PieceKind

    protected getDirectionalMoves(board: BoardState, offsets: Offset[], toEnd = false): Position[] {
        if (toEnd) {
            return this.getLongRangeMoves(board, offsets)
        }

        return offsets
            .map(([dx, dy]) => [this.addres[0] + dx, this.addres[1] + dy] as Position)
            .filter((position) => {
                if (!this.isInsideBoard(position)) {
                    return false
                }

                const piece = getPieceAt(board, position)
                return piece ? piece.color !== this.color : true
            })
    }

    protected getAttackSquaresByOffsets(board: BoardState, offsets: Offset[], toEnd = false): Position[] {
        if (toEnd) {
            return this.getLongRangeAttackSquares(board, offsets)
        }

        return offsets
            .map(([dx, dy]) => [this.addres[0] + dx, this.addres[1] + dy] as Position)
            .filter((position) => this.isInsideBoard(position))
    }

    protected getLongRangeMoves(board: BoardState, directions: Offset[]): Position[] {
        const variants: Position[] = []

        for (const [dx, dy] of directions) {
            let x = this.addres[0] + dx
            let y = this.addres[1] + dy

            while (this.isInsideBoard([x, y])) {
                const target: Position = [x, y]
                const piece = getPieceAt(board, target)

                if (!piece) {
                    variants.push(target)
                } else {
                    if (piece.color !== this.color) {
                        variants.push(target)
                    }
                    break
                }

                x += dx
                y += dy
            }
        }

        return variants
    }

    protected getLongRangeAttackSquares(board: BoardState, directions: Offset[]): Position[] {
        const variants: Position[] = []

        for (const [dx, dy] of directions) {
            let x = this.addres[0] + dx
            let y = this.addres[1] + dy

            while (this.isInsideBoard([x, y])) {
                const target: Position = [x, y]
                variants.push(target)

                if (getPieceAt(board, target)) {
                    break
                }

                x += dx
                y += dy
            }
        }

        return variants
    }

    protected isInsideBoard([x, y]: Position): boolean {
        return x >= 1 && x <= 8 && y >= 1 && y <= 8
    }
}

export class Peshka extends Phigure {
    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        const direction = this.color === "white" ? 1 : -1
        const [x, y] = this.addres
        const variants: Position[] = []

        const oneStep: Position = [x, y + direction]
        if (this.isInsideBoard(oneStep) && !getPieceAt(board, oneStep)) {
            variants.push(oneStep)

            const twoStep: Position = [x, y + direction * 2]
            if (!this.hasMoved && this.isInsideBoard(twoStep) && !getPieceAt(board, twoStep)) {
                variants.push(twoStep)
            }
        }

        for (const dx of [-1, 1]) {
            const attackPosition: Position = [x + dx, y + direction]
            if (!this.isInsideBoard(attackPosition)) {
                continue
            }

            const target = getPieceAt(board, attackPosition)
            if (target && target.color !== this.color) {
                variants.push(attackPosition)
            }
        }

        return variants
    }

    canAttack(_board: BoardState): Position[] {
        const direction = this.color === "white" ? 1 : -1
        return ([-1, 1] as const)
            .map((dx) => [this.addres[0] + dx, this.addres[1] + direction] as Position)
            .filter((position) => this.isInsideBoard(position))
    }

    protected getKind(): PieceKind {
        return "peshka"
    }
}

export class Elephant extends Phigure {
    private readonly directions: Offset[] = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ]

    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        return this.getDirectionalMoves(board, this.directions, true)
    }

    canAttack(board: BoardState): Position[] {
        return this.getAttackSquaresByOffsets(board, this.directions, true)
    }

    protected getKind(): PieceKind {
        return "elephant"
    }
}

export class Horse extends Phigure {
    private readonly offsets: Offset[] = [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
    ]

    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        return this.getDirectionalMoves(board, this.offsets)
    }

    canAttack(board: BoardState): Position[] {
        return this.getAttackSquaresByOffsets(board, this.offsets)
    }

    protected getKind(): PieceKind {
        return "horse"
    }
}

export class Ladya extends Phigure {
    private readonly directions: Offset[] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ]

    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        return this.getDirectionalMoves(board, this.directions, true)
    }

    canAttack(board: BoardState): Position[] {
        return this.getAttackSquaresByOffsets(board, this.directions, true)
    }

    protected getKind(): PieceKind {
        return "ladya"
    }
}

export class Ferz extends Phigure {
    private readonly directions: Offset[] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ]

    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        return this.getDirectionalMoves(board, this.directions, true)
    }

    canAttack(board: BoardState): Position[] {
        return this.getAttackSquaresByOffsets(board, this.directions, true)
    }

    protected getKind(): PieceKind {
        return "ferz"
    }
}

export class King extends Phigure {
    private readonly offsets: Offset[] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ]

    constructor(set: PhigureSetup) {
        super(set)
    }

    canMove(board: BoardState): Position[] {
        return this.getDirectionalMoves(board, this.offsets)
    }

    canAttack(board: BoardState): Position[] {
        return this.getAttackSquaresByOffsets(board, this.offsets)
    }

    protected getKind(): PieceKind {
        return "king"
    }
}

export function createPhigure(piece: PieceState): Phigure {
    const setup: PhigureSetup = {
        id: piece.id,
        color: piece.color,
        name: piece.name,
        addres: piece.addres,
        hasMoved: piece.hasMoved,
    }

    switch (piece.kind) {
        case "peshka":
            return new Peshka(setup)
        case "horse":
            return new Horse(setup)
        case "elephant":
            return new Elephant(setup)
        case "ladya":
            return new Ladya(setup)
        case "ferz":
            return new Ferz(setup)
        case "king":
            return new King(setup)
    }
}

export function getPieceAt(board: BoardState, position: Position): PieceState | undefined {
    return board.find((piece) => isSamePosition(piece.addres, position))
}


export function isSamePosition(left: Position, right: Position): boolean {
    return left[0] === right[0] && left[1] === right[1]
}
