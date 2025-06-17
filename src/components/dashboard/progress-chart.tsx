
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface ProgressChartProps {
  data: Array<{ month: string; progress: number; target: number; }>;
  config: ChartConfig;
}

export function ProgressChart({ data, config }: ProgressChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-sm flex items-center justify-center h-full">Not enough data for chart.</div>;
  }
  return (
    <ChartContainer config={config} className="w-full h-[250px]">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: -20,
          right: 10,
          top: 5,
          bottom: 5,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted-foreground/30" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
          className="text-xs fill-muted-foreground"
        />
        <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            className="text-xs fill-muted-foreground"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" hideLabel />}
        />
        <Area
          dataKey="progress"
          type="natural"
          fill="var(--color-progress)"
          fillOpacity={0.3}
          stroke="var(--color-progress)"
          stackId="a"
        />
         <Area
          dataKey="target"
          type="natural"
          fill="var(--color-target)"
          fillOpacity={0.1}
          stroke="var(--color-target)"
          stackId="b" 
        />
      </AreaChart>
    </ChartContainer>
  );
}
