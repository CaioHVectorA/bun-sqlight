// API Factory para SQL primitives com encadeamento (pipeline)

export type ColumnBuilder = {
  value: string;
  primary(): ColumnBuilder;
  autoincrement(): ColumnBuilder;
  notnull(): ColumnBuilder;
  unique(): ColumnBuilder;
  default(val: string | number): ColumnBuilder;
  nullable(): ColumnBuilder;
  foreign(field: string, reference: string, options: { onDelete: string }): ColumnBuilder;
  onDelete(value: string): ColumnBuilder;
  onUpdate(value: string): ColumnBuilder;
  check(value: string): ColumnBuilder;
  toString(): string;
};

const factory = (primitive: () => string): ColumnBuilder => ({
  value: primitive(),

  primary() {
    this.value += ' ' + primary();
    return this;
  },

  autoincrement() {
    this.value += ' ' + autoincrement();
    return this;
  },

  notnull() {
    this.value += ' ' + notnull();
    return this;
  },

  unique() {
    this.value += ' ' + unique();
    return this;
  },

  default(val: string | number) {
    this.value += ' ' + _default(val.toString());
    return this;
  },

  nullable() {
    this.value += ' ' + nullable();
    return this;
  },

  foreign(field: string, reference: string, options: { onDelete: string }) {
    this.value += ' ' + foreign(field, reference, options);
    return this;
  },

  onDelete(value: string) {
    this.value += ' ' + onDelete(value);
    return this;
  },

  onUpdate(value: string) {
    this.value += ' ' + onUpdate(value);
    return this;
  },

  check(value: string) {
    this.value += ' ' + check(value);
    return this;
  },

  toString() {
    return this.value.trim();
  },
});

// SQLITE 3 Primitives
export const int = () => factory(() => 'INT');
export const string = (size: number = 255) => factory(() => `VARCHAR(${size})`);
export const varchar = (size: number = 255) => factory(() => `VARCHAR(${size})`);
export const text = () => factory(() => 'TEXT');
export const float = () => factory(() => 'FLOAT');
export const double = () => factory(() => 'DOUBLE');
export const decimal = () => factory(() => 'DECIMAL');
export const date = () => factory(() => 'DATE');
export const datetime = () => factory(() => 'DATETIME');
export const timestamp = () => factory(() => 'TIMESTAMP');
export const time = () => factory(() => 'TIME');
export const blob = () => factory(() => 'BLOB');
export const boolean = () => factory(() => 'BOOLEAN');
export const bool = () => factory(() => 'BOOLEAN');
export const integer = () => factory(() => 'INTEGER');
export const uuid = () => factory(() => 'UUID');

// Flags
const primary = () => `PRIMARY KEY`;
const autoincrement = () => `AUTOINCREMENT`;
const notnull = () => `NOT NULL`;
const unique = () => `UNIQUE`;
const _default = (value: string) => `DEFAULT '${value}'`;
const nullable = () => `NULL`;
const foreign = (field: string, reference: string, options: { onDelete: string }) =>
  `FOREIGN KEY (${field}) REFERENCES ${reference} ON DELETE ${options.onDelete}`;
const onDelete = (value: string) => `ON DELETE ${value}`;
const onUpdate = (value: string) => `ON UPDATE ${value}`;
const check = (value: string) => `CHECK (${value})`;

// Exemplo de uso:
// console.log( int().primary().autoincrement().notnull().unique().default(1).toString() );
// console.log( string().notnull().toString() );
