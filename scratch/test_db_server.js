// Load .env first
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
    require('dotenv').config({ path: '.env' });
}

const { db } = require('../frontend/lib/db-server');

async function test() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "Undefined");
    try {
        const res = await db.query(
            `SELECT id, symbol, shareholder_name_en, shareholder_name AS shareholder_name_ar, 
                    shareholder_type, ownership_percent, shares_held, report_date
             FROM major_shareholders 
             ORDER BY ownership_percent DESC NULLS LAST
             LIMIT 5`
        );
        console.log("Success! Rows:", res.rows.length);
        for (const row of res.rows) {
            console.log(row.symbol, row.shareholder_name_en, row.ownership_percent);
        }
    } catch (err) {
        console.error("DB Query Error:", err);
    }
}

test();
