import pool from "@/lib/db";

export interface DailyMetric {
    day: string;
    orders: number;
    revenue?: number;
    usage?: number;
}

export interface HourlyMetric {
    hour: number;
    orders: number;
    revenue: number;
}

export interface ReportDetails {
    type: "x" | "z";
    generatedAt: string;
    from: string;
    to: string;
    totalOrders: number;
    totalRevenue: number;
    hourly: HourlyMetric[];
}

function getPastDayKeys(days: number): string[] {
    const keys: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}

//check stats per hour
function fillHourly(rows: Array<{ hour: number; orders: number; revenue: number }>): HourlyMetric[] {
    const byHour = new Map(rows.map((r) => [Number(r.hour), r]));
    return Array.from({ length: 24 }, (_, hour) => {
        const row = byHour.get(hour);
        return {
            hour,
            orders: row ? Number(row.orders) : 0,
            revenue: row ? Number(row.revenue) : 0,
        };
    });
}

//pull sales history
export async function getSalesHistory(days: number = 14): Promise<DailyMetric[]> {
    const { rows } = await pool.query(
        `SELECT DATE("time")::text AS day,
            COUNT(*)::int AS orders,
            COALESCE(SUM(price), 0)::float8 AS revenue
     FROM orderhistory
     WHERE "time" >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
     GROUP BY DATE("time")
     ORDER BY DATE("time")`,
        [days]
    );

    const dayKeys = getPastDayKeys(days);
    const byDay = new Map(rows.map((r) => [String(r.day), r]));

    return dayKeys.map((day) => {
        const row = byDay.get(day);
        return {
            day,
            orders: row ? Number(row.orders) : 0,
            revenue: row ? Number(row.revenue) : 0,
        };
    });
}

//pull inventory usage
export async function getInventoryUsageHistory(days: number = 14): Promise<DailyMetric[]> {
    const { rows } = await pool.query(
        `SELECT DATE(oh."time")::text AS day,
            COALESCE(SUM(mim.quantity), 0)::float8 AS usage
     FROM orderhistory oh
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi
     LEFT JOIN menu m ON m.itemname = oi->>'item'
     LEFT JOIN menuingredientsmap mim ON mim.itemid = m.itemid
     WHERE oh."time" >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
     GROUP BY DATE(oh."time")
     ORDER BY DATE(oh."time")`,
        [days]
    );

    const dayKeys = getPastDayKeys(days);
    const byDay = new Map(rows.map((r) => [String(r.day), r]));

    return dayKeys.map((day) => {
        const row = byDay.get(day);
        return {
            day,
            orders: 0,
            usage: row ? Number(row.usage) : 0,
        };
    });
}

async function getHourlyMetrics(fromIso: string, toIso: string): Promise<HourlyMetric[]> {
    const { rows } = await pool.query(
        `SELECT EXTRACT(HOUR FROM "time")::int AS hour,
            COUNT(*)::int AS orders,
            COALESCE(SUM(price), 0)::float8 AS revenue
     FROM orderhistory
     WHERE "time" >= $1::timestamptz
       AND "time" <= $2::timestamptz
     GROUP BY EXTRACT(HOUR FROM "time")
     ORDER BY hour`,
        [fromIso, toIso]
    );

    return fillHourly(rows as Array<{ hour: number; orders: number; revenue: number }>);
}

//check if z report previously generated
export async function hasZReportToday(): Promise<boolean> {
    const { rows } = await pool.query(
        "SELECT id FROM zreport_log WHERE report_date = CURRENT_DATE LIMIT 1"
    );
    return rows.length > 0;
}

export async function generateXReport(): Promise<ReportDetails> {
     //query the database
    const { rows: resetRows } = await pool.query(
        `SELECT COALESCE(MAX(generated_at), CURRENT_DATE::timestamptz) AS reset_at
     FROM zreport_log
     WHERE report_date = CURRENT_DATE`
    );

    const from = new Date(resetRows[0].reset_at).toISOString();
    const to = new Date().toISOString();
    const hourly = await getHourlyMetrics(from, to);
    const totalOrders = hourly.reduce((sum, h) => sum + h.orders, 0);
    const totalRevenue = hourly.reduce((sum, h) => sum + h.revenue, 0);

    return {
        type: "x",
        generatedAt: to,
        from,
        to,
        totalOrders,
        totalRevenue,
        hourly,
    };
}

export async function generateZReport(): Promise<ReportDetails> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        //query the database
        const { rows: existing } = await client.query(
            "SELECT id FROM zreport_log WHERE report_date = CURRENT_DATE LIMIT 1"
        );

        if (existing.length > 0) {
            throw new Error("Z-report has already been generated for today.");
        }

        const { rows: totalsRows } = await client.query(
            `SELECT COUNT(*)::int AS total_orders,
              COALESCE(SUM(price), 0)::float8 AS total_revenue
       FROM orderhistory
       WHERE "time" >= CURRENT_DATE::timestamptz
         AND "time" <= NOW()`
        );

        const totalOrders = Number(totalsRows[0].total_orders);
        const totalRevenue = Number(totalsRows[0].total_revenue);

        const { rows: inserted } = await client.query(
            `INSERT INTO zreport_log (report_date, generated_at, total_orders, total_revenue)
       VALUES (CURRENT_DATE, NOW(), $1, $2)
       RETURNING generated_at`,
            [totalOrders, totalRevenue]
        );

        await client.query("COMMIT");

        const from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const generatedAt = new Date(inserted[0].generated_at).toISOString();
        const hourly = await getHourlyMetrics(from, generatedAt);

        return {
            type: "z",
            generatedAt,
            from,
            to: generatedAt,
            totalOrders,
            totalRevenue,
            hourly,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
