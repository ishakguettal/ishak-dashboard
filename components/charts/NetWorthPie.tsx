"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatAED } from "@/lib/utils/format";

export function NetWorthPie({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const positive = data.filter((d) => d.value > 0);
  if (positive.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Add an account to see your breakdown.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={positive}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          stroke="none"
        >
          {positive.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          itemStyle={{ color: "var(--color-text)" }}
          formatter={(value) => formatAED(Number(value))}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
