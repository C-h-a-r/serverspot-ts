import { loadThemePack } from "@serverspot/spot";
import Link from "next/link";
import { ThemeConfigPanel } from "@/components/admin/theme-config-panel";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";
import { getActiveThemeSlug, getMergedThemeConfig } from "@/lib/theme/config";
import { getThemesDir } from "@/lib/paths";

export default async function AdminThemeSettingsPage() {
  const themeSlug = await getActiveThemeSlug();
  const theme = loadThemePack(getThemesDir(), themeSlug);
  const config = await getMergedThemeConfig(themeSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Theme</h1>
          <p className="text-muted-foreground">
            Active theme: <span className="text-accent">{theme.slug}</span>
          </p>
        </div>
        <Link href="/admin/settings/theme/edit">
          <Button variant="outline">Open file editor</Button>
        </Link>
      </div>

      <ThemeConfigPanel schema={theme.schema} initialValues={config} />

      <Card>
        <CardHeader>
          <CardTitle>Theme pack</CardTitle>
          <CardDescription>Spot templates, CSS, and sandboxed JavaScript</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Edit template files, preview changes, and publish when ready. Configuration values
            above are injected as CSS custom properties on public pages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
