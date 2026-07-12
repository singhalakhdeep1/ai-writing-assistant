import {
  useActiveTab,
  useAIStream,
  useExtensionStatus,
  useSelection,
} from "@awa/hooks";
import { Button } from "@awa/ui/button";
import { Card } from "@awa/ui/card";
import { Header } from "@awa/ui/header";
import { StatusBadge } from "@awa/ui/status-badge";
import { truncate } from "@awa/utils";
import { useEffect } from "react";
import { useSidePanelStore } from "./store";

export function App() {
  const { isConnected, isLoading } = useExtensionStatus();
  const { tabInfo } = useActiveTab();
  const { selection } = useSelection();
  const { streamText, isStreaming, error, diffs, abortStream, requestId, originalText } =
    useAIStream();
  const { acceptSuggestion, rejectSuggestion } = useSidePanelStore();

  useEffect(() => {
    if (selection?.text) {
      useSidePanelStore.setState({ originalText: selection.text, fieldId: selection.fieldId ?? "" });
    }
  }, [selection]);

  const status = isLoading ? "loading" : isConnected ? "connected" : "disconnected";
  const statusLabel = isLoading ? "Checking…" : isConnected ? "Connected" : "Disconnected";
  const changedDiffs = diffs.filter((d) => d.changed);

  return (
    <div className="min-h-screen bg-white">
      <Header title="Writing Panel" subtitle="Streaming suggestions & diff preview" />
      <div className="space-y-4 p-4">
        <StatusBadge label={statusLabel} status={status} />

        <Card title="Current Page">
          <p className="text-sm text-slate-600">{tabInfo?.title ?? "No page selected"}</p>
        </Card>

        <Card title="Selection">
          <p className="text-sm text-slate-700">
            {selection?.text ? truncate(selection.text, 200) : "Select text on the page"}
          </p>
        </Card>

        <Card title="AI Suggestion" description={isStreaming ? "Streaming…" : "Result"}>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {isStreaming && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <span className="text-xs text-slate-500">Generating…</span>
              <Button variant="ghost" className="ml-auto text-xs" onClick={() => void abortStream()}>
                Cancel
              </Button>
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm text-slate-800">
            {streamText || (isStreaming ? "" : "Run an action from the popup or floating toolbar")}
          </p>
        </Card>

        {changedDiffs.length > 0 && (
          <Card title="Changes" description={`${changedDiffs.length} sentence(s) modified`}>
            <ul className="space-y-2 text-sm">
              {changedDiffs.map((d, i) => (
                <li key={i} className="rounded border border-slate-100 p-2">
                  <p className="text-slate-400 line-through">{truncate(d.original, 80)}</p>
                  <p className="text-green-700">{truncate(d.modified, 80)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {streamText && !isStreaming && requestId && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                void acceptSuggestion(streamText, requestId)
              }
            >
              Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => void rejectSuggestion()}>
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
