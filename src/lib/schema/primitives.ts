// TODO
// motivation: To improve DX, the user dont need to type the primitives.
// expected usage:
//
// int()
// int().primary().autoincrement().notnull().unique()
// int().primary().autoincrement().notnull().unique().default(1)
// string().notnull()

// SQLITE 3 Primitives
const factory = (primitive: () => string) => {
  let query = primitive();
};
export const int = () => 'INT';
export const string = (size: number = 255) => `VARCHAR(${size})`;
export const varchar = (size: number = 255) => `VARCHAR(${size})`;
export const text = () => `TEXT`;
export const float = () => `FLOAT`;
export const double = () => `DOUBLE`;
export const decimal = () => `DECIMAL`;
export const date = () => `DATE`;
export const datetime = () => `DATETIME`;
export const timestamp = () => `TIMESTAMP`;
export const time = () => `TIME`;
export const blob = () => `BLOB`;
export const boolean = () => `BOOLEAN`;
export const bool = () => `BOOLEAN`;
export const integer = () => `INTEGER`;
export const uuid = () => `UUID`;

// flags
export const primary = () => `PRIMARY KEY`;
export const autoincrement = () => `AUTOINCREMENT`;
export const notnull = () => `NOT NULL`;
export const unique = () => `UNIQUE`;
export const _default = (value: string) => `DEFAULT '${value}'`;
export const nullable = () => `NULL`;
export const foreign = (field: string, reference: string, options: { onDelete: string }) =>
  `FOREIGN KEY (${field}) REFERENCES ${reference} ON DELETE ${options.onDelete}`;
export const onDelete = (value: string) => `ON DELETE ${value}`;
export const onUpdate = (value: string) => `ON UPDATE ${value}`;
export const check = (value: string) => `CHECK (${value})`;

const flags = {
  primary,
  autoincrement,
  notnull,
  unique,
  _default,
  nullable,
  foreign,
  onDelete,
  onUpdate,
  check,
};
