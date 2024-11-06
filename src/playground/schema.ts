import { QueryBuilder } from "../lib/query-builder";

const qb = new QueryBuilder()
qb.createTable('users', (table) => {
    table.string('name')
    table.integer('age')
    table.id()
    table.uuid('uuid')
    table.float('integer')
})
console.log(qb.run())
qb.createTable('product', (table) => {
    table.foreign('user_id', 'users.id')
    table.id()
    table.float('price')
})
console.log(qb.run())