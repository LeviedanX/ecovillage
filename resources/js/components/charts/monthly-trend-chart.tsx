import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export type MonthlyTrendPoint = {
    month: string;
    organic: number;
    inorganic: number;
    other: number;
};

/**
 * Monthly waste composition. `stacked` totals the categories into one column;
 * `grouped` sets them side by side. Loaded lazily — see `LazyChart`.
 */
export default function MonthlyTrendChart({
    data,
    variant = 'stacked',
}: {
    data: MonthlyTrendPoint[];
    variant?: 'stacked' | 'grouped';
}) {
    const stacked = variant === 'stacked';
    const stackId = stacked ? 'a' : undefined;
    const capRadius: [number, number, number, number] = [4, 4, 0, 0];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 5, right: 5, left: -18, bottom: 0 }}
                accessibilityLayer
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{
                        borderRadius: 12,
                        borderColor: 'var(--border)',
                        background: 'var(--card)',
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                    dataKey="organic"
                    name="Organik"
                    stackId={stackId}
                    fill="var(--chart-1)"
                    radius={stacked ? [0, 0, 4, 4] : capRadius}
                />
                <Bar
                    dataKey="inorganic"
                    name="Anorganik"
                    stackId={stackId}
                    fill="var(--chart-4)"
                    radius={stacked ? undefined : capRadius}
                />
                <Bar
                    dataKey="other"
                    name="Lainnya"
                    stackId={stackId}
                    fill="var(--chart-3)"
                    radius={capRadius}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
