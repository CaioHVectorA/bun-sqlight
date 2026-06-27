#!/usr/bin/env bun
import { resolve } from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command !== 'generate') {
    console.log(`
Bun Sqlight CLI

Usage:
  bun-sqlight generate <schema-file> [output-file]

Commands:
  generate  Executes schema file to generate TS declarations
`);
    process.exit(1);
  }

  const schemaFile = args[1];
  const outputFile = args[2];

  if (!schemaFile) {
    console.error('Error: Please specify a schema file. Usage: bun-sqlight generate <schema-file> [output-file]');
    process.exit(1);
  }

  if (outputFile) {
    process.env.SQLIGHT_GENERATE_PATH = resolve(outputFile);
  }

  const absoluteSchemaPath = resolve(schemaFile);
  console.log(`[Sqlight] Loading schema from: ${absoluteSchemaPath}`);

  try {
    await import(absoluteSchemaPath);
    console.log('[Sqlight] Types generated successfully!');
  } catch (err) {
    console.error('[Sqlight] Failed to generate types:', err);
    process.exit(1);
  }
}

main();
