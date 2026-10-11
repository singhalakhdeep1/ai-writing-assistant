import { useActiveTab, useAIStream, useExtensionStatus, useSelection } from "@awa/hooks";
import { Button } from "@awa/ui/button";
import { Card } from "@awa/ui/card";
import { Header } from "@awa/ui/header";
import { StatusBadge } from "@awa/ui/status-badge";
import { truncate } from "@awa/utils";
import { useEffect, useState } from "react";
import { DiffView } from "./DiffView";
import { useSidePanelStore } from "./store";

export function App() {
  const { isConnected, isLoading } = useExtensionStatus();
  const { tabInfo } = useActiveTab();
  const { selection } = useSelection();
  const {
    streamText,
    isStreaming,
    error,
    diffs,
    abortStream,
    requestId,
    originalText,
    explanation,
    isExplaining,
    explain,
  } = useAIStream();
  const { acceptSuggestion, rejectSuggestion, undoLastSuggestion } = useSidePanelStore();
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selection?.text) {
      useSidePanelStore.setState({
        originalText: selection.text,
        fieldId: selection.fieldId ?? "",
      });
    }
  }, [selection]);

  const status = isLoading ? "loading" : isConnected ? "connected" : "disconnected";
  const statusLabel = isLoading ? "Checking…" : isConnected ? "Connected" : "Disconnected";
  const changedDiffs = diffs.filter((d) => d.changed);
  const baseText = originalText || selection?.text || "";
  const canReview = Boolean(streamText) && !isStreaming && Boolean(requestId);

  const handleUndo = async () => {
    const ok = await undoLastSuggestion();
    setUndoMessage(ok ? "Reverted the last applied suggestion." : "Nothing to undo.");
    setTimeout(() => setUndoMessage(null), 3000);
  };

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
              <Button
                variant="ghost"
                className="ml-auto text-xs"
                onClick={() => void abortStream()}
              >
                Cancel
              </Button>
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm text-slate-800" data-testid="stream-text">
            {streamText || (isStreaming ? "" : "Run an action from the popup or floating toolbar")}
          </p>
        </Card>

        {canReview && baseText && (
          <Card title="Changes" description="Word-level diff (Myers)">
            <DiffView original={baseText} modified={streamText} />
            {changedDiffs.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {changedDiffs.length} sentence(s) modified
              </p>
            )}
          </Card>
        )}

        {canReview && (
          <Card title="Why this change?" description="AI explanation of the suggestion">
            {explanation ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700" data-testid="explanation">
                {explanation}
              </p>
            ) : (
              <Button
                variant="secondary"
                disabled={isExplaining || !baseText}
                onClick={() => void explain(baseText, streamText)}
              >
                {isExplaining ? "Explaining…" : "Explain why"}
              </Button>
            )}
          </Card>
        )}

        {canReview && requestId && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void acceptSuggestion(streamText, requestId)}>
              Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => void rejectSuggestion()}>
              Reject
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-xs" onClick={() => void handleUndo()}>
            ↶ Undo last applied
          </Button>
          {undoMessage && <span className="text-xs text-slate-500">{undoMessage}</span>}
        </div>
      </div>
    </div>
  );
}
