import { Database as _db} from 'bun:sqlite'
class Database extends _db {
    
    constructor(filename: string) {
        super()
    }
}
