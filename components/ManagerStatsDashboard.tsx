"use client";

import { useEffect, useMemo, useState } from "react";

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
}

function ChartCard({
    title,
    data,
    value,
    colorClass,
}: {
    title: string;
    data: Array<{ day: string }>;
    value: (point: { day: string }) => number;
    colorClass: string;
}) {
    const max = Math.max(1, ...data.map((d) => Number(value(d))));
    //create stats chart
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-bold mb-3">{title}</h3>
            <div className="flex items-end gap-2 h-44">
                {data.map((point) => {
                    const pointValue = Number(value(point));
                    const height = (pointValue / max) * 100;
                    return (
                        <div key={point.day} className="flex-1 flex flex-col items-center justify-end gap-1">
                            <div
                                className={`w-full rounded-t ${colorClass}`}
                                style={{ height: `${Math.max(4, height)}%` }}
                                title={`${point.day}: ${pointValue.toFixed(2)}`}
                            />
                            <span className="text-[10px] text-muted">{point.day.slice(5)}</span>
                        </div>
                    );
                })}
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

    async function loadStats() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/manager/stats");
            if (!res.ok) throw new Error("Failed to load stats");
            const data = (await res.json()) as StatsPayload;
            setStats(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load stats.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStats();
    }, []);

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
            await loadStats();
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
                    onClick={() => void loadStats()}
                    className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent transition"
                >
                    Refresh
                </button>
            </div>

            {loading && <p className="text-sm text-muted">Loading statistics...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {stats && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <ChartCard
                            title="Sales History (Revenue)"
                            data={stats.salesHistory}
                            value={(point) => (point as SalesPoint).revenue}
                            colorClass="bg-accent"
                        />
                        <ChartCard
                            title="Inventory Usage History"
                            data={stats.inventoryUsageHistory}
                            value={(point) => (point as UsagePoint).usage}
                            colorClass="bg-indigo-400"
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
