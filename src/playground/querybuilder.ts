import { QueryBuilder } from '../lib/query-builder';

const qb = new QueryBuilder();

qb.select('id', 'name').from('users');

console.log(qb.run());
