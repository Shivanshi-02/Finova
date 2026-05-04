"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PendingInviteRow({ invite, onDeleted }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/groups/invites/${encodeURIComponent(invite.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to delete invite");
        return;
      }

      toast.success("Invite deleted");
      setConfirmOpen(false);
      onDeleted?.(invite.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50">
      <span className="text-gray-600">{invite.email}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          Pending
        </span>

        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete invite"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
              <Dialog.Title className="text-base font-semibold mb-2">
                Delete invite?
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the pending invite for{" "}
                <strong>{invite.email}</strong>?
              </Dialog.Description>
              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline" className="flex-1" disabled={loading}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

