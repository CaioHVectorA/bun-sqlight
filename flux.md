# Fluxo da Biblioteca Bun Sqlight

Esta documentação visa oferecer transparência sobre o funcionamento interno da biblioteca Bun Sqlight, facilitando a contribuição e a manutenção futura. Aqui você encontrará o fluxo de execução das queries, desde a inicialização até os detalhes de criação e execução, além de tópicos para futuras melhorias.

## Sumário

- [Fluxo da Biblioteca Bun Sqlight](#fluxo-da-biblioteca-bun-sqlight)
  - [Sumário](#sumário)
  - [1. Inicialização](#1-inicialização)
  - [2. Criação de Tabelas](#2-criação-de-tabelas)
    - [Uso Geral](#uso-geral)
    - [Objeto vs Callback](#objeto-vs-callback)
  - [3. Hooks](#3-hooks)
  - [4. Usagem Geral](#4-usagem-geral)
  - [5. Joins](#5-joins)
  - [6. Possíveis Futuros Problemas e Melhorias](#6-possíveis-futuros-problemas-e-melhorias)
  - [7. Considerações Finais](#7-considerações-finais)

---

## 1. Inicialização

```typescript
import { BunSqlight } from 'bun-sqlight';
const db = new BunSqlight('myDb.db');
```

- **Descrição:**  
  Esse comando gera um arquivo chamado `myDb.db` no diretório atual.  
  A instância `db` é um `DatabaseManager` (definido em `db-manager.ts`), responsável por gerenciar e executar as queries no banco de dados.

---

## 2. Criação de Tabelas

### Uso Geral

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

- **Descrição:**  
  Esses exemplos criam uma tabela com os campos especificados.  
  O `DatabaseManager` utiliza o `QueryBuilder` (`query-builder.ts`) para montar a query de criação da tabela, aceitando tanto um objeto quanto um callback.

### Objeto vs Callback

- **Objeto:**  
  Quando um objeto é passado, o `QueryBuilder` desmembra o objeto e monta a query conforme os campos e valores:

  ```typescript
  this.actualQuery.push({
    query: `CREATE TABLE ${table} (${Object.entries(fields)
      .map(([key, value]) => `${key} ${value}`)
      .join(', ')})`,
    level: QueryLevel.TABLE,
  });
  ```

- **Callback:**  
  Se um callback é fornecido, a função `createSchemaCallback` é utilizada:

  ```typescript
  if (typeof fields === 'function') {
      createSchemaCallback(table, fields, this);
      return this;
  }
  ```

> **Observação:**  
> É esperado que os desenvolvedores utilizem o callback, pois a abordagem é mais intuitiva e facilita a definição da tabela.

---

## 3. Hooks

- **Descrição:**  
  Hooks são funções executadas antes ou depois de um comando no `DatabaseManager`. Eles possibilitam funcionalidades automáticas, como a adição de UUIDs ou a atualização do campo `updated_at`.

- **Circunstâncias para execução de hooks:**
  - Before Update
  - After Update
  - Before Insert
  - After Insert
  - Before Delete
  - After Delete

- **Exemplo de hook para adicionar UUID antes do insert:**

  ```typescript
  this.queryBuilder.db.hooks.beforeInsert.push({
    [this.table]: (q) => {
      const insertIndex = q.findIndex((part) => part.query.startsWith('INSERT INTO'));
      const values = q[insertIndex].query
      .split('VALUES')[1]
      .split('(')[1]
      .split(')')[0]
      .split(',')
      .map((value) => value.trim());
      values.push(`"${crypto.randomUUID()}"`);
      q[insertIndex].query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${values.join(', ')})`;
    },
  });
  ```

> **Nota:**  
> Mesmo que a implementação não seja a mais eficiente, ela cumpre a função esperada.

---

## 4. Usagem Geral

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

- **Descrição:**  
  O `DatabaseManager` utiliza o `QueryBuilder` para montar queries de inserção, atualização e deleção.

---

## 5. Joins

*(Seção reservada para futuras explicações sobre joins)*

---

## 6. Possíveis Futuros Problemas e Melhorias

- **Melhorias na Performance:**  
  Revisar e otimizar a montagem das queries.

- **Implementação de Transações:**  
  Adicionar suporte a transações.

- **Expansão dos Hooks:**  
  Incluir mais hooks para diferentes operações.

- **Suporte a Joins Avançados:**  
  Desenvolver e documentar joins complexos.

- **Integração com Outras Bibliotecas:**  
  Facilitar a integração com ORMs.

- **Testes e Cobertura de Código:**  
  Ampliar a suíte de testes.

---

## 7. Considerações Finais

Esta documentação foi elaborada para oferecer uma visão detalhada do funcionamento interno da biblioteca Bun Sqlight.  
Esperamos que este material facilite a compreensão e a manutenção do sistema, promovendo maior transparência para todos os colaboradores.
****