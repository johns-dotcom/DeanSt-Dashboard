"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspace } from "./actions";

/**
 * Google Drive connection. The grant is per person — connecting adds Drive to
 * your own Google account so the Picker can see your Drive and any Shared Drive
 * you have access to. The folder below is workspace-wide: documents exported
 * from the app land there, so the organisation owns them rather than whoever
 * clicked Save.
 */
export function DriveSettings({
  connected,
  pickerConfigured,
  driveFolderId,
  isAdmin,
}: {
  connected: boolean;
  pickerConfigured: boolean;
  driveFolderId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [folder, setFolder] = useState(driveFolderId);
  const [pending, startTransition] = useTransition();

  // The OAuth callback bounces back here with the outcome.
  useEffect(() => {
    const status = params.get("drive");
    if (!status) return;
    if (status === "connected") toast.success("Google Drive connected");
    else if (status === "denied") toast.error("Drive access was declined");
    else if (status === "error") toast.error("Couldn't connect Drive — try again");
    router.replace("/dashboard/settings");
  }, [params, router]);

  function disconnect() {
    startTransition(async () => {
      const res = await fetch("/api/drive/disconnect", { method: "POST" });
      if (!res.ok) { toast.error("Couldn't disconnect"); return; }
      toast.success("Drive disconnected");
      router.refresh();
    });
  }

  function saveFolder() {
    startTransition(async () => {
      const r = await updateWorkspace({ drive_folder_id: folder.trim() || null });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      toast.success("Drive folder saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">
            {connected ? "Connected to Google Drive" : "Not connected"}
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--ink-faint)" }}>
            {connected
              ? "You can import files from your Drive and save documents back to it."
              : "Connect to import files you already keep in Drive."}
          </p>
        </div>
        {connected ? (
          <Button variant="outline" onClick={disconnect} disabled={pending}>Disconnect</Button>
        ) : (
          <Button asChild><a href="/api/drive/connect">Connect Google Drive</a></Button>
        )}
      </div>

      {connected && !pickerConfigured ? (
        <p className="text-xs" style={{ color: "var(--accent)" }}>
          Importing also needs a Google Picker API key (NEXT_PUBLIC_GOOGLE_PICKER_API_KEY). Until
          it&rsquo;s set, the Import from Drive button stays hidden.
        </p>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="driveFolder">Shared Drive folder ID</Label>
        <div className="flex gap-2">
          <Input
            id="driveFolder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="1AbC…  (from the folder's URL)"
            disabled={!isAdmin || pending}
          />
          <Button onClick={saveFolder} disabled={!isAdmin || pending}>Save</Button>
        </div>
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
          Documents saved to Drive go into a subfolder here, named for the client. Leave blank to
          save into your own Drive instead.
        </p>
      </div>
    </div>
  );
}
