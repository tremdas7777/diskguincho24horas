import { useEffect, useState } from "react";

type AnalyticsConfig = {
  googleAdsEnabled: boolean;
  googleAdsConversionId: string;
  googleAdsConversionLabel: string;
  metaPixelEnabled: boolean;
  metaPixelId: string;
  utmTrackingEnabled: boolean;
};

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    __diskGuinchoAnalytics?: AnalyticsConfig;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script_error"));
    document.head.appendChild(s);
  });
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<AnalyticsConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/public/analytics", { cache: "no-store" });
        const data = (await res.json()) as any;
        if (!mounted) return;
        const next: AnalyticsConfig = {
          googleAdsEnabled: Boolean(data?.googleAdsEnabled),
          googleAdsConversionId: String(data?.googleAdsConversionId ?? ""),
          googleAdsConversionLabel: String(data?.googleAdsConversionLabel ?? ""),
          metaPixelEnabled: Boolean(data?.metaPixelEnabled),
          metaPixelId: String(data?.metaPixelId ?? ""),
          utmTrackingEnabled: data?.utmTrackingEnabled == null ? true : Boolean(data.utmTrackingEnabled),
        };
        window.__diskGuinchoAnalytics = next;
        setCfg(next);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cfg) return;

    // Google Ads / gtag
    if (cfg.googleAdsEnabled && cfg.googleAdsConversionId) {
      // Load gtag.js once
      const existing = document.querySelector(
        `script[src*="googletagmanager.com/gtag/js?id=${encodeURIComponent(
          cfg.googleAdsConversionId,
        )}"]`,
      );
      if (!existing) {
        void loadScript(
          `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
            cfg.googleAdsConversionId,
          )}`,
        );
      }

      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function gtag() {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer!.push(arguments);
        };
      window.gtag("js", new Date());
      window.gtag("config", cfg.googleAdsConversionId);
    }

    // Meta Pixel
    if (cfg.metaPixelEnabled && cfg.metaPixelId) {
      if (!window.fbq) {
        // Minimal pixel loader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fbq: any = function () {
          // eslint-disable-next-line prefer-rest-params
          fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
        };
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = "2.0";
        window.fbq = fbq;
        void loadScript("https://connect.facebook.net/en_US/fbevents.js");
      }
      try {
        window.fbq("init", cfg.metaPixelId);
        window.fbq("track", "PageView");
      } catch {
        // ignore
      }
    }
  }, [cfg]);

  return <>{children}</>;
}

