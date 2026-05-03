export {};

declare global {
  interface Window {
    __RYXEN_APP_CONTEXT__?: Record<string, unknown>;
    __RYXEN_BOOT_METRICS__?: Record<string, unknown>;
    __RYXEN_CONFIG__?: Record<string, unknown>;
    __RYXEN_DEBUG_API__?: boolean;
    __RYXEN_DEBUG_UI__?: boolean;
    __RYXEN_HYDRATION_METRICS__?: Record<string, unknown>;
    __RYXEN_REQUEST_METRICS__?: Record<string, unknown>;
    __RYXEN_UI_METRICS__?: {
      recent?: unknown[];
      summary?: Record<string, unknown>;
    };
    __RYXEN_VERCEL_OBSERVABILITY__?: boolean;
  }
}
