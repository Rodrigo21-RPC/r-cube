/** npm run db:seed: carga los datos de demostración en la base de DATABASE_URL (FR-035). */
import { createDb } from "./client";
import { runSeed } from "./seed-data";

const url = process.env.DATABASE_URL;
const admin = process.env.SEED_ADMIN_PASSWORD;
const customer = process.env.SEED_CUSTOMER_PASSWORD;
if (!url || !admin || !customer) {
  console.error("Faltan DATABASE_URL, SEED_ADMIN_PASSWORD o SEED_CUSTOMER_PASSWORD (ver .env.example).");
  process.exit(1);
}

const { db, close } = createDb(url);
try {
  await runSeed(db, { admin, customer });
  console.log("Datos de demostración cargados: 37 productos, 6 usuarios y 8 pedidos.");
} finally {
  await close();
}
