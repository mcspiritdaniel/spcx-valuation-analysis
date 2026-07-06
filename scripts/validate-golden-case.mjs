import { readFileSync } from 'fs';
import { runFullEngine } from '../src/engine/operating_engine.mjs';

const schema = JSON.parse(
  readFileSync(new URL('../spcx_control_schema.json', import.meta.url), 'utf8')
);

const result = runFullEngine(schema);
const perShare = result.valuation.perShareRounded;

if (perShare !== 85) {
  console.error(`Golden case failed: expected perShareRounded=85, got ${perShare}`);
  process.exit(1);
}

console.log(`Golden case passed: perShareRounded = ${perShare}`);
