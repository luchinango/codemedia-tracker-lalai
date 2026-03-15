"use client";

import { useState } from "react";
import { Mail, Phone, DollarSign, Pencil, X, Check, CheckCircle, Clock } from "lucide-react";
import { upsertUser } from "@/app/actions/crud";

interface TaskSummary {
  total: number;
  pending: number;
  done: number;
  lastDone: string | null;
}

interface UserRowProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    hourly_rate: number;
    pretension_salarial: number | null;
    phone: string | null;
    created_at: string;
  };
  taskSummary: TaskSummary;
}

export function UserRow({ user, taskSummary }: UserRowProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.name);
  const [phoneVal, setPhoneVal] = useState(user.phone ?? "");
  const [pretension, setPretension] = useState(
    user.pretension_salarial != null ? String(user.pretension_salarial) : ""
  );

  const computedRate = pretension ? (parseFloat(pretension) / 160).toFixed(2) : String(user.hourly_rate);

  const cleanPhone = (user.phone ?? "").replace(/\D/g, "");

  async function handleSave() {
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", user.email);
    formData.set("role", user.role);
    if (phoneVal) formData.set("phone", phoneVal);
    if (pretension) formData.set("pretension_salarial", pretension);
    await upsertUser(formData);
    setLoading(false);
    setEditing(false);
  }

  function handleCancel() {
    setName(user.name);
    setPhoneVal(user.phone ?? "");
    setPretension(
      user.pretension_salarial != null ? String(user.pretension_salarial) : ""
    );
    setEditing(false);
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
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Mail size={13} />
              {user.email}
            </span>
            <input
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="+591 70000000"
              className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </td>
        <td className="px-5 py-2">
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
            {user.role}
          </span>
        </td>
        <td className="px-5 py-2 text-center text-muted-foreground text-xs">—</td>
        <td className="px-5 py-2">
          <div>
            <input
              value={pretension}
              onChange={(e) => setPretension(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="Pretensión salarial"
              className="w-32 px-2 py-1 rounded border border-border bg-background text-foreground text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
              Tarifa: ${computedRate}/hr
            </p>
          </div>
        </td>
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
      <td className="px-5 py-3 text-foreground font-medium">{user.name}</td>
      <td className="px-5 py-3">
        <div className="space-y-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Mail size={13} />
            {user.email}
          </span>
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-green-600 hover:underline"
            >
              <Phone size={13} />
              {user.phone}
            </a>
          )}
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
          {user.role}
        </span>
      </td>
      <td className="px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-warning" title="Pendientes">
            <Clock size={12} /> {taskSummary.pending}
          </span>
          <span className="flex items-center gap-1 text-success" title="Completadas">
            <CheckCircle size={12} /> {taskSummary.done}
          </span>
        </div>
        {taskSummary.lastDone && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Última: {new Date(taskSummary.lastDone).toLocaleDateString("es-BO")}
          </p>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <div>
          <span className="flex items-center justify-end gap-1 text-foreground font-medium">
            <DollarSign size={13} />
            {Number(user.hourly_rate).toFixed(2)}/hr
          </span>
          {user.pretension_salarial != null && (
            <span className="text-[10px] text-muted-foreground">
              Pretensión: ${Number(user.pretension_salarial).toLocaleString()}
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
      </td>
    </tr>
  );
}
