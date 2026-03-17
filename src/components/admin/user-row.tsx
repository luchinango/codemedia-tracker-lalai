"use client";

import { useState } from "react";
import { Mail, Phone, Pencil, X, Check, CheckCircle, Clock, KeyRound, Trash2 } from "lucide-react";
import { upsertUser, setUserPassword, deleteUser } from "@/app/actions/crud";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PasswordInput } from "@/components/ui/password-input";

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
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const computedRate = pretension ? (parseFloat(pretension) / 160).toFixed(2) : String(user.hourly_rate);

  const cleanPhone = (user.phone ?? "").replace(/\D/g, "");

  async function handleSetPassword() {
    setPwLoading(true);
    setPwMsg(null);
    const result = await setUserPassword(user.email, password);
    setPwLoading(false);
    if (result.error) {
      setPwMsg({ text: result.error, ok: false });
    } else {
      setPwMsg({ text: result.message ?? "Listo", ok: true });
      setPassword("");
      setTimeout(() => {
        setShowPassword(false);
        setPwMsg(null);
      }, 2000);
    }
  }

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
              Tarifa: Bs{computedRate}/hr
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
    <>
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
            Bs{Number(user.hourly_rate).toFixed(2)}/hr
          </span>
          {user.pretension_salarial != null && (
            <span className="text-[10px] text-muted-foreground">
              Pretensión: Bs{Number(user.pretension_salarial).toLocaleString()}/mes
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => { setShowPassword(!showPassword); setPwMsg(null); }}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
            title="Asignar contraseña"
          >
            <KeyRound size={13} />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <ConfirmModal
            title="Eliminar Miembro"
            message={`¿Eliminar a ${user.name} (${user.email}) del equipo? Se eliminarán sus asignaciones y registros de tiempo.`}
            onConfirm={async () => {
              await deleteUser(user.id);
            }}
          >
            <button
              className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          </ConfirmModal>
        </div>
      </td>
    </tr>
    {showPassword && (
      <tr className="border-b border-border last:border-0 bg-primary/5">
        <td colSpan={6} className="px-5 py-3">
          <div className="flex items-center gap-3 max-w-lg">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Contraseña para <strong>{user.email}</strong>:
            </span>
            <PasswordInput
              name="pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleSetPassword}
              disabled={pwLoading || password.length < 6}
              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {pwLoading ? "..." : "Guardar"}
            </button>
            <button
              onClick={() => { setShowPassword(false); setPassword(""); setPwMsg(null); }}
              className="p-1 rounded hover:bg-danger/20 text-danger transition"
            >
              <X size={14} />
            </button>
            {pwMsg && (
              <span className={`text-xs font-medium ${pwMsg.ok ? "text-success" : "text-danger"}`}>
                {pwMsg.text}
              </span>
            )}
          </div>
        </td>
      </tr>
    )}
    </>
  );
}
