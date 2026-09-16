"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * "Import from Drive" — opens the Google Picker and copies the chosen files
 * into this client/folder.
 *
 * The Picker runs in the browser, so it needs its own API key and a short-lived
 * access token (fetched from /api/drive/token). With drive.file scope, picking a
 * file is what grants the app access to it — there is no broad read of the
 * user's Drive. Renders nothing at all until Drive is configured and connected.
 */
declare global {
  interface Window {
    gapi?: { load: (name: string, cb: () => void) => void };
    google?: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        DocsView: new () => GoogleDocsView;
        Action: { PICKED: string };
        Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string };
      };
    };
  }
}

interface GoogleDocsView {
  setIncludeFolders: (v: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (v: boolean) => GoogleDocsView;
  setEnableDrives: (v: boolean) => GoogleDocsView;
}

interface GooglePickerBuilder {
  addView: (v: GoogleDocsView) => GooglePickerBuilder;
  enableFeature: (f: string) => GooglePickerBuilder;
  setOAuthToken: (t: string) => GooglePickerBuilder;
  setDeveloperKey: (k: string) => GooglePickerBuilder;
  setCallback: (cb: (data: { action: string; docs?: { id: string }[] }) => void) => GooglePickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
}

function loadPicker(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.picker) return resolve();
    const existing = document.getElementById("google-api-js") as HTMLScriptElement | null;
    const onReady = () => window.gapi?.load("picker", () => resolve());
    if (existing) {
      if (window.gapi) onReady();
      else existing.addEventListener("load", onReady);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-api-js";
    script.src = "https://apis.google.com/js/api.js";
    script.onload = onReady;
    script.onerror = () => reject(new Error("Couldn't load the Google Picker"));
    document.body.appendChild(script);
  });
}

export function DrivePicker({
  clientId,
  folderId,
  connected,
}: {
  clientId: string;
  folderId?: string | null;
  connected: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!connected) return null;

  async function open() {
    setBusy(true);
    try {
      const res = await fetch("/api/drive/token");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Drive unavailable" }));
        throw new Error(body.error ?? "Drive unavailable");
      }
      const { token, apiKey } = (await res.json()) as { token: string; apiKey: string | null };
      if (!apiKey) throw new Error("Picker API key isn't configured yet");

      await loadPicker();
      const picker = window.google!.picker;
      const view = new picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false).setEnableDrives(true);

      new picker.PickerBuilder()
        .addView(view)
        .enableFeature(picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(token)
        .setDeveloperKey(apiKey)
        .setCallback((data) => {
          if (data.action !== picker.Action.PICKED || !data.docs?.length) return;
          void importFiles(data.docs.map((d) => d.id));
        })
        .build()
        .setVisible(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open Drive");
    } finally {
      setBusy(false);
    }
  }

  async function importFiles(fileIds: string[]) {
    const toastId = toast.loading(`Importing ${fileIds.length} file${fileIds.length === 1 ? "" : "s"}…`);
    try {
      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file_ids: fileIds, client_id: clientId, folder_id: folderId ?? null }),
      });
      const body = await res.json().catch(() => ({ error: "Import failed" }));
      if (!res.ok) throw new Error(body.error ?? "Import failed");

      const failed = (body.failed ?? []) as { name: string; reason: string }[];
      if (body.imported > 0) {
        toast.success(`Imported ${body.imported} file${body.imported === 1 ? "" : "s"}`, { id: toastId });
      } else {
        toast.error("Nothing imported", { id: toastId });
      }
      // Name what didn't make it rather than silently importing fewer files.
      for (const f of failed) toast.error(`${f.name}: ${f.reason}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed", { id: toastId });
    }
  }

  return (
    <Button variant="outline" onClick={open} disabled={busy}>
      {busy ? "Opening Drive…" : "Import from Drive"}
    </Button>
  );
}
