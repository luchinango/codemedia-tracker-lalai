"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { addSelfAsCollaborator } from "@/app/actions/crud";

export function SelfAssignButton({ projectId, userId }: { projectId: string; userId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await addSelfAsCollaborator(projectId, userId);
    setLoading(false);
    if (result.success) setDone(true);
  }

  if (done) {
    return (
      <span className="text-[10px] text-success font-medium">Agregado al equipo</span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition disabled:opacity-50"
      title="Agregarme como desarrollador"
    >
      <UserPlus size={12} />
      {loading ? "..." : "Unirme al equipo"}
    </button>
  );
}
