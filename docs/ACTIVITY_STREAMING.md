# Activity Streaming

The dashboard loads its initial activity page through `GET /api/activity` and
then prefers `GET /api/activity/stream` for live updates. Both endpoints require
the same dashboard session and `activity:read` permission.

Webhook events are published only after idempotent storage reports that a new
event was recorded. Dashboard mutation events are published after their
append-only activity repository write completes. The client deduplicates event
IDs and retains its existing filters, pagination, and manual refresh behavior.

The stream registers its subscriber before sending a client-visible `ready`
event. On that handshake, the client performs one REST reconciliation so an
event committed between the initial REST snapshot and stream subscription
cannot be missed. Live deliveries also schedule a short, coalesced REST
reconciliation. That authoritative snapshot keeps the total correct even when
a delayed event's timestamp sorts it outside the returned page.

If `EventSource` is unavailable, the stream reports an error, the `ready`
handshake times out, or client-visible heartbeats stop, the client closes the
stream and starts visibility-aware REST polling. Configure the fallback
interval with `NEXT_PUBLIC_ACTIVITY_REFRESH_MS`; setting it to `0` disables both
automatic transports while leaving initial load and manual refresh available.

## Deployment Limitation

The current subscriber registry is process-local. It provides immediate fan-out
only when webhook ingestion and connected SSE clients are handled by the same
application process. A multi-instance or serverless deployment must replace
that registry with shared pub/sub, such as Redis, while preserving the existing
publish/subscribe and SSE contracts. Load balancer affinity alone is not a
complete fan-out solution.

Proxies must allow long-lived responses and should not buffer
`text/event-stream`. The route emits a client-visible `heartbeat` event every
15 seconds and returns `Cache-Control: no-cache, no-transform` plus
`X-Accel-Buffering: no`. Each connection also has a bounded 32-frame output
queue; a slow consumer is disconnected when that queue fills so its client can
activate polling fallback instead of growing server memory without limit.
