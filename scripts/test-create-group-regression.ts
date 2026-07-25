/**
 * Run from repo root: npm run test:create-group-regression
 *
 * Regression check for a bug where two POST /api/groups calls for the same
 * user, issued back-to-back, intermittently failed with:
 *   MongoServerError: Only servers in a sharded cluster can start a new
 *   transaction at the active transaction number
 *
 * Root cause: createGroup() and getOrCreateGeneralGroup() ran multiple
 * queries concurrently (Promise.all) against the same ClientSession while a
 * transaction was open. The MongoDB Node driver forbids concurrent use of a
 * single ClientSession — see lib/db/repositories.ts.
 *
 * Requires MONGODB_URI to point at a real deployment that supports
 * transactions (replica set or sharded cluster).
 */
import { randomUUID } from "node:crypto";
import { getCollections, closeMongo, getMongoEnvError } from "../lib/db/mongodb";
import { createGroup } from "../lib/db/repositories";

async function main() {
  const envErr = getMongoEnvError();
  if (envErr) {
    console.error(envErr);
    process.exitCode = 1;
    return;
  }

  const userId = `regression-test-${randomUUID()}`;
  const { groups } = await getCollections();

  try {
    console.log("Creating group A...");
    const a = await createGroup({ userId, name: "Regression Group A" });
    console.log("  ok:", a.id, a.name);

    console.log("Creating group B (immediately after, same user)...");
    const b = await createGroup({ userId, name: "Regression Group B" });
    console.log("  ok:", b.id, b.name);

    console.log("\nPASS: two sequential createGroup() calls succeeded.");
  } catch (error) {
    console.error("\nFAIL: createGroup() threw an error:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await groups.deleteMany({ userId });
    await closeMongo();
  }
}

main();
