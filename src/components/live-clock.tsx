"use client";

import { useState, useEffect } from "react";

export function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleDateString("es-BO", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
          " · " +
          now.toLocaleTimeString("es-BO", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="fixed top-0 right-0 z-30 px-5 py-2.5 text-sm font-medium text-muted-foreground bg-muted/80 backdrop-blur border-b border-l border-border rounded-bl-lg print:hidden">
      {time}
    </div>
  );
}
