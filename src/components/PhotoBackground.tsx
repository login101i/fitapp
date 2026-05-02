"use client";

import { useEffect, useState } from "react";

const ROTATE_MS = 9000;
const FADE_MS = 2000;

export function PhotoBackground() {
  const [urls, setUrls] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/background-images")
      .then((r) => r.json())
      .then((d: { urls?: string[] }) => {
        if (!cancelled) setUrls(Array.isArray(d.urls) ? d.urls : []);
      })
      .catch(() => {
        if (!cancelled) setUrls([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (urls.length < 2) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % urls.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [urls.length]);

  if (urls.length === 0) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 bg-[var(--bg)]" aria-hidden />
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {urls.map((url, i) => (
        <div
          key={url}
          className="absolute inset-0 bg-cover bg-center transition-opacity ease-in-out sm:bg-[center_35%]"
          style={{
            backgroundImage: `url(${JSON.stringify(url)})`,
            opacity: urls.length === 1 ? 1 : i === active ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
      {/* Możesz zmienić przezroczystość: ciemniej = lepszy kontrast tekstu */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}
