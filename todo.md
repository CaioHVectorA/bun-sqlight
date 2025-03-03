## Features

- [x] Add a querybuilder interface to transform an API to query strings
- [ ] Add a schema builder and CLI
  - [X] add date field !!!!!!!
  - [x] Add a schema interface with callback
  - [X] Add hooks to automatically set some columns like (id, created_at, updated_at, uuid)
    - [x] UUID
    - [x] Created_at
    - [x] Updated_at
  - [X] Add table schema in querybuilder in each table created to work with foreign keys with INFERED types and something like that
  - [X] Add alias!
  - [ ] Add, refine and test the API for the schema builder
  - [ ] ~~Add a CLI to generate the schema~~
  - [ ] ~~Setup a migration architecture~~
  - [ ] ~~Add, refine and test the API for the CLI migration~~
- [ ] Block malicious queries
- [ ] Relationship support
- [ ] Add a migration system
- [ ] Add a transaction support
- [ ] Add a query logging system
- [ ] Add excepction approach
- [ ] Database manager API
  - [ ] [Needs to adds a command to run queries?](https://github.com/CaioHVectorA/bun-sqlight/issues/4)
  - [ ] [Types!!!](https://github.com/CaioHVectorA/bun-sqlight/issues/19)

## Hot fixes, bugs, refactor and improvements
- [ ] [Case that all data can be optional or defaulted](https://github.com/CaioHVectorA/bun-sqlight/issues/15)
- [ ] [Options and table fields config on a better API](https://github.com/CaioHVectorA/bun-sqlight/issues/16)
- [ ] [Automatic alias approach](https://github.com/CaioHVectorA/bun-sqlight/issues/14) 
- [ ] Add api layer erros(LINT?), like using select, delete, update without from
- [ ] Add api layer warnings, to prevent update or delete without where clause -> maybe the userr want to deactivate this config

## Docs
- [ ] Create github docs
- [ ] Create docs frontend

## Project

- [ ] Logo for the project
- [ ] Website Documentation
- [ ] Deploy the project to npm
