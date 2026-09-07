"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { date: string; booked: number; completed: number; revenue: number };

/** Short axis labels — "2026-09-07" is noise on a 30-point axis. */
const short = (d: string) => d.slice(5).replace("-", "/");

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="booked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="date" tickFormatter={short} tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="booked"
          name="Booked"
          stroke="hsl(var(--primary))"
          fill="url(#booked)"
          strokeWidth={2}
        />
        <Line type="monotone" dataKey="completed" name="Completed" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
