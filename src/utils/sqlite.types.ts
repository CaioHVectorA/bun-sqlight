export type SQLITE_TYPES =
  | 'INTEGER' // Signed integers
  | 'TEXT' // Text strings
  | 'FLOAT' // Floating point numbers
  | 'REAL' // Floating point numbers
  | 'BLOB' // Binary data
  | 'NUMERIC' // Numbers, can include decimals
  | 'BOOLEAN' // Boolean values (stored as INTEGER 0 or 1)
  | 'DATETIME' // Date and time (stored as TEXT or INTEGER)
  | 'DATE' // Date (stored as TEXT or INTEGER)
  | 'TIME' // Time (stored as TEXT or INTEGER)
  | 'UUID' // Universally Unique Identifier (stored as TEXT)
  | `VARCHAR(${string})` // Variable length text
  | 'DECIMAL' // Exact decimal numbers
  | 'DOUBLE' // Double precision floating point
  | 'BIGINT' // Large integers
  | 'CHAR' // Fixed length text
  | 'NULL' // Null value
  | 'TIMESTAMP'; // Date and time (stored as TEXT or INTEGER)
