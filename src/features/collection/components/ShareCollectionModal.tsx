"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
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
  const t = useT();
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
      if (!res.ok) throw new Error(json.error ?? t("share.failed"));
      toast.success(t("share.sent", { email: trimmed }));
      setEmail("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("share.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("share.title")}
      description={t("share.description", { name: collectionName })}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleInvite()} disabled={loading || !email.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("share.sending")}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {t("share.send")}
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-2 py-2">
        <Label htmlFor="invite-email">{t("share.emailLabel")}</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder={t("share.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">{t("share.hint")}</p>
      </div>
    </Modal>
  );
}
