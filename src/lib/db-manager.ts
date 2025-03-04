import { Database } from 'bun:sqlite';
import { QueryBuilder } from './query-builder';
import { MetricTimer } from '../utils/metric-timer';
import type { Hooks } from './hooks';
import { validateSQLQuery } from './analyze-is-malicious';

export class DatabaseManager {
  private builder: QueryBuilder;
  private db: Database;
  hooks: Hooks = {
    afterInsert: [],
    afterUpdate: [],
    beforeInsert: [],
    beforeUpdate: [],
    beforeSelect: [],
    afterSelect: [],
  };
  constructor(builder: QueryBuilder, db: Database) {
    this.builder = builder;
    this.db = db;
    this.builder.db = this;
    // Copiar dinamicamente todos os métodos do QueryBuilder para o manager
    const queryBuilderMethods = Object.getOwnPropertyNames(QueryBuilder.prototype).filter((method) => method !== 'constructor');

    queryBuilderMethods.forEach((method) => {
      (this as any)[method] = (...args: any[]) => {
        // Executa o método no builder
        const builderResult = (this.builder as any)[method](...args);
        if (method == 'insert') {
          const callbacks = this.hooks.beforeInsert
            .filter((action) => {
              return !!action[args[0]];
            })
            .map((action) => action[args[0]]);
          callbacks.forEach((callback) => {
            const resQuery = callback((builderResult as QueryBuilder).actualQuery);
          });
          // this.hooks.beforeInsert.forEach(hook => hook[this.builder.actualQuery[1].query](builderResult));
        }
        if (method == 'update') {
          const callbacks = this.hooks.beforeUpdate
            .filter((action) => {
              return !!action[args[0]];
            })
            .map((action) => action[args[0]]);
          callbacks.forEach((callback) => {
            const resQuery = callback((builderResult as QueryBuilder).actualQuery);
          });
        }
        if (method.toUpperCase().includes('TABLE')) {
          const query = builderResult.run(); // Obter a query final
          console.log(`Running query: \n ${query}`);
          validateSQLQuery(query);
          this.db.exec(query); // Executa a query no banco
          this.builder.queryBrute = undefined;
          return;
        }
        if (method === 'run') {
          const query = this.builder.run(); // Obter a query final
          // return this.db.query(builderResult).all(); // Executa a query no banco
          validateSQLQuery(query);
          console.log(`Running query: \n ${builderResult ?? query}`);
          return this.db.query(builderResult).all(); // Executa a query no banco
        }

        return this; // Retorna o manager para permitir encadeamento
      };
    });
  }
  static getDb(db: string) {
    return new Database(db);
  }
  close() {
    this.db.close();
  }
  raw(query: string) {
    validateSQLQuery(query);
    return this.db.query(query).all();
  }
}
