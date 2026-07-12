import {
  useActiveTab,
  useExtensionStatus,
  useExtensionVersion,
  useSelection,
  openSidePanel,
} from "@awa/hooks";
import { Button } from "@awa/ui/button";
import { Card } from "@awa/ui/card";
import { Header } from "@awa/ui/header";
import { StatusBadge } from "@awa/ui/status-badge";
import { truncate } from "@awa/utils";
import { useEffect } from "react";
import { usePopupStore } from "./store";
import type { WritingAction } from "@awa/types";

const WRITING_ACTIONS: Array<{ id: WritingAction; label: string }> = [
  { id: "grammar", label: "Fix Grammar" },
  { id: "tone-formal", label: "Formal Tone" },
  { id: "tone-friendly", label: "Friendly Tone" },
  { id: "rewrite", label: "Rewrite" },
  { id: "summarize", label: "Summarize" },
  { id: "shorten", label: "Shorten" },
];

export function App() {
  const { isConnected, isLoading, checkConnection } = useExtensionStatus();
  const { tabInfo, isLoading: tabLoading } = useActiveTab();
  const { selection } = useSelection();
  const version = useExtensionVersion();
  const { selectedText, fetchSelection, runAction, activeAction, isLoadingSelection } =
    usePopupStore();

  useEffect(() => {
    void fetchSelection();
  }, [fetchSelection]);

  useEffect(() => {
    if (selection?.text) {
      usePopupStore.setState({
        selectedText: selection.text,
        fieldId: selection.fieldId ?? "",
      });
    }
  }, [selection]);

  const status = isLoading ? "loading" : isConnected ? "connected" : "disconnected";
  const statusLabel = isLoading ? "Checking…" : isConnected ? "Connected" : "Disconnected";
  const displayText = selectedText || selection?.text || "";

  const handleAction = async (action: WritingAction) => {
    const requestId = await runAction(action);
    if (requestId) await openSidePanel();
  };

  return (
    <div className="flex min-h-[480px] flex-col">
      <Header title="AI Writing Assistant" subtitle={`v${version} · All modules complete`} />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <StatusBadge label={statusLabel} status={status} />
          <Button variant="ghost" onClick={() => void checkConnection()}>
            Refresh
          </Button>
        </div>

        <Card title="Active Page" description="Universal editor detection active">
          {tabLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <p className="truncate text-sm text-slate-700">{tabInfo?.url ?? "No tab"}</p>
          )}
        </Card>

        <Card title="Selected Text" description="Select text on the page to transform">
          {isLoadingSelection ? (
            <p className="text-sm text-slate-500">Loading selection…</p>
          ) : displayText ? (
            <p className="text-sm text-slate-700">{truncate(displayText, 120)}</p>
          ) : (
            <p className="text-sm text-slate-500">No text selected — highlight text on the page</p>
          )}
        </Card>

        <Card title="Quick Actions" description="Opens side panel with streaming results">
          <div className="grid grid-cols-2 gap-2">
            {WRITING_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                disabled={!displayText || activeAction !== null}
                className="text-xs"
                onClick={() => void handleAction(action.id)}
              >
                {activeAction === action.id ? "Starting…" : action.label}
              </Button>
            ))}
          </div>
        </Card>

        <div className="mt-auto flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => void openSidePanel()}>
            Open Panel
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => chrome.runtime.openOptionsPage()}>
            Settings
          </Button>
        </div>
      </main>
    </div>
  );
}
