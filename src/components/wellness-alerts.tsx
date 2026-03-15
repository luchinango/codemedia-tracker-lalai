"use client";

import { useState, useEffect } from "react";
import { X, Heart, Sun } from "lucide-react";

interface Alert {
  id: string;
  hour: number;
  minute: number;
  icon: typeof Heart;
  title: string;
  message: string;
  color: string;
}

const ALERTS: Alert[] = [
  {
    id: "lunch",
    hour: 12,
    minute: 30,
    icon: Sun,
    title: "Hora de Almuerzo",
    message:
      "Es momento de desconectarte. Come bien, comparte con tu familia y recarga energías. Considera pausar tus cronómetros activos.",
    color: "warning",
  },
  {
    id: "eod",
    hour: 19,
    minute: 0,
    icon: Heart,
    title: "Fin de Jornada",
    message:
      "Prioriza tu salud y tu familia. El trabajo puede esperar hasta mañana. Considera pausar todos los cronómetros activos.",
    color: "danger",
  },
];

function getAlertKey(alert: Alert): string {
  const today = new Date().toISOString().split("T")[0];
  return `wellness-${alert.id}-${today}`;
}

export function WellnessAlerts() {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    function checkAlerts() {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const toShow: Alert[] = [];
      for (const alert of ALERTS) {
        const alertMinutes = alert.hour * 60 + alert.minute;
        // Show alert if we're within 30 minutes of the alert time and it hasn't been dismissed today
        if (
          currentMinutes >= alertMinutes &&
          currentMinutes < alertMinutes + 30
        ) {
          const key = getAlertKey(alert);
          const dismissed = sessionStorage.getItem(key);
          if (!dismissed) {
            toShow.push(alert);
          }
        }
      }
      setActiveAlerts(toShow);
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 30_000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  function dismiss(alert: Alert) {
    sessionStorage.setItem(getAlertKey(alert), "1");
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {activeAlerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`border rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4 ${
              alert.color === "warning"
                ? "border-warning/50 bg-warning/10"
                : "border-danger/50 bg-danger/10"
            } bg-white dark:bg-muted`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full ${
                  alert.color === "warning"
                    ? "bg-warning/20 text-warning"
                    : "bg-danger/20 text-danger"
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-semibold text-sm ${
                      alert.color === "warning"
                        ? "text-warning"
                        : "text-danger"
                    }`}
                  >
                    {alert.title}
                  </h3>
                  <button
                    onClick={() => dismiss(alert)}
                    className="p-1 rounded hover:bg-border/50 text-muted-foreground hover:text-foreground transition"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-foreground mt-1 leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
