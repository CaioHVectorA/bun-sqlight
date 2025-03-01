## Features

- [x] Add a querybuilder interface to transform an API to query strings
- [ ] Add a schema builder and CLI
  - [x] Add a schema interface with callback
  - [W] Add hooks to automatically set some columns like (id, created_at, updated_at, uuid)
    - [x] UUID
    - [x] Created_at
    - [x] Updated_at
  - [ ] Add table schema in querybuildr ion each table created to work with foreign keys with INFERED types and something like that
  - [X] Add alias!
  - [ ] Add, refine and test the API for the schema builder
  - [ ] Add a CLI to generate the schema
  - [ ] Setup a migration architecture
  - [ ] Add, refine and test the API for the CLI migration
- [ ] Block malicious queries
- [ ] Relationship support
- [ ] Add a migration system
- [ ] Add a transaction support
- [ ] Add a query logging system
- [ ] Add excepction approach

## DX

- [] Add api layer erros, like using select, delete, update without from
- [] Add api layer warnings, to prevent update or delete without where clause -> maybe the userr want to deactivate this config

## Docs

- [] Create docs frontend

## Project

- [ ] Logo for the project
- [ ] Website Documentation
- [ ] Deploy the project to npm
