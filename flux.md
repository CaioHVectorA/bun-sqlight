# Fluxo da Biblioteca Bun Sqlight
O fluxo interno que acontece por trás dos panos na biblioteca.


### 1. Inicialização
```typescript
import { BunSqlight } from 'bun-sqlight';
const db = new BunSqlight('myDb.db');
```
Isso irá gerar um arquivo chamado `myDb.db` no diretório atual. o db é uma instância de um `DatabaseManager` (`db-manager.ts`), que é responsável por atuar com as queries no banco de dados.

### 2. Criação de Tabelas

#### Geral
```typescript
import { integer, text } from 'bun-sqlight/primitives';
db.createTable('users', {
    id: integer().primaryKey().autoIncrement(),
    name: text().notNull(),
    age: integer().notNull(),
    email: text().unique()
});

// ou

db.createTable('users', (table) => {
    table.integer('id').primaryKey().autoIncrement();
    table.text('name').notNull();
    table.integer('age').notNull();
    table.text('email').unique();
});
```
Isso irá criar uma tabela com esses campos.

O Database Manager invoca o QueryBuilder (`query-builder.ts`) para criar a query de criação de tabela. O QueryBuilder é responsável por criar a query de acordo com os métodos chamados, e no createTable, ele trabalha com um objeto ou com um callback.

No caso do objeto, ele atua da seguinte forma:
```typescript
    this.actualQuery.push({
      query: `CREATE TABLE ${table} (${Object.entries(fields)
        .map(([key, value]) => `${key} ${value}`)
        .join(', ')})`,
      level: QueryLevel.TABLE,
    });
```

Ou seja, ele desmembra o objeto e cria a query de acordo com os campos e valores passados.

Já no caso do callback, ele atua da seguinte forma:
```typescript
if (typeof fields === 'function') {
      createSchemaCallback(table, fields, this);
      return this;
}
// ...
export function createSchemaCallback(table: string, callback: (schema: Schema) => void, queryBuilder: IQueryBuilder) {
    const qb = new QueryBuilder()
    qb.db = queryBuilder.db
    const schema = new Schema(table, qb, queryBuilder)
    callback(schema)
    const commands = schema.queryBuilder.actualQuery
    let query = `CREATE TABLE ${table} (${commands.sort(orderCommands).map(command => command.query).join(', ')})`
    // remove more of one space on query to one space
    query = query.replace(/\s{2,}/g, ' ')
    queryBuilder.queryBrute = query
    // transpile commands to create table syntax
}
```
> É esperado que desenvolvedores utilizem o callback, pois é mais fácil de se trabalhar e mais intuitivo.

Basicamente, a função cria um novo QueryBuilder, um novo Schema e invoca o callback passando o Schema, sendo o callback aquele que o usuário definiu. O Schema lida com o callback e alimenta o queryBuilder com os comandos necessários para criar a tabela. Depois, com o queryBuilder alimentado, podemos empacotar a query, normalizar os espaços e editar a queryBrute do queryBuilder.

> O QueryBuilder possui o queryParts, que é a query organizada, desmembrada e com uma hierarquia de níveis. Entretanto, a queryBrute é a query em si, que pode e vai ser utilizada para overwrites "brutos", como sugere o nome.

E então, a query é enviada para o Database Manager, que a executa.


#### Hooks
Nos callbacks, existe algumas funções pertencentes ao `Schema` que podem ser utilizadas para acelerar o desenvolvimento, são elas:

- `timestamps()`: Adiciona os campos `created_at` e `updated_at` na tabela.
- UUID: Adiciona um campo UUID na tabela.

No caso do UUID e do updated_at, eles inferem campos automatizados, isto é, o UUID tem uma construção automatizado e o updated_at é atualizado automaticamente.

Para resolver isso, por baixo dos panos, o Schema utiliza _hooks_, que adicionam hooks no Database Manager, que são funções que são executadas antes ou depois de um comando ser executado.

