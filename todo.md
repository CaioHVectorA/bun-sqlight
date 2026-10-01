## Features

- [x] Add a querybuilder interface to transform an API to query strings
- [x] Add a schema builder and CLI
  - [x] add date field !!!!!!!
  - [x] Add a schema interface with callback
  - [x] Add hooks to automatically set some columns like (id, created_at, updated_at, uuid)
    - [x] UUID
    - [x] Created_at
    - [x] Updated_at
  - [x] Add table schema in querybuilder in each table created to work with foreign keys with INFERED types and something like that
  - [x] Add alias!
  - [x] Add, refine and test the API for the schema builder
  - [x] Add a CLI to generate the schema
  - [x] Setup a migration architecture
  - [x] Add, refine and test the API for the CLI migration
- [x] Block malicious queries
- [x] Relationship support
  - [x] Return using `asKey` prop, returning one-to-many in a single object with an array
- [x] Add a migration system (`db.migrate`, CLI: `migrate`, `migrate:rollback`, `migrate:status`, `migrate:create`)
- [x] Add a transaction support (`db.transaction(...)`, manual `beginTransaction`, `commit`, `rollback`)
- [x] Add a query logging system (`options.logger`, query string, duration in ms, timestamp, type)
- [x] Add exception approach (Custom typed error hierarchy: `SqlightError`, `SqlightQueryError`, `SqlightSecurityError`, `SqlightValidationError`, `SqlightMigrationError`)
- [x] Database manager API
  - [x] TableRepository / Model active record layer (`db.table(...)`, `db.model(...)` with `find`, `findById`, `findOne`, `findFirst`, `findMany`, `create`, `createMany`, `update`, `updateWhere`, `delete`, `deleteWhere`, `count`, `exists`, `query`)
  - [x] Types and IntelliSense declarations

## Hot fixes, bugs, refactor and improvements
- [x] [Case that all data can be optional or defaulted](https://github.com/CaioHVectorA/bun-sqlight/issues/15)
- [x] [Options and table fields config on a better API](https://github.com/CaioHVectorA/bun-sqlight/issues/16)
- [x] [Automatic alias approach](https://github.com/CaioHVectorA/bun-sqlight/issues/14) 
- [x] Add api layer errors, like using select without from
- [x] Add api layer safeMode and allowAll() override, preventing update or delete without where clause

## Docs
- [x] Create comprehensive github docs (`docs.md`, `README.md`, `flux.md`)
- [ ] Create docs frontend

## Project
- [ ] Logo for the project
- [ ] Website Documentation
- [ ] Deploy the project to npm
