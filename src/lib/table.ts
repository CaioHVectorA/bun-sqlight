import type { SQLITE_TYPES } from "../utils/sqlite.types"

export type Tables = {
    [key: string]: {
            [key: string]: SQLITE_TYPES
    },
}

// like
// {
//     name: 'users',
//     columns: {
//         id: 'INTEGER',
//         name: 'TEXT'
//     }