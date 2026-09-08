const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL;

if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://') || dbUrl.startsWith('prisma://'))) {
  console.log('[db-sync] DATABASE_URL detected. Synchronizing Prisma database schema...');
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-sync] Prisma database schema synchronized successfully.');
  } catch (error) {
    console.warn('[db-sync] Warning: Could not push Prisma schema to database:', error.message);
  }
} else {
  console.log('[db-sync] No valid DATABASE_URL provided. Skipping database synchronization.');
}
