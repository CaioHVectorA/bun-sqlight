import type { QueryPart } from "./query-builder";

type Action = (queryPart: QueryPart[]) => QueryPart[] | void;
type TableName = string;
type Hook = Record<TableName, Action>;

export interface Hooks {
    beforeSelect: Hook[];
    afterSelect: Hook[];
    beforeInsert: Hook[];
    afterInsert: Hook[];
    beforeUpdate: Hook[];
    afterUpdate: Hook[];
    // Outros hooks...
}