Ou seja, a cada execução, o Database Manager checa se há hooks em algumas circunstâncias:
- Before Update
- After Update
- Before Insert
- After Insert
- Before Delete
- After Delete

> Essas circustâncias podem aumentar, caso haja necessidade.

E os hooks são associados às tabelas.

E, em sua respectiva circunstância, ele executa os hooks. 

Por exemplo, no caso do UUID, ele executa o hook antes de inserir, e adiciona um UUID no objeto.
> Talvez a forma não tenha sido a mais eficiente, mas FUNCIONA.

```typescript
    this.queryBuilder.db.hooks.beforeInsert.push({
      [this.table]: (q) => {
        const insertIndex = q.findIndex((part) => part.query.startsWith('INSERT INTO'));
        const insertQuery = q[insertIndex].query;
        const insertQueryParts = insertQuery.split(' ');
        const table = insertQueryParts[2];
        const fields = [];
        const firstField = insertQueryParts.findIndex((parts) => parts.includes('('));
        const lastField = insertQueryParts.findIndex((parts) => parts.includes(')'));
        for (let i = firstField; i < lastField + 1; i++) {
          fields.push(insertQueryParts[i].replace(',', '').replace(')', '').replace('(', ''));
        }
        const values = q[insertIndex].query
          .split('VALUES')[1]
          .split('(')[1]
          .split(')')[0]
          .split(',')
          .map((value) => value.trim());
        fields.push(name);
        values.push(`"${crypto.randomUUID()}"`);
        q[insertIndex].query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
      },
    });
```
Perceba, ele desmembra a query de inserção, pega os campos e valores, adiciona o UUID e recria a query de inserção, que depois é executada.

### 3. Usagem geral
```typescript
const newUser = {
    name: 'John',
    age: 25,
    email: 'gg@gm.co',
}

db.insert('users', newUser)
db.update('users', newUser).where('id', 1)
db.delete('users').where('id', 1)
```

Similar a criação de tabelas, o Database Manager invoca o QueryBuilder para criar a query de acordo com os métodos chamados. 

Vejamos como funciona no insert: 
```typescript
  insert(table: string, data: Record<string, any>): this {
    this.actualQuery.push({
      query: `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${Object.values(data)
        .map((value) => (typeof value === 'string' ? `"${value}"` : value))
        .join(', ')})`,
      level: QueryLevel.CLAUSE,
    });
    return this;
  }
```

Basicamente, ele desmembra o objeto e cria a query de acordo com os campos e valores passados. Em caso de string, ele coloca aspas duplas.

Note que o QueryBuilder possui um nível de hierarquia, que é utilizado para organizar a query de acordo com a ordem de execução.

O nível de hierarquia é definido em `query-level.ts`:
```typescript
export enum QueryLevel {
  CLAUSE = 1,
  TABLE = 2,
  WHERE = 3,
  ORDER_LIMIT = 4,
}
```

E a função que organiza a query de acordo com o nível é a `run`, do QueryBuilder:

```typescript
  run(): string {
    if (this.queryBrute) {
      const temp = this.queryBrute;
      this.queryBrute = undefined;
      return temp;
    }
    const sorted = this.actualQuery.sort((a, b) => a.level - b.level);
    // add AND clause logic
    const queryWithAnd = sorted.map((part, index) => {
      if (index === 0) return part.query;
      const nextPart = sorted[index + 1];
      if (part.level === QueryLevel.WHERE && sorted[index - 1].level === QueryLevel.WHERE && !part.query.startsWith('OR')) {
        return `AND ${part.query}`;
      }
      return part.query;
    });
    this.actualQuery = [];
    return queryWithAnd.join(' ');
  }
  ```
  Então ela checa, como citado antes, se há uma queryBrute, e se houver, ela retorna a queryBrute. Caso contrário, ela ordena a query de acordo com o nível de hierarquia e a retorna.

  Ela possui uma lógica para adicionar o AND nas cláusulas WHERE, para que a query seja válida.

  No fim, ela limpa a query atual, e retorna a query pronta para ser executada.


  #### Joins
  