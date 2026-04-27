"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SalesPoint {
    day: string;
    orders: number;
    revenue: number;
}

interface UsagePoint {
    day: string;
    usage: number;
}

interface HourlyMetric {
    hour: number;
    orders: number;
    revenue: number;
}

interface ReportDetails {
    type: "x" | "z";
    generatedAt: string;
    from: string;
    to: string;
    totalOrders: number;
    totalRevenue: number;
    hourly: HourlyMetric[];
}

interface StatsPayload {
    salesHistory: SalesPoint[];
    inventoryUsageHistory: UsagePoint[];
    zGeneratedToday: boolean;
    menuOptions: Array<{ itemid: number; itemname: string }>;
    inventoryOptions: Array<{ ingredientid: number; ingredientname: string }>;
    effectiveStartDate?: string;
    effectiveEndDate?: string;
}

function serializeIds(ids: number[]): string {
    return [...ids].sort((a, b) => a - b).join(",");
}

function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function ChartCard({
    title,
    data,
    value,
    color,
    selector,
}: {
    title: string;
    data: Array<{ day: string }>;
    value: (point: { day: string }) => number;
    color: string;
    selector?: ReactNode;
}) {
    const normalized = data.map((point) => {
        const raw = Number(value(point));
        return {
            day: point.day,
            amount: Number.isFinite(raw) && raw > 0 ? raw : 0,
        };
    });
    const chartData = normalized.map((point, index) => ({ ...point, index }));

    if (data.length === 0) {
        return (
            <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-bold mb-3">{title}</h3>
                <p className="text-sm text-muted">No data available for the selected date range.</p>
            </section>
        );
    }

    const max = Math.max(1, ...normalized.map((d) => d.amount));
    const min = Math.min(...normalized.map((d) => d.amount));
    const latest = normalized[normalized.length - 1]?.amount ?? 0;

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{title}</h3>
                <span className="text-xs text-muted">Latest: {latest.toFixed(2)}</span>
            </div>

            <div className="h-72 w-full rounded-md bg-background border border-border/70 p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid stroke="currentColor" className="text-border/50" vertical={false} />
                        <XAxis dataKey="index" hide />
                        <YAxis
                            width={42}
                            tick={{ fill: "currentColor", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, "dataMax"]}
                        />
                        <Tooltip
                            formatter={(rawValue) => {
                                const amount = Number(rawValue);
                                return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
                            }}
                            labelFormatter={(_label, payload) => {
                                const point = payload?.[0]?.payload as { day?: string } | undefined;
                                return point?.day ?? "";
                            }}
                            contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="amount"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {selector && <div className="mt-3">{selector}</div>}

            <div className="mt-2 text-xs text-muted flex justify-between">
                <span>Min: {min.toFixed(2)}</span>
                <span>Max: {max.toFixed(2)}</span>
                <span>Points: {normalized.length}</span>
            </div>
        </section>
    );
}

