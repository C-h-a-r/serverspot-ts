import { MODULE_LABELS, MODULES } from "@serverspot/config";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";
import {
  Activity,
  ArrowUpRight,
  DollarSign,
  MessageSquare,
  ShoppingBag,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";

const kpis = [
  { label: "Revenue (30d)", value: "—", icon: DollarSign, change: "Connect store" },
  { label: "Open Tickets", value: "—", icon: Ticket, change: "No data yet" },
  { label: "Active Players", value: "—", icon: Users, change: "Connect gateway" },
  { label: "Forum Posts", value: "—", icon: MessageSquare, change: "No data yet" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your game server community platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Recent Activity
            </CardTitle>
            <CardDescription>Orders, tickets, posts, and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border text-sm text-muted-foreground">
              Activity feed will populate as modules are enabled.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-accent" />
              Module Launcher
            </CardTitle>
            <CardDescription>Jump to any enabled module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULES.map((slug) => (
                <Link
                  key={slug}
                  href={`/admin/${slug === "blog" ? "blog" : slug}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-muted/50 px-4 py-3 text-sm transition-colors hover:border-accent/40 hover:bg-muted"
                >
                  <span>{MODULE_LABELS[slug]}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Worker, gateway, and infrastructure status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge>Web: Online</Badge>
            <Badge variant="secondary">Worker: Not configured</Badge>
            <Badge variant="secondary">Game Gateway: Not configured</Badge>
            <Badge variant="secondary">Database: Check /api/ready</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
