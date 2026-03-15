"use client";

import { useState } from "react";
import { Plus, Trash2, FileCheck, FileX } from "lucide-react";
import { createPayment, deletePayment } from "@/app/actions/crud";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Payment {
  id: string;
  project_id: string;
  project_name: string;
  amount: number;
  currency: string;
  date: string;
  type: string;
  is_invoiced: boolean;
  notes: string | null;
}

interface Project {
  id: string;
  name: string;
  currency: string;
  quoted_price: number;
}

interface KardexTableProps {
  payments: Payment[];
  projects: Project[];
}

export function KardexTable({ payments, projects }: KardexTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [paymentType, setPaymentType] = useState("parcial");
  const [amount, setAmount] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const currency = selectedProject?.currency ?? "USD";

  // Calculate pending amount for selected project
  const totalPaidForSelected = payments
    .filter((p) => p.project_id === selectedProjectId)
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const pendingForSelected = Math.max(0, (selectedProject?.quoted_price ?? 0) - totalPaidForSelected);

  function handleTypeChange(type: string) {
    setPaymentType(type);
    if (type === "total") {
      setAmount(pendingForSelected > 0 ? pendingForSelected.toFixed(2) : "");
    }
  }

  function handleProjectChange(pid: string) {
    setSelectedProjectId(pid);
    // Recalculate pending if type is total
    if (paymentType === "total") {
      const proj = projects.find((p) => p.id === pid);
      const paidForProj = payments
        .filter((p) => p.project_id === pid)
        .reduce((acc, p) => acc + Number(p.amount), 0);
      const pending = Math.max(0, (proj?.quoted_price ?? 0) - paidForProj);
      setAmount(pending > 0 ? pending.toFixed(2) : "");
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    formData.set("currency", currency);
    const result = await createPayment(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      setAmount("");
      setPaymentType("parcial");
    }
  }

  return (
    <div>
      {/* Add payment button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition mb-4"
        >
          <Plus size={16} />
          Registrar Pago
        </button>
      ) : (
        <div className="border border-border rounded-xl p-5 bg-white dark:bg-muted mb-6">
          <h3 className="font-semibold text-foreground mb-3">Nuevo Pago</h3>
          <form action={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Proyecto</label>
              <select
                name="project_id"
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monto ({currency})</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
              <select
                name="type"
                value={paymentType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="parcial">Parcial</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notas (opcional)</label>
              <input
                name="notes"
                placeholder="Transferencia bancaria, factura #123..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input name="is_invoiced" type="checkbox" value="true" className="rounded" />
                Facturado
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
            </div>
          </form>
          {error && <p className="text-xs text-danger font-medium mt-2">{error}</p>}
        </div>
      )}

      {/* Payments list */}
      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay pagos registrados.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white dark:bg-muted overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Proyecto</th>
                <th className="px-5 py-3 font-medium text-right">Monto</th>
                <th className="px-5 py-3 font-medium">Moneda</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Facturado</th>
                <th className="px-5 py-3 font-medium text-right">Saldo Pend.</th>
                <th className="px-5 py-3 font-medium">Notas</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const symbol = p.currency === "BOB" ? "Bs" : "$";
                // Calculate running balance for this project up to this payment row
                const sameProjectPayments = payments.filter(
                  (pay) => pay.project_id === p.project_id
                );
                const totalPaidForProject = sameProjectPayments.reduce(
                  (acc, pay) => acc + Number(pay.amount), 0
                );
                const projInfo = projects.find((pr) => pr.id === p.project_id);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 text-foreground whitespace-nowrap">{p.date}</td>
                    <td className="px-5 py-3 text-foreground font-medium">{p.project_name}</td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">
                      {symbol}{Number(p.amount).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{p.currency}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.type === "total"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {p.type === "total" ? "Total" : "Parcial"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.is_invoiced ? (
                        <FileCheck size={16} className="text-success" />
                      ) : (
                        <FileX size={16} className="text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      {(() => {
                        const pendiente = (projInfo?.quoted_price ?? 0) - totalPaidForProject;
                        return (
                          <span className={`font-medium ${pendiente > 0 ? "text-warning" : "text-success"}`}>
                            {symbol}{pendiente.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs max-w-50 truncate">
                      {p.notes ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ConfirmModal
                        title="Eliminar Pago"
                        message={`¿Eliminar pago de ${symbol}${Number(p.amount).toFixed(2)} del proyecto "${p.project_name}"?`}
                        onConfirm={async () => {
                          await deletePayment(p.id);
                        }}
                      >
                        <button className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition">
                          <Trash2 size={14} />
                        </button>
                      </ConfirmModal>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
