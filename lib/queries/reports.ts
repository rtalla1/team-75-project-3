import pool from "@/lib/db";

// A single day's aggregated metric used in sales and inventory usage charts.
export interface DailyMetric {
    day: string;     // ISO date string (YYYY-MM-DD)
    orders: number;
    revenue?: number; // total revenue for the day (sales history only)
    usage?: number;   // total ingredient units consumed (inventory history only)
}

// A single hour's aggregated metric used in X/Z report breakdowns.
export interface HourlyMetric {
    hour: number;   // 0–23
    orders: number;
    revenue: number;
}

// The full data payload returned by generateXReport and generateZReport.
export interface ReportDetails {
    type: "x" | "z";
    generatedAt: string; // ISO timestamp of when the report was generated
    from: string;        // start of the reporting window (ISO timestamp)
    to: string;          // end of the reporting window (ISO timestamp)
    totalOrders: number;
    totalRevenue: number;
    hourly: HourlyMetric[]; // 24-element array, one entry per hour
}

// A simple inclusive date range used for filtering stats queries.
export interface DateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

const CENTRAL_TIME_ZONE = "America/Chicago";
const centralFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

function getCentralToday(): Date {
    const parts = centralFormatter.formatToParts(new Date());
    const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
    const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
    const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
    return new Date(Date.UTC(year, month - 1, day));
}

// Generates an array of ISO date strings (YYYY-MM-DD) for the past `days` days, ending today.
function getPastDayKeys(days: number): string[] {
    const keys: string[] = [];
    const today = getCentralToday();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() - i);
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}

// Formats a Date object as a YYYY-MM-DD string.
function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

// Returns the date of the most recent order as a YYYY-MM-DD string, or null if there are no orders.
export async function getLatestOrderDate(): Promise<string | null> {
    const { rows } = await pool.query(
        `SELECT MAX(DATE("time" AT TIME ZONE 'America/Chicago'))::text AS latest_day FROM orderhistory`
    );
    return rows[0]?.latest_day ? String(rows[0].latest_day) : null;
}

// Returns a DateRange ending on the most recent order date (or today) and spanning `days` days back.
// Used as a fallback when the caller doesn't supply an explicit date range.
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

// Converts a sparse set of hourly DB rows into a full 24-element array,
// filling in zeros for any hours with no activity.
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

// Returns daily order counts and revenue for the past `days` days, including days with no orders.
export async function getSalesHistory(days: number = 14): Promise<DailyMetric[]> {
    const { rows } = await pool.query(
        `SELECT DATE("time" AT TIME ZONE 'America/Chicago')::text AS day,
            COUNT(*)::int AS orders,
            COALESCE(SUM(price), 0)::float8 AS revenue
     FROM orderhistory
     WHERE "time" >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
      GROUP BY DATE("time" AT TIME ZONE 'America/Chicago')
      ORDER BY DATE("time" AT TIME ZONE 'America/Chicago')`,
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

// Returns daily order counts and revenue between startDate and endDate (inclusive).
// If menuItemIds is provided, counts and revenue are scoped to only those menu items.
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
             ON DATE(oh."time" AT TIME ZONE 'America/Chicago') = gs.day::date
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
                        THEN COALESCE(m.price, 0) * COALESCE(order_items.qty, 1)
                        ELSE 0
                    END
                ),
                0
            )::float8 AS revenue
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
         LEFT JOIN orderhistory oh
             ON DATE(oh."time" AT TIME ZONE 'America/Chicago') = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN LATERAL (
         SELECT oi->>'item' AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         UNION ALL
         SELECT add_on.value AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         FROM jsonb_array_elements_text(COALESCE(oi->'addOns', '[]'::jsonb)) AS add_on(value)
     ) AS order_items ON true
     LEFT JOIN menu m ON m.itemname = order_items.item_name
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

