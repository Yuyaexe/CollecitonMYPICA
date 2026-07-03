"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionName: string;
}

export function ShareCollectionModal({
  open,
  onOpenChange,
  collectionId,
  collectionName,
}: ShareCollectionModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/app/collections/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao enviar convite");
      toast.success(`Convite enviado para ${trimmed}`);
      setEmail("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar convite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Compartilhar coleção"
      description={`Convide alguém para editar "${collectionName}" com você. A pessoa precisa criar conta com o mesmo email do convite.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email.trim()}>
            {loading ? "Enviando..." : "Enviar convite"}
          </Button>
        </>
      }
    >
      <div className="space-y-2 py-2">
        <Label htmlFor="invite-email">Email do amigo</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="amigo@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Não use seu próprio email — você já é o dono. Quando a pessoa entrar, a coleção
          aparece automaticamente e vocês veem onde o outro está navegando ao vivo.
        </p>
      </div>
    </Modal>
  );
}
