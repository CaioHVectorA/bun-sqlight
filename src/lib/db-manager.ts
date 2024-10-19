import { Database } from 'bun:sqlite';
import { QueryBuilder } from './query-builder';

function createDatabaseManager(builder: QueryBuilder, db: Database) {
    const manager = {} as any;

    // Copiar dinamicamente todos os métodos do QueryBuilder para o manager
    const queryBuilderMethods = Object.getOwnPropertyNames(QueryBuilder.prototype).filter(method => method !== 'constructor');

    queryBuilderMethods.forEach(method => {
        manager[method] = (...args: any[]) => {
            // Executa o método no builder
            const builderResult = (builder as any)[method](...args);
            // Se o método for 'run', executa a query no banco de dados
            // console.log({ method })
            if (method.toUpperCase().includes('TABLE')) {
                console.log('Rodou aqui! table')
                // console.log({ builderResult: builderResult.run() })
                // builder.actualQuery = []
                db.exec(builderResult.run()); // Executa a query no banco
                builder.queryBrute = undefined
                return;
            }
            if (method === 'run') {
                console.log('Rodou aqui! run')
                console.log({ builderResult })
                const query = builder.run(); // Obter a query final
                console.log('Executing query:', {query, builderResult});
                return db.query(builderResult).all(); // Executa a query no banco
            }

            return manager; // Retorna o manager para permitir encadeamento
        };
    });

    return manager;
}

const manager = (createDatabaseManager(new QueryBuilder(), new Database('f.db'))) as QueryBuilder
manager.createTable('users', (table) => {
    table.id()
    table.string('name', { default: 'John Doe', unique: true, nullable: false })
    table.integer('age', { default: 18, unique: false, nullable: false })
})
manager.insert('users', { id: 2, name: "Teste", age: 40 }).run()
// CREATE TABLE users (id INTEGER, name TEXT)
// queries
// manager.select('*').from('users').where('id', 1).run();