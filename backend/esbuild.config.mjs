import { build } from 'esbuild';
import { readFileSync } from 'fs';

const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf8'));
const aliases = tsconfig.compilerOptions.paths ?? {};

// Convert tsconfig paths to esbuild alias format: "@/*" -> "./src/*"
const alias = {};
for (const [key, values] of Object.entries(aliases)) {
  const cleanKey = key.replace('/*', '');
  const cleanVal = values[0].replace('/*', '').replace(/^\.\//, '');
  alias[cleanKey] = `./src/${cleanVal}`;
}

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/server.js',
  sourcemap: true,
  alias,
  external: [
    // Native node modules and large deps that should not be bundled
    'mongoose', 'bullmq', 'ioredis', 'bcryptjs', 'jsonwebtoken',
    'nodemailer', 'mathjs', 'nanoid', 'otpauth', 'qrcode',
    'pino', 'pino-http', 'pino-pretty',
    '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner',
    'express', 'cors', 'helmet', 'express-rate-limit', 'cookie-parser',
    'dotenv', 'dayjs', 'uuid', 'zod',
  ],
});

console.log('Build complete → dist/server.js');
