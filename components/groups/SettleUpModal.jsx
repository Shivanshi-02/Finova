"use client";

import { useState } from "react";
import { X, Loader2, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { settleUp } from "@/actions/groups";

export function SettleUpModal({ groupId, members, currentUserId, balances, onSettled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Only show members I owe money to (negative balance means I owe them)
  const myBalance = balances?.[currentUserId]?.balance ?? 0;

  // Build list of creditors (users who I owe)
  const creditors = members.filter((m) => {
    if (m.userId === currentUserId) return false;
    const theirBal = balances?.[m.userId]?.balance ?? 0;
    // If they have positive balance and I have negative, I owe them
    return theirBal > 0.01 || myBalance < -0.01;
  });

  const handleSettle = async () => {
    if (!toUserId) { toast.error("Select who you're paying"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }

    const toMember = members.find((m) => m.userId === toUserId);
    setLoading(true);
    try {
      const result = await settleUp({
        groupId,
        toUserId,
        toUserName: toMember?.name || toMember?.email,
        amount: Number(amount),
        note,
      });
      if (result.success) {
        toast.success("Settlement recorded!");
        setOpen(false);
        setToUserId("");
        setAmount("");
        setNote("");
        onSettled?.();
      } else {
        toast.error(result.message || "Failed to record settlement");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className="flex items-center gap-2 bg-black text-white hover:bg-black">
          <HandCoins className="h-4 w-4" />
         Settle Up
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <HandCoins className="h-4 w-4 text-white" />
              </div>
              <Dialog.Title className="text-lg font-semibold">Settle Up</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Pay To <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-input rounded-md px-3 h-9 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={toUserId}
                onChange={(e) => {
                  setToUserId(e.target.value);
                  // Auto-fill suggested amount
                  const theirBal = balances?.[e.target.value]?.balance ?? 0;
                  const myOwe = Math.abs(myBalance);
                  if (myOwe > 0.01) setAmount(myOwe.toFixed(2));
                }}
              >
                <option value="">Select member...</option>
                {members
                  .filter((m) => m.userId !== currentUserId)
                  .map((m) => {
                    const bal = balances?.[m.userId]?.balance ?? 0;
                    return (
                      <option key={m.userId} value={m.userId}>
                        {m.name || m.email}
                        {bal > 0.01 ? ` (is owed ₹${bal.toFixed(2)})` : ""}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. Paid via UPI"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1">Cancel</Button>
            </Dialog.Close>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSettle} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Recording...</> : "Record Payment"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
