"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Crown, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Single member row with optional remove (admins only, not self, not creator).
 */
export function GroupMemberRow({
  member,
  groupId,
  currentUserId,
  groupCreatedBy,
  canRemoveOthers,
  onRemoved,
}) {
  const displayName =
    member.userId === currentUserId ? "You" : member.name || member.email;

  const showRemoveControl =
    canRemoveOthers &&
    member.userId !== currentUserId &&
    member.userId !== groupCreatedBy;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 min-w-0">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {(member.name || member.email || "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {member.role === "ADMIN" && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Crown className="h-3 w-3 shrink-0" />
            Admin
          </span>
        )}
        {showRemoveControl && (
          <RemoveMemberButton
            groupId={groupId}
            member={member}
            displayName={member.name || member.email || "this member"}
            onRemoved={onRemoved}
          />
        )}
      </div>
    </div>
  );
}

function RemoveMemberButton({ groupId, member, displayName, onRemoved }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(member.userId)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to remove member");
        return;
      }

      toast.success("Member removed");
      setConfirmOpen(false);
      onRemoved?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Remove member"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
          <Dialog.Title className="text-base font-semibold mb-2">
            Remove member?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            Are you sure you want to remove{" "}
            <strong>{displayName}</strong> from this group? They will lose access
            to shared expenses; their user account is not deleted.
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
              onClick={handleRemove}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
