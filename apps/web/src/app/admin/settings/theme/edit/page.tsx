import Link from "next/link";
import { ThemeEditor } from "@/components/admin/theme-editor";
import { Button } from "@serverspot/ui";
import { getThemeEditorState } from "@/lib/theme/editor";
import { getActiveThemeSlug } from "@/lib/theme/config";

export default async function AdminThemeEditPage() {
  const themeSlug = await getActiveThemeSlug();
  const editor = getThemeEditorState(themeSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Theme Editor</h1>
          <p className="text-muted-foreground">Edit Spot templates and theme assets</p>
        </div>
        <Link href="/admin/settings/theme">
          <Button variant="outline">Back to settings</Button>
        </Link>
      </div>

      <ThemeEditor files={editor.files} requiredFiles={editor.requiredFiles} />
    </div>
  );
}
