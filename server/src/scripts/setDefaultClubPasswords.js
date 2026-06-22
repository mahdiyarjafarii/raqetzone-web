import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const DEFAULT_PASSWORD = 'raqetzone@2026';
const BCRYPT_ROUNDS = 12;

async function run() {
  console.log('⏳ Hashing default password...');
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  // Only update club owners that don't have a password yet
  const result = await db
    .update(users)
    .set({ passwordHash: hash, isDefaultPassword: true, updatedAt: new Date() })
    .where(eq(users.isClubOwner, true))
    .returning({ id: users.id, phone: users.phone });

  console.log(`✅ Set default password for ${result.length} club owner(s):`);
  result.forEach(u => console.log(`   ${u.phone}`));
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
