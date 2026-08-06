import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/ecovillage';

export type CompositionPoint = { name: string; weight_kg: number };
export type ImpactTrendPoint = { month: string; impact_kg_co2e: number };

const tooltipStyle = {
    borderRadius: 12,
    borderColor: 'var(--border)',
    background: 'var(--card)',
};

/** Waste composition donut. Loaded lazily — see `LazyChart`. */
export function CompositionChart({
    data,
    colors,
}: {
    data: CompositionPoint[];
    colors: string[];
}) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer>
                <Pie
                    data={data}
                    dataKey="weight_kg"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={94}
                    paddingAngle={2}
                >
                    {data.map((item, index) => (
                        <Cell
                            key={item.name}
                            fill={colors[index % colors.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value) => `${formatNumber(Number(value))} kg`}
                    contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

/** Monthly CO₂e trend area. Loaded lazily — see `LazyChart`. */
export function ImpactTrendChart({ data }: { data: ImpactTrendPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 5, right: 8, left: -18, bottom: 0 }}
                accessibilityLayer
            >
                <defs>
                    <linearGradient
                        id="impact-area"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="5%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.35}
                        />
                        <stop
                            offset="95%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                    type="monotone"
                    dataKey="impact_kg_co2e"
                    name="kg CO₂e"
                    stroke="var(--chart-1)"
                    fill="url(#impact-area)"
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
