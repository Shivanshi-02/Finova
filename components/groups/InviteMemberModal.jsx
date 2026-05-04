"use client";

import { useState } from "react";
import { X, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { inviteMember } from "@/actions/groups";

export function InviteMemberModal({ groupId, onInvited }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const result = await inviteMember({ groupId, email: trimmed });
      if (result.success) {
        setInviteLink(result.inviteLink);
        toast.success("Invite created!");
        onInvited?.();
      } else {
        toast.error(result.message || "Failed to send invite");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <Dialog.Trigger asChild>
        <Button className="flex items-center gap-2 bg-black text-white hover:bg-black">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <Dialog.Title className="text-lg font-semibold">Invite Member</Dialog.Title>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!inviteLink ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="friend@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    An invite link will be generated. Share it with your friend.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleClose} className="flex-1 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <Button className="flex-1" onClick={handleInvite} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : "Send Invite"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium">Invite Created!</p>
                <p className="text-sm text-muted-foreground mt-1">Share this link with <strong>{email}</strong></p>
              </div>
              <div className="flex gap-2 border rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-600 flex-1 break-all">{inviteLink}</p>
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 p-1 hover:text-blue-600 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <Button className="w-full mt-4" onClick={handleClose}>Done</Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
