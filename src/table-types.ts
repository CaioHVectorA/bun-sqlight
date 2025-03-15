export type TypeTables = Omit<typeof import('./generated')['default'], 'prototype'>;
export type TableNames = keyof TypeTables;
