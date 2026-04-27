import { auth } from "@/lib/auth";
import { getInventory } from "@/lib/queries/inventory";
import { getMenu } from "@/lib/queries/menu";
import {
    getDefaultStatsDateRange,
    getInventoryUsageHistoryByDateRange,
    getSalesHistoryByDateRange,
    hasZReportToday,
} from "@/lib/queries/reports";

function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function parseIdFilters(searchParams: URLSearchParams, repeatedKey: string, csvKey: string): number[] {
    const repeatedValues = searchParams.getAll(repeatedKey);
    const csvValue = searchParams.get(csvKey);
    const csvValues = csvValue ? csvValue.split(",") : [];

    return Array.from(
        new Set(
            [...repeatedValues, ...csvValues]
                .map((value) => Number.parseInt(value, 10))
                .filter((value) => Number.isInteger(value) && value > 0)
        )
    );
}

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.role || session.user.role !== "manager") return unauthorizedResponse();

    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const selectedMenuItemIds = parseIdFilters(searchParams, "menuItemId", "menuItemIds");
        const selectedIngredientIds = parseIdFilters(searchParams, "ingredientId", "ingredientIds");
        const hasValidRange =
            typeof startDate === "string" &&
            typeof endDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
            /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
            startDate <= endDate;

        const defaultRange = hasValidRange ? null : await getDefaultStatsDateRange(14);
        const effectiveStartDate = hasValidRange ? startDate : defaultRange!.startDate;
        const effectiveEndDate = hasValidRange ? endDate : defaultRange!.endDate;

        const [salesHistory, inventoryUsageHistory, zGeneratedToday, menuItems, inventoryItems] = await Promise.all([
            getSalesHistoryByDateRange(effectiveStartDate, effectiveEndDate, selectedMenuItemIds),
            getInventoryUsageHistoryByDateRange(effectiveStartDate, effectiveEndDate, selectedIngredientIds),
            hasZReportToday(),
            getMenu(),
            getInventory(),
        ]);

        return Response.json({
            salesHistory,
            inventoryUsageHistory,
            zGeneratedToday,
            menuOptions: menuItems.map((item) => ({ itemid: Number(item.itemid), itemname: String(item.itemname) })),
            inventoryOptions: inventoryItems.map((item) => ({
                ingredientid: Number(item.ingredientid),
                ingredientname: String(item.ingredientname),
            })),
            effectiveStartDate,
            effectiveEndDate,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("GET /api/manager/stats error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}
