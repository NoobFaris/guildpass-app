"use client";

/**
 * UnsupportedBanner
 *
 * Renders a visible banner when the dashboard is running in live mode and
 * a particular list endpoint is not yet implemented. This prevents silent
 * fallback to mock data on live deployments.
 */

interface UnsupportedBannerProps {
  /** The resource type that is not supported (e.g. "passes", "guilds"). */
  resource: string;
  /** Optional extra message to display. */
  message?: string;
}

export default function UnsupportedBanner({
  resource,
  message,
}: UnsupportedBannerProps) {
  const displayResource = resource.charAt(0).toUpperCase() + resource.slice(1);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 my-4">
      <div className="flex items-start gap-4">
        <div className="text-2xl shrink-0">⚠️</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-amber-800">
            {displayResource} listing not available in live mode
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            {message ||
              `The live integration currently supports only targeted lookups. Full ${resource} listing has not been implemented yet.`}
          </p>
          <p className="mt-2 text-xs text-amber-600">
            Switch to <span className="font-mono bg-amber-100 px-1 rounded">DASHBOARD_API_MODE=mock</span> or
            implement the list endpoint to see data here.
          </p>
        </div>
      </div>
    </div>
  );
}
