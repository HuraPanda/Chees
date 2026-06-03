import { Elephant, Peshka } from "./phigures";

const testPeshka = new Peshka({name: "Пешка", addres: [2,2]})
const testElephant = new Elephant({name: "Слон", addres: [3,1]})
console.log(testElephant.addres)
console.log(testElephant.canMove())