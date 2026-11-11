const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL;

if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://') || dbUrl.startsWith('prisma://'))) {
  console.log('[db-sync] DATABASE_URL detected. Synchronizing Prisma database schema...');
  // Colunas de 3D/AR primeiro e à parte: se o `db push` abaixo falhar por dados antigos
  // (ex.: usuário sem passwordHash), o site não pode ficar sem estas colunas.
  try {
    execSync('npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261111000000_product_3d_ar/migration.sql', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-sync] Colunas de 3D/AR garantidas.');
  } catch (error) {
    console.warn('[db-sync] Warning: Could not apply 3D/AR columns:', error.message);
  }

  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-sync] Prisma database schema synchronized successfully.');

    try {
      console.log('[db-sync] Seeding/updating menu products and categories...');
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('[db-sync] Menu products and categories updated successfully.');
    } catch (seedErr) {
      console.warn('[db-sync] Note: Seed step notice:', seedErr.message);
    }
  } catch (error) {
    console.warn('[db-sync] Warning: Could not push Prisma schema to database:', error.message);
  }
} else {
  console.log('[db-sync] No valid DATABASE_URL provided. Skipping database synchronization.');
}
