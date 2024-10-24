import { Database } from 'bun:sqlite';
import { QueryBuilder } from './query-builder';
import { MetricTimer } from '../utils/metric-timer';

export function createDatabaseManager(builder: QueryBuilder, db: Database) {
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
                // console.log('Rodou aqui! table')
                // console.log({ builderResult: builderResult.run() })
                // builder.actualQuery = []
                db.exec(builderResult.run()); // Executa a query no banco
                builder.queryBrute = undefined
                return;
            }
            if (method === 'run') {
                // console.log('Rodou aqui! run')
                const query = builder.run(); // Obter a query final
                // console.log('Executing query:', {query, builderResult});
                return db.query(builderResult).all(); // Executa a query no banco
            }

            return manager; // Retorna o manager para permitir encadeamento
        };
    });

    return manager;
}