import { createClient } from "https://esm.sh/@libsql/client@0.6.0/web";

// تعريف دالة Client خارج الدالة الأساسية لتحسين الأداء (إن أمكن في بيئة Netlify Edge)
// وإذا كانت هذه وظيفة Netlify تقليدية، فستتم إعادة إنشائها في كل استدعاء، وهذا جيد.
const db = createClient({
  // يفضل استخدام TURSO_DATABASE_URL و TURSO_AUTH_TOKEN للتوافق
  url: process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_DB_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

/**
 * دالة بسيطة لاختبار الاتصال بقاعدة البيانات.
 * تنفذ استعلام خفيف للتأكد من أن الاتصال والمتغيرات صحيحة.
 */
async function runHealthCheck() {
    // أبسط استعلام لاختبار الاتصال في SQLite
    const result = await db.execute("SELECT 1 AS alive;");

    if (result.rows.length === 1 && result.rows[0].alive === 1) {
        return { success: true };
    } else {
        // إذا كان الاستعلام يعمل ولكن النتيجة غير متوقعة
        throw new Error("Health check query returned unexpected result.");
    }
}


export default async function handler(event, context) {
  try {
    const method = event.httpMethod;
    const path = event.path; // نحصل على مسار الطلب

    // 💡 1. فحص الاتصال (Health Check)
    // إذا كان المسار يحتوي على كلمة 'health' أو 'status'
    // يمكن تفعيل هذا عن طريق إعداد Redirects في Netlify أو فحص المسار الفعلي.
    if (path.includes('health') || path.includes('status')) {
        await runHealthCheck();
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "OK", database: "Connected to Turso" }),
        };
    }
    
    // 💡 2. تنفيذ استعلامات جلب البيانات (GET)
    if (method === "GET") {
      // *يمكنك أيضاً إضافة runHealthCheck() هنا قبل البدء بالاستعلامات الكبيرة إذا أردت التأكد في كل مرة*
      
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

    // للمتطلبات الأخرى
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad request" }),
    };
  } catch (err) {
    // 🛑 التقاط الأخطاء هنا يعني أن الاتصال فشل، أو أن المتغيرات غير صحيحة
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Database Connection/Query Error: ${err.message}` }),
    };
  }
}
