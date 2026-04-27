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

export interface DateRange {
    startDate: string;
    endDate: string;
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

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export async function getLatestOrderDate(): Promise<string | null> {
    const { rows } = await pool.query(`SELECT MAX(DATE("time"))::text AS latest_day FROM orderhistory`);
    return rows[0]?.latest_day ? String(rows[0].latest_day) : null;
}

export async function getDefaultStatsDateRange(days: number = 14): Promise<DateRange> {
    const latestDay = await getLatestOrderDate();
    const end = latestDay ? new Date(`${latestDay}T00:00:00.000Z`) : new Date();
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - (days - 1));

    return {
        startDate: formatDate(start),
        endDate: formatDate(end),
    };
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

export async function getSalesHistoryByDateRange(
    startDate: string,
    endDate: string,
    menuItemIds: number[] = []
): Promise<DailyMetric[]> {
    if (menuItemIds.length === 0) {
        const { rows } = await pool.query(
            `SELECT gs.day::text AS day,
            COALESCE(COUNT(oh.orderid), 0)::int AS orders,
            COALESCE(SUM(oh.price), 0)::float8 AS revenue
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
     LEFT JOIN orderhistory oh
       ON DATE(oh."time") = gs.day::date
     GROUP BY gs.day
     ORDER BY gs.day`,
            [startDate, endDate]
        );

        return rows.map((row) => ({
            day: String(row.day),
            orders: Number(row.orders),
            revenue: Number(row.revenue),
        }));
    }

    const { rows } = await pool.query(
        `SELECT gs.day::text AS day,
            COALESCE(
                COUNT(DISTINCT CASE WHEN m.itemid = ANY($3::int[]) THEN oh.orderid END),
                0
            )::int AS orders,
            COALESCE(
                SUM(
                    CASE
                        WHEN m.itemid = ANY($3::int[])
                        THEN COALESCE(m.price, 0) * (
                            CASE
                                WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                                ELSE 1
                            END
                        )
                        ELSE 0
                    END
                ),
                0
            )::float8 AS revenue
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
     LEFT JOIN orderhistory oh
       ON DATE(oh."time") = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN menu m ON m.itemname = oi->>'item'
     GROUP BY gs.day
     ORDER BY gs.day`,
        [startDate, endDate, menuItemIds]
    );

    return rows.map((row) => ({
        day: String(row.day),
        orders: Number(row.orders),
        revenue: Number(row.revenue),
    }));
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

export async function getInventoryUsageHistoryByDateRange(
    startDate: string,
    endDate: string,
    ingredientIds: number[] = []
): Promise<DailyMetric[]> {
    if (ingredientIds.length === 0) {
        const { rows } = await pool.query(
            `SELECT gs.day::text AS day,
            COALESCE(SUM(mim.quantity), 0)::float8 AS usage
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
     LEFT JOIN orderhistory oh
       ON DATE(oh."time") = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN menu m ON m.itemname = oi->>'item'
     LEFT JOIN menuingredientsmap mim ON mim.itemid = m.itemid
     GROUP BY gs.day
     ORDER BY gs.day`,
            [startDate, endDate]
        );

        return rows.map((row) => ({
            day: String(row.day),
            orders: 0,
            usage: Number(row.usage),
        }));
    }

    const { rows } = await pool.query(
        `SELECT gs.day::text AS day,
            COALESCE(
                SUM(
                    CASE
                        WHEN mim.ingredientid = ANY($3::int[])
                        THEN COALESCE(mim.quantity, 0) * (
                            CASE
                                WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                                ELSE 1
                            END
                        )
                        ELSE 0
                    END
                ),
                0
            )::float8 AS usage
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
     LEFT JOIN orderhistory oh
       ON DATE(oh."time") = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN menu m ON m.itemname = oi->>'item'
     LEFT JOIN menuingredientsmap mim ON mim.itemid = m.itemid
     GROUP BY gs.day
     ORDER BY gs.day`,
        [startDate, endDate, ingredientIds]
    );

    return rows.map((row) => ({
        day: String(row.day),
        orders: 0,
        usage: Number(row.usage),
    }));
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
