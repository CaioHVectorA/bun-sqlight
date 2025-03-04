/**
 * Validates an SQL query and throws an error if malicious patterns are detected.
 *
 * This function scans the query string character by character, ignoring characters
 * inside literals (single or double quotes). If it finds a semicolon (;) outside of
 * literals, it is considered an attempt to chain multiple commands (e.g., "; DROP TABLE users;")
 * and throws an error.
 *
 * Additionally, it checks for other common malicious patterns such as:
 * - Inline comments (--, #, or /*) that might hide malicious intentions.
 * - Improper usage of the UNION clause to inject subqueries.
 * - Tautologies (e.g., OR 1=1) that alter query logic.
 * - Dynamic execution functions (exec, sp_executesql) that may introduce vulnerabilities.
 *
 * Note: Destructive commands (such as DROP TABLE) are not considered malicious by themselves.
 * Therefore, queries like "DROP TABLE users" are allowed as long as they do not contain semicolons.
 *
 * @param {string} query - The SQL query to be validated.
 * @throws {Error} If a malicious pattern is detected.
 */
function validateSQLQuery(query: string): void {
  // Scan for semicolons outside of literals
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    // Toggle single quote state if not inside double quotes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    // Toggle double quote state if not inside single quotes
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // If a semicolon is found outside any literal, throw an error
    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      throw new Error(`Malicious query detected: semicolon found in query "${query}"`);
    }
  }

  // List of other malicious patterns (destructive commands are not targeted on their own)
  const maliciousPatterns: RegExp[] = [
    // Inline comments: --, #, or the beginning of block comments
    /(--|#|\/\*)/,
    // Detect improper use of the UNION clause
    /\bunion\b/i,
    // Tautologies: e.g., OR 1=1 or OR '1'='1'
    /\bor\b\s+(1|true)\s*=\s*(1|true)/i,
    // Dynamic execution functions
    /\bexec\b/i,
    /\bsp_executesql\b/i,
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(query)) {
      throw new Error(`Malicious query detected: pattern '${pattern}' found in query "${query}"`);
    }
  }
}

export { validateSQLQuery };
