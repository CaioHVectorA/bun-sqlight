import type { QueryPart } from "./query-builder";

type Hook = (queryPart: QueryPart) => QueryPart | void;

export interface Hooks {
    beforeSelect?: Hook[];
    afterSelect?: Hook[];
    beforeInsert?: Hook[];
    afterInsert?: Hook[];
    beforeUpdate?: Hook[];
    afterUpdate?: Hook[];
    // Outros hooks...
}