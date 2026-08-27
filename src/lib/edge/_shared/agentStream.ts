// SSE step-event helpers shared by Heena & Binod edge functions.
import { corsHeaders } from "./cors";

export type StepStatus = "running" | "done" | "error";
export type StepEvent = {
  type: "step";
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  icon?: string;
};
export type FinalEvent = {
  type: "final";
  conversation_id: string;
  reply: string;
  pending_actions: any[];
  followups: string[];
  blocks: any[];
  steps: Omit<StepEvent, "type">[];
  model: string;
};
export type ErrorEvent = { type: "error"; message: string; status?: number };
export type AgentEvent = StepEvent | FinalEvent | ErrorEvent;

export function sseHeaders() {
  return {
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export function makeStream() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  const steps: Omit<StepEvent, "type">[] = [];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });

  const send = (ev: AgentEvent) => {
    if (!controllerRef) return;
    try {
      controllerRef.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
    } catch { /* closed */ }
  };

  const step = (label: string, opts: { icon?: string; detail?: string } = {}) => {
    const id = crypto.randomUUID();
    const ev: Omit<StepEvent, "type"> = { id, label, status: "running", ...opts };
    steps.push(ev);
    send({ type: "step", ...ev });
    return {
      id,
      done: (detail?: string) => {
        const s = steps.find((x) => x.id === id);
        if (s) { s.status = "done"; if (detail) s.detail = detail; }
        send({ type: "step", id, label, status: "done", detail, icon: opts.icon });
      },
      error: (detail?: string) => {
        const s = steps.find((x) => x.id === id);
        if (s) { s.status = "error"; if (detail) s.detail = detail; }
        send({ type: "step", id, label, status: "error", detail, icon: opts.icon });
      },
    };
  };

  const close = () => {
    try { controllerRef?.close(); } catch { /* already closed */ }
  };

  return { stream, send, step, steps, close };
}

export function sseError(message: string, status = 500): Response {
  const enc = new TextEncoder();
  return new Response(
    enc.encode(`data: ${JSON.stringify({ type: "error", message, status })}\n\n`),
    { headers: sseHeaders(), status: 200 },
  );
}
