"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { updateCompany, deleteCompany } from "@/app/actions/crud";

interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  payment_method: string;
  billing_details: string | null;
  notification_email: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

export function CompanyRow({ company, lastPaymentDate }: { company: Company; lastPaymentDate: string | null }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(company.name);
  const [taxId, setTaxId] = useState(company.tax_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState(company.payment_method);
  const [billingDetails, setBillingDetails] = useState(company.billing_details ?? "");
  const [notificationEmail, setNotificationEmail] = useState(company.notification_email ?? "");
  const [contactPerson, setContactPerson] = useState(company.contact_person ?? "");
  const [contactPhone, setContactPhone] = useState(company.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(company.contact_email ?? "");

  async function handleSave() {
    setLoading(true);
    const formData = new FormData();
    formData.set("id", company.id);
    formData.set("name", name);
    formData.set("tax_id", taxId);
    formData.set("payment_method", paymentMethod);
    formData.set("billing_details", billingDetails);
    formData.set("notification_email", notificationEmail);
    formData.set("contact_person", contactPerson);
    formData.set("contact_phone", contactPhone);
    formData.set("contact_email", contactEmail);
    await updateCompany(formData);
    setLoading(false);
    setEditing(false);
  }

  function handleCancel() {
    setName(company.name);
    setTaxId(company.tax_id ?? "");
    setPaymentMethod(company.payment_method);
    setBillingDetails(company.billing_details ?? "");
    setNotificationEmail(company.notification_email ?? "");
    setContactPerson(company.contact_person ?? "");
    setContactPhone(company.contact_phone ?? "");
    setContactEmail(company.contact_email ?? "");
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${company.name}"?`)) return;
    setLoading(true);
    await deleteCompany(company.id);
    setLoading(false);
  }

  if (editing) {
    return (
      <tr className="border-b border-border last:border-0 bg-primary/5">
        <td className="px-5 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </td>
        <td className="px-5 py-2">
          <input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </td>
        <td className="px-5 py-2">
          <div className="space-y-1">
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Nombre de contacto"
              className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+591 70000000"
              type="tel"
              className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </td>
        <td className="px-5 py-2">
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            type="email"
            className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </td>
        <td className="px-5 py-2 text-muted-foreground text-xs">—</td>
        <td className="px-5 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-1 rounded hover:bg-success/20 text-success transition disabled:opacity-50"
              title="Guardar"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-danger/20 text-danger transition"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/50">
      <td className="px-5 py-3 text-foreground font-medium">{company.name}</td>
      <td className="px-5 py-3 text-muted-foreground">{company.tax_id ?? "—"}</td>
      <td className="px-5 py-3 text-sm">
        <div>
          <p className="text-foreground">{company.contact_person ?? <span className="text-muted-foreground">—</span>}</p>
          {company.contact_phone && (
            <a href={`https://wa.me/${company.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">{company.contact_phone}</a>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-muted-foreground text-xs">
        {company.contact_email ?? company.notification_email ?? <span className="text-warning">Sin email</span>}
      </td>
      <td className="px-5 py-3 text-muted-foreground text-sm">
        {lastPaymentDate
          ? new Date(lastPaymentDate).toLocaleDateString("es-BO")
          : <span className="text-xs text-warning">Sin pagos</span>}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}