// Returns daily total ingredient usage (summed across all orders) for the past `days` days.
export async function getInventoryUsageHistory(days: number = 14): Promise<DailyMetric[]> {
    const { rows } = await pool.query(
        `SELECT DATE(oh."time" AT TIME ZONE 'America/Chicago')::text AS day,
            COALESCE(SUM(mim.quantity * order_items.qty), 0)::float8 AS usage
     FROM orderhistory oh
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi
     LEFT JOIN LATERAL (
         SELECT oi->>'item' AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         UNION ALL
         SELECT add_on.value AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         FROM jsonb_array_elements_text(COALESCE(oi->'addOns', '[]'::jsonb)) AS add_on(value)
     ) AS order_items ON true
     LEFT JOIN menu m ON m.itemname = order_items.item_name
     LEFT JOIN menuingredientsmap mim ON mim.itemid = m.itemid
     WHERE oh."time" >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
     GROUP BY DATE(oh."time" AT TIME ZONE 'America/Chicago')
     ORDER BY DATE(oh."time" AT TIME ZONE 'America/Chicago')`,
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

// Returns daily ingredient usage between startDate and endDate (inclusive).
// If ingredientIds is provided, usage is scoped to only those ingredients.
export async function getInventoryUsageHistoryByDateRange(
    startDate: string,
    endDate: string,
    ingredientIds: number[] = []
): Promise<DailyMetric[]> {
    if (ingredientIds.length === 0) {
        const { rows } = await pool.query(
            `SELECT gs.day::text AS day,
            COALESCE(SUM(mim.quantity * order_items.qty), 0)::float8 AS usage
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
         LEFT JOIN orderhistory oh
             ON DATE(oh."time" AT TIME ZONE 'America/Chicago') = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN LATERAL (
         SELECT oi->>'item' AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         UNION ALL
         SELECT add_on.value AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         FROM jsonb_array_elements_text(COALESCE(oi->'addOns', '[]'::jsonb)) AS add_on(value)
     ) AS order_items ON true
     LEFT JOIN menu m ON m.itemname = order_items.item_name
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
                        THEN COALESCE(mim.quantity, 0) * COALESCE(order_items.qty, 1)
                        ELSE 0
                    END
                ),
                0
            )::float8 AS usage
     FROM generate_series($1::date, $2::date, '1 day'::interval) AS gs(day)
         LEFT JOIN orderhistory oh
             ON DATE(oh."time" AT TIME ZONE 'America/Chicago') = gs.day::date
     LEFT JOIN LATERAL jsonb_array_elements(COALESCE(oh.orderdetails->'items', '[]'::jsonb)) oi ON true
     LEFT JOIN LATERAL (
         SELECT oi->>'item' AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         UNION ALL
         SELECT add_on.value AS item_name,
                CASE
                    WHEN (oi->>'quantity') ~ '^[0-9]+$' THEN (oi->>'quantity')::int
                    ELSE 1
                END AS qty
         FROM jsonb_array_elements_text(COALESCE(oi->'addOns', '[]'::jsonb)) AS add_on(value)
     ) AS order_items ON true
     LEFT JOIN menu m ON m.itemname = order_items.item_name
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

// Queries hourly order counts and revenue between two ISO timestamps.
// Returns a full 24-element array with zeros for inactive hours.
async function getHourlyMetrics(fromIso: string, toIso: string): Promise<HourlyMetric[]> {
    const { rows } = await pool.query(
        `SELECT EXTRACT(HOUR FROM "time" AT TIME ZONE 'America/Chicago')::int AS hour,
            COUNT(*)::int AS orders,
            COALESCE(SUM(price), 0)::float8 AS revenue
     FROM orderhistory
     WHERE "time" >= $1::timestamptz
       AND "time" <= $2::timestamptz
      GROUP BY EXTRACT(HOUR FROM "time" AT TIME ZONE 'America/Chicago')
     ORDER BY hour`,
        [fromIso, toIso]
    );

    return fillHourly(rows as Array<{ hour: number; orders: number; revenue: number }>);
}

// Returns true if a Z report has already been generated for today, false otherwise.
export async function hasZReportToday(): Promise<boolean> {
    const { rows } = await pool.query(
        "SELECT id FROM zreport_log WHERE report_date = (NOW() AT TIME ZONE 'America/Chicago')::date LIMIT 1"
    );
    return rows.length > 0;
}

export async function zGeneratedTime(): Promise<string | null> {
    const { rows } = await pool.query(
        `SELECT generated_at FROM zreport_log WHERE report_date = (NOW() AT TIME ZONE 'America/Chicago')::date LIMIT 1`
    );
    return rows[0]?.generated_at ? new Date(rows[0].generated_at).toISOString() : null;
}

// Generates an X report: a non-destructive sales snapshot from start of day until now.
// Does not modify any database state.
export async function generateXReport(): Promise<ReportDetails> {
    const { rows: existing } = await pool.query(
        `SELECT generated_at FROM zreport_log WHERE report_date = (NOW() AT TIME ZONE 'America/Chicago')::date LIMIT 1`
    );
    const { rows: dayStart } = await pool.query(
        `SELECT DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago' AS start_of_day`
    );

    const from = new Date(dayStart[0].start_of_day).toISOString();
    const to = new Date().toISOString();
    if (existing.length > 0) {
        return {
            type: "x",
            generatedAt: to,
            from,
            to,
            totalOrders: 0,
            totalRevenue: 0,
            hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenue: 0 })),
        };
    }
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

// Generates a Z report: closes out the current sales period and records it in zreport_log.
// If a z report has been generated that day only checks times up until that report was generated
// Uses a transaction to ensure the log entry and the report data stay consistent.
export async function generateZReport(): Promise<ReportDetails> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows: dayStart } = await client.query(
            `SELECT DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago' AS start_of_day`
        );
        const fromIso = new Date(dayStart[0].start_of_day).toISOString();

        const { rows: existing } = await client.query(
            `SELECT id, generated_at, total_orders, total_revenue 
             FROM zreport_log 
           WHERE report_date = (NOW() AT TIME ZONE 'America/Chicago')::date 
             LIMIT 1`
        );

        if (existing.length > 0) {
            await client.query("COMMIT");
            const generatedAt = new Date(existing[0].generated_at).toISOString();
            const hourly = await getHourlyMetrics(fromIso, generatedAt);

            return {
                type: "z",
                generatedAt,
                from: fromIso,
                to: generatedAt,
                totalOrders: Number(existing[0].total_orders),
                totalRevenue: Number(existing[0].total_revenue),
                hourly,
            };
        }

        const { rows: totalsRows } = await client.query(
            `SELECT COUNT(*)::int AS total_orders,
                    COALESCE(SUM(price), 0)::float8 AS total_revenue
             FROM orderhistory
             WHERE "time" >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'
               AND "time" <= NOW()`
        );


        const totalOrders = Number(totalsRows[0].total_orders);
        const totalRevenue = Number(totalsRows[0].total_revenue);

        const { rows: inserted } = await client.query(
            `INSERT INTO zreport_log (report_date, generated_at, total_orders, total_revenue)
             VALUES ((NOW() AT TIME ZONE 'America/Chicago')::date, NOW(), $1, $2)
             RETURNING generated_at`,
            [totalOrders, totalRevenue]
        );

        await client.query("COMMIT");

        const generatedAt = new Date(inserted[0].generated_at).toISOString();
        const hourly = await getHourlyMetrics(fromIso, generatedAt);

        return {
            type: "z",
            generatedAt,
            from: fromIso,
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