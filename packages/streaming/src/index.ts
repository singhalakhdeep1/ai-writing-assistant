import { generateId } from "@awa/utils";

/** Active streaming request tracked by AbortController (Module 6). */
export interface StreamRequest {
  id: string;
  controller: AbortController;
  startedAt: number;
}

const activeStreams = new Map<string, StreamRequest>();

/** Creates a new abortable stream request (Module 6). */
export function createStreamRequest(): StreamRequest {
  const request: StreamRequest = {
    id: generateId(),
    controller: new AbortController(),
    startedAt: Date.now(),
  };
  activeStreams.set(request.id, request);
  return request;
}

/** Aborts an active stream by request ID (Module 6). */
export function abortStream(requestId: string): boolean {
  const request = activeStreams.get(requestId);
  if (!request) return false;
  request.controller.abort();
  activeStreams.delete(requestId);
  return true;
}

/** Processes a ReadableStream into incremental chunks (Module 6). */
export async function* processStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

/** Cleans up completed stream request. */
export function completeStream(requestId: string): void {
  activeStreams.delete(requestId);
}

export function getActiveStreamCount(): number {
  return activeStreams.size;
}
