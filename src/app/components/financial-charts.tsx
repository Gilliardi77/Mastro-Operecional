"use client"

import { BarChart, LineChart, PieChart, TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
} from "recharts"

const revenueData = [
  { month: "Jan", receita: 4000, despesas: 2400 },
  { month: "Fev", receita: 3000, despesas: 1398 },
  { month: "Mar", receita: 2000, despesas: 9800 },
  { month: "Abr", receita: 2780, despesas: 3908 },
  { month: "Mai", receita: 1890, despesas: 4800 },
  { month: "Jun", receita: 2390, despesas: 3800 },
  { month: "Jul", receita: 3490, despesas: 4300 },
];

const expenseCategoriesData = [
  { name: "Marketing", value: 400, fill: "hsl(var(--chart-1))" },
  { name: "Operações", value: 300, fill: "hsl(var(--chart-2))" },
  { name: "Pessoal", value: 300, fill: "hsl(var(--chart-3))" },
  { name: "Tecnologia", value: 200, fill: "hsl(var(--chart-4))" },
];

const chartConfig = {
  receita: {
    label: "Receita",
    color: "hsl(var(--chart-1))",
  },
  despesas: {
    label: "Despesas",
    color: "hsl(var(--chart-2))",
  },
} satisfies Record<string, { label: string; color: string }>;


export function FinancialCharts() {
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium font-headline">Receita vs. Despesas Mensais</CardTitle>
          <BarChart className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsBarChart data={revenueData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
              <Bar dataKey="despesas" fill="var(--color-despesas)" radius={4} />
            </RechartsBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium font-headline">Distribuição de Despesas</CardTitle>
          <PieChart className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex justify-center">
          <ChartContainer config={{}} className="h-[300px] w-[300px]">
            <RechartsPieChart accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={expenseCategoriesData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {expenseCategoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />}  className="[&>*]:justify-center" />
            </RechartsPieChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg rounded-lg lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium font-headline">Tendência de Lucro</CardTitle>
          <LineChart className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsLineChart
              accessibilityLayer
              data={revenueData.map(d => ({ ...d, lucro: d.receita - d.despesas }))}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `R$${value/1000}k`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    nameKey="lucro"
                    labelKey="Lucro"
                  />
                }
              />
              <Line
                dataKey="lucro"
                type="monotone"
                stroke="var(--color-receita)"
                strokeWidth={3}
                dot={{
                  fill: "var(--color-receita)",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </RechartsLineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