export default function ManagerStatsDashboard() {
    const [stats, setStats] = useState<StatsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ReportDetails | null>(null);
    const [reportLoading, setReportLoading] = useState<"x" | "z" | null>(null);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 13);
        return formatDateForInput(d);
    });
    const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));
    const [appliedStartDate, setAppliedStartDate] = useState("");
    const [appliedEndDate, setAppliedEndDate] = useState("");
    const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>([]);
    const [appliedMenuItemIds, setAppliedMenuItemIds] = useState<number[]>([]);
    const [appliedIngredientIds, setAppliedIngredientIds] = useState<number[]>([]);

    const loadStats = useCallback(async (
        fromDate?: string,
        toDate?: string,
        menuItemIds: number[] = appliedMenuItemIds,
        ingredientIds: number[] = appliedIngredientIds
    ) => {
        if (fromDate && toDate && fromDate > toDate) {
            setError("Start date must be before or equal to end date.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (fromDate && toDate) {
                params.set("startDate", fromDate);
                params.set("endDate", toDate);
            }
            for (const id of menuItemIds) {
                params.append("menuItemId", String(id));
            }
            for (const id of ingredientIds) {
                params.append("ingredientId", String(id));
            }
            const url = params.toString() ? `/api/manager/stats?${params.toString()}` : "/api/manager/stats";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to load stats");
            const data = (await res.json()) as StatsPayload;
            setStats(data);

            setSelectedMenuItemIds((prev) => {
                if (prev.length > 0 || menuItemIds.length > 0) return prev;
                return [];
            });
            setSelectedIngredientIds((prev) => {
                if (prev.length > 0 || ingredientIds.length > 0) return prev;
                return [];
            });

            if (data.effectiveStartDate && data.effectiveEndDate && !fromDate && !toDate) {
                setStartDate(data.effectiveStartDate);
                setEndDate(data.effectiveEndDate);
                setAppliedStartDate(data.effectiveStartDate);
                setAppliedEndDate(data.effectiveEndDate);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load stats.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [appliedIngredientIds, appliedMenuItemIds]);

    function applyDateChanges() {
        if (startDate > endDate) {
            setError("Start date must be before or equal to end date.");
            return;
        }

        const nextMenuIds = [...selectedMenuItemIds].sort((a, b) => a - b);
        const nextIngredientIds = [...selectedIngredientIds].sort((a, b) => a - b);

        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
        setAppliedMenuItemIds(nextMenuIds);
        setAppliedIngredientIds(nextIngredientIds);

        if (
            startDate === appliedStartDate &&
            endDate === appliedEndDate &&
            serializeIds(nextMenuIds) === serializeIds(appliedMenuItemIds) &&
            serializeIds(nextIngredientIds) === serializeIds(appliedIngredientIds)
        ) {
            void loadStats(startDate, endDate, nextMenuIds, nextIngredientIds);
        }
    }

    useEffect(() => {
        if (!appliedStartDate || !appliedEndDate) {
            void loadStats();
            return;
        }

        void loadStats(appliedStartDate, appliedEndDate, appliedMenuItemIds, appliedIngredientIds);
    }, [appliedStartDate, appliedEndDate, appliedMenuItemIds, appliedIngredientIds, loadStats]);

    function toggleMenuSelection(itemId: number) {
        setSelectedMenuItemIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    }

    function toggleIngredientSelection(ingredientId: number) {
        setSelectedIngredientIds((prev) =>
            prev.includes(ingredientId) ? prev.filter((id) => id !== ingredientId) : [...prev, ingredientId]
        );
    }

    //call report generation functions
    async function generateReport(type: "x" | "z") {
        setReportLoading(type);
        setError(null);
        try {
            const res = await fetch("/api/manager/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });

            const data = (await res.json()) as ReportDetails | { error: string };
            if (!res.ok) {
                throw new Error("error" in data ? data.error : "Failed to generate report");
            }

            setReport(data as ReportDetails);
            await loadStats(appliedStartDate, appliedEndDate, appliedMenuItemIds, appliedIngredientIds);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to generate report.";
            setError(message);
        } finally {
            setReportLoading(null);
        }
    }

    const revenueText = useMemo(
        () => (report ? report.totalRevenue.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "$0.00"),
        [report]
    );

    return (
        <main className="flex-1 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-display tracking-tight">Company Statistics</h1>
                <button
                    onClick={() => void loadStats(appliedStartDate, appliedEndDate, appliedMenuItemIds, appliedIngredientIds)}
                    className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent transition"
                >
                    Refresh
                </button>
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <label className="text-sm flex flex-col gap-1">
                        <span className="text-muted">Start date</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-sm flex flex-col gap-1">
                        <span className="text-muted">End date</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                    </label>
                    <button
                        onClick={applyDateChanges}
                        disabled={loading || startDate > endDate}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                        Apply Changes
                    </button>
                    {startDate > endDate && (
                        <p className="text-sm text-red-600">Start date must be before or equal to end date.</p>
                    )}
                </div>
            </section>

            {loading && <p className="text-sm text-muted">Loading statistics...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {stats && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <ChartCard
                            title="Sales History (Revenue)"
                            data={stats.salesHistory}
                            value={(point) => (point as SalesPoint).revenue}
                            color="#8b6aae"
                            selector={
                                <div className="space-y-2">
                                    <p className="text-xs text-muted">Menu item filters (leave none selected to view all)</p>
                                    <div className="max-h-32 overflow-y-auto rounded-md border border-border/70 bg-background/40 p-2">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {stats.menuOptions.map((item) => (
                                                <label key={item.itemid} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMenuItemIds.includes(item.itemid)}
                                                        onChange={() => toggleMenuSelection(item.itemid)}
                                                        className="h-4 w-4 rounded border-border"
                                                    />
                                                    <span>{item.itemname}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                        <ChartCard
                            title="Inventory Usage History"
                            data={stats.inventoryUsageHistory}
                            value={(point) => (point as UsagePoint).usage}
                            color="#818cf8"
                            selector={
                                <div className="space-y-2">
                                    <p className="text-xs text-muted">Inventory filters (leave none selected to view all)</p>
                                    <div className="max-h-32 overflow-y-auto rounded-md border border-border/70 bg-background/40 p-2">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {stats.inventoryOptions.map((item) => (
                                                <label key={item.ingredientid} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIngredientIds.includes(item.ingredientid)}
                                                        onChange={() => toggleIngredientSelection(item.ingredientid)}
                                                        className="h-4 w-4 rounded border-border"
                                                    />
                                                    <span>{item.ingredientname}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                    </div>

                    <section className="rounded-xl border border-border bg-card p-4">
                        <h3 className="font-bold mb-3">Reports</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => void generateReport("x")}
                                disabled={reportLoading !== null}
                                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {reportLoading === "x" ? "Generating X-Report..." : "Generate X-Report"}
                            </button>
                            <button
                                onClick={() => void generateReport("z")}
                                disabled={reportLoading !== null || stats.zGeneratedToday}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {reportLoading === "z" ? "Generating Z-Report..." : "Generate Z-Report"}
                            </button>
                            {stats.zGeneratedToday && (
                                <span className="text-sm text-muted self-center">Z-report already generated today.</span>
                            )}
                        </div>
                    </section>

                    {report && (
                        <section className="rounded-xl border border-border bg-card p-4">
                            <h3 className="font-bold mb-2">Latest {report.type.toUpperCase()}-Report</h3>
                            <p className="text-sm text-muted mb-3">
                                Window: {new Date(report.from).toLocaleString()} - {new Date(report.to).toLocaleString()}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2 mb-4 text-sm">
                                <p>
                                    <span className="font-medium">Total orders:</span> {report.totalOrders}
                                </p>
                                <p>
                                    <span className="font-medium">Total revenue:</span> {revenueText}
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-border">
                                            <th className="py-2 pr-4">Hour</th>
                                            <th className="py-2 pr-4">Orders</th>
                                            <th className="py-2 pr-4">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.hourly.map((h) => (
                                            <tr key={h.hour} className="border-b border-border/60">
                                                <td className="py-1 pr-4">{h.hour.toString().padStart(2, "0")}:00</td>
                                                <td className="py-1 pr-4">{h.orders}</td>
                                                <td className="py-1 pr-4">
                                                    {h.revenue.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}
