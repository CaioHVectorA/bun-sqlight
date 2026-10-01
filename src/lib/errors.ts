/**
 * Base error class for all Sqlight errors.
 */
export class SqlightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlightError';
  }
}

/**
 * Thrown when a SQL query execution or compilation fails.
 */
export class SqlightQueryError extends SqlightError {
  public query?: string;

  constructor(message: string, query?: string) {
    super(query ? `${message} in query: "${query}"` : message);
    this.name = 'SqlightQueryError';
    this.query = query;
  }
}

/**
 * Thrown when a potentially dangerous or malicious query pattern is detected.
 */
export class SqlightSecurityError extends SqlightError {
  public pattern?: string;
  public query?: string;

  constructor(message: string, pattern?: string, query?: string) {
    super(message);
    this.name = 'SqlightSecurityError';
    this.pattern = pattern;
    this.query = query;
  }
}

/**
 * Thrown when API usage validation fails (e.g., missing FROM clause in SELECT).
 */
export class SqlightValidationError extends SqlightError {
  constructor(message: string) {
    super(message);
    this.name = 'SqlightValidationError';
  }
}

/**
 * Thrown when migration operations fail.
 */
export class SqlightMigrationError extends SqlightError {
  constructor(message: string) {
    super(message);
    this.name = 'SqlightMigrationError';
  }
}
