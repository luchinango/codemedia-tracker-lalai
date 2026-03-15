import Link from "next/link";
import { FileText, Users, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText size={24} />
          Reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reportes de seguimiento para clientes y análisis interno
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/reports/client"
          className="border border-border rounded-xl p-6 bg-white dark:bg-muted hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase size={20} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition">
              Reporte para Cliente
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tareas completadas, horas invertidas y estado de pagos por proyecto.
            Ideal para compartir con el cliente.
          </p>
        </Link>

        <Link
          href="/reports/internal"
          className="border border-border rounded-xl p-6 bg-white dark:bg-muted hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Users size={20} className="text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-foreground group-hover:text-warning transition">
              Reporte Interno
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Costo real de nómina vs monto cobrado, desglosado por desarrollador.
            Para análisis de rentabilidad.
          </p>
        </Link>
      </div>
    </div>
  );
}
