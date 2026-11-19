import { migrate } from "../src/db/migrate";
import { seed } from "../src/db/seed";
import { databaseUrl } from "../src/db/client";

async function main() {
  await migrate();
  await seed();
  console.log(`Database ready → ${databaseUrl}`);
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
