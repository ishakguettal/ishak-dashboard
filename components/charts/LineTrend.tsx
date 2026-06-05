"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function LineTrend({
  data,
  dataKey,
  color = "var(--color-primary)",
  unit = "",
  height = 200,
  domain = ["auto", "auto"],
}: {
  data: Record<string, string | number | null>[];
  dataKey: string;
  color?: string;
  unit?: string;
  height?: number;
  domain?: [number | "auto", number | "auto"];
}) {
  if (data.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Log at least two entries to see a trend.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid
          stroke="var(--color-border)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="var(--color-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--color-muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={domain}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-muted)" }}
          itemStyle={{ color: "var(--color-text)" }}
          formatter={(value) => [`${value}${unit}`, ""]}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 2, fill: color }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
