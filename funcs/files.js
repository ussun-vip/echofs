import { createClient } from "https://esm.sh/@libsql/client@0.6.0/web";

export default async function handler(event, context) {
  const db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });

  try {
    const method = event.httpMethod;

    // جلب جميع الجداول مع محتوياتها
    if (method === "GET") {
      const devices = await db.execute(`SELECT * FROM devices ORDER BY created_at DESC`);
      const snapshots = await db.execute(`SELECT * FROM snapshots ORDER BY created_at DESC`);
      const files = await db.execute(`SELECT * FROM files ORDER BY created_at DESC`);
      const operations = await db.execute(`SELECT * FROM operations ORDER BY created_at DESC`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          devices: devices.rows,
          snapshots: snapshots.rows,
          files: files.rows,
          operations: operations.rows
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad request" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
