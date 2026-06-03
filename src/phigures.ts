export type Position = [number, number]
export type Offset = [number, number]

export type PhigureParams = {
    points: number
    move: Offset[]
    push: Offset[]
    moduleMove: boolean
    toEnd: boolean
}

type PhigureSetup = {
    name: string
    addres: Position
}

class Phigure {
    public name: string
    public addres: Position
    protected moves: Offset[] = []
    protected hasMoved = false
    protected toEnd = false

    constructor(set: PhigureSetup) {
        this.addres = [...set.addres]
        this.name = set.name
    }

    move(go: Position): Position {
        this.addres = [...go]
        this.hasMoved = true

        return this.addres
    }

    canMove(): Position[] {
        if (this.toEnd) {
            return this.getLongRangeMoves()
        }

        const moveVariants = this.hasMoved ? this.moves.slice(1) : this.moves

        return moveVariants
            .map(([dx, dy]) => [this.addres[0] + dx, this.addres[1] + dy] as Position)
            .filter((position) => this.isInsideBoard(position))
    }

    protected getLongRangeMoves(): Position[] {
        const variants: Position[] = []

        for (const [dx, dy] of this.moves) {
            let x = this.addres[0] + dx
            let y = this.addres[1] + dy

            while (this.isInsideBoard([x, y])) {
                variants.push([x, y])
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
        this.moves = [
            [0, 2],
            [0, 1],
        ]
    }
}

export class Elephant extends Phigure {
    constructor(set: PhigureSetup) {
        super(set)
        this.moves = [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ]
        this.toEnd = true
    }
}
