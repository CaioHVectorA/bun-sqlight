export type TypeTables = Omit<typeof import('./generated')['default'], 'prototype'>;
export type TableNames = keyof TypeTables extends never ? string : keyof TypeTables;
