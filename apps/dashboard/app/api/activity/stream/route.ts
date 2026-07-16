import { apiError } from "@/lib/api-helpers";
import {
  requireDashboardSession,
  UnauthorizedError,
} from "@/lib/auth/server-session";
import {
  encodeActivityEvent,
  subscribeToActivityEvents,
} from "@/lib/activity/stream";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_PENDING_STREAM_FRAMES = 32;
const HEARTBEAT_FRAME = "event: heartbeat\ndata: {}\n\n";
const READY_FRAME = "event: ready\ndata: {}\n\n";
const encoder = new TextEncoder();

export async function GET(request: Request): Promise<Response> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "activity:read");
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return apiError(error.message, 403);
    }
    if (error instanceof UnauthorizedError) {
      return apiError(error.message, 401);
    }
    throw error;
  }

  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true;

      const disconnectSlowClient = () => {
        if (!active) return;
        dispose();
        try {
          controller.error(new Error("Activity stream backpressure limit exceeded."));
        } catch {
          // The stream may already have been closed by the client.
        }
      };

      const enqueueFrame = (frame: string) => {
        if (!active) return;
        if (controller.desiredSize !== null && controller.desiredSize <= 0) {
          disconnectSlowClient();
          return;
        }
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          dispose();
        }
      };

      const unsubscribe = subscribeToActivityEvents((event) => {
        enqueueFrame(encodeActivityEvent(event));
      });

      const heartbeat = setInterval(() => {
        enqueueFrame(HEARTBEAT_FRAME);
      }, HEARTBEAT_INTERVAL_MS);

      const onAbort = () => {
        if (!active) return;
        dispose();
        try {
          controller.close();
        } catch {
          // The client may already have cancelled the stream.
        }
      };

      dispose = () => {
        if (!active) return;
        active = false;
        unsubscribe();
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", onAbort);
      };

      enqueueFrame(READY_FRAME);
      if (request.signal.aborted) {
        onAbort();
      } else {
        request.signal.addEventListener("abort", onAbort, { once: true });
      }
    },
    cancel() {
      dispose();
    },
  }, {
    highWaterMark: MAX_PENDING_STREAM_FRAMES,
    size: () => 1,
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
