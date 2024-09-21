import { describe, test, expect } from 'bun:test'

describe('Warning about dangerous queries', () => {
    test.todo('Should warn if the query has a delete statement without a where clause')
    test.todo('Should warn if the query has an update statement without a where clause')
    test.todo('Should warn if the query has a drop table statement')
    test.todo('Should warn if the query has a drop database statement')
    test.todo('Should warn if the query has a truncate table statement')
    test.todo('Should warn if the query has a create table statement')
    test.todo('Should warn if the query has a sql injection')
    test.todo('The delete warning should not trigger if the delete is used with the force option')
    test.todo('The update warning should not trigger if the update is used with the force option')
})