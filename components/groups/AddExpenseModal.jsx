"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Receipt, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { addGroupExpense } from "@/actions/groups";
import { cn } from "@/lib/utils";

export function AddExpenseModal({ groupId, members, currentUserId, onExpenseAdded }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    paidBy: currentUserId,
    splitType: "EQUAL",
    date: new Date().toISOString().split("T")[0],
  });

  // Selected participant IDs for the split
  const [participants, setParticipants] = useState(
    members.map((m) => m.userId)
  );

  // Manual/Percentage split amounts per user
  const [manualSplits, setManualSplits] = useState({});

  // State for the Paid By input text
  const [paidByInput, setPaidByInput] = useState("");
  // Local list of temporary members (names only)
  const [tempMembers, setTempMembers] = useState([]);

  // Combined map of all potential participants (members + temp)
  const allParticipatingEntities = [
    ...members.map(m => ({ id: m.userId, name: m.name || m.email, isMember: true })),
    ...tempMembers.map(t => ({ id: `temp-${t}`, name: t, isMember: false }))
  ];

  const memberMap = Object.fromEntries(
    allParticipatingEntities.map((m) => [m.id, m.name])
  );

  // Initialize Paid By input with current user
  useEffect(() => {
    const me = members.find(m => m.userId === currentUserId);
    if (me) setPaidByInput(me.name || me.email);
  }, [currentUserId, members]);

  // Handle Paid By input change
 const handlePaidByChange = (val) => {
  setPaidByInput(val);

  // Check if it matches an existing member exactly (case-insensitive)
  const match = members.find(
    (m) => (m.name || m.email).toLowerCase() === val.toLowerCase()
  );

  if (match) {
    // Only set paidBy (NO auto-adding participants here)
    setForm((f) => ({ ...f, paidBy: match.userId }));
  } else {
    // Don't create temp member on typing
    setForm((f) => ({ ...f, paidBy: null }));
  }
};

  const toggleParticipant = (entityId) => {
    setParticipants((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  };

  const updateManualSplit = (entityId, value) => {
    setManualSplits((prev) => ({ ...prev, [entityId]: value }));
  };

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (participants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    const splitPayload =
      form.splitType === "EQUAL"
        ? participants.map((uid) => ({ userId: uid, userName: memberMap[uid] }))
        : participants.map((uid) => ({
            userId: uid,
            userName: memberMap[uid],
            ...(form.splitType === "UNEQUAL"
              ? { amount: Number(manualSplits[uid] || 0) }
              : { percentage: Number(manualSplits[uid] || 0) }),
          }));

    setLoading(true);
    try {
      const result = await addGroupExpense({
        groupId,
        description: form.description,
        amount: Number(form.amount),
        paidBy: form.paidBy,
        paidByName: memberMap[form.paidBy] || paidByInput,
        splitType: form.splitType,
        participants:
          form.splitType === "EQUAL"
            ? participants.map((uid) => ({ userId: uid, userName: memberMap[uid] }))
            : [],
        splits: form.splitType !== "EQUAL" ? splitPayload : [],
        date: form.date,
      });

      if (result.success) {
        toast.success("Expense added!");
          setTimeout(() => {
    setOpen(false);
  }, 0);
        setForm({
          description: "",
          amount: "",
          paidBy: currentUserId,
          splitType: "EQUAL",
          date: new Date().toISOString().split("T")[0],
        });
        setTempMembers([]);
        onExpenseAdded?.();
      } else {
        toast.error(result.message || "Failed to add expense");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = Number(form.amount) || 0;
  const equalShare =
    participants.length > 0
      ? (totalAmount / participants.length).toFixed(2)
      : "0.00";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Add Expense
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-white" />
              </div>
              <Dialog.Title className="text-lg font-semibold">
                Add Expense
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description
              </label>
              <Input
                placeholder="e.g. Dinner at restaurant"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Paid By - Dynamic Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Paid By
              </label>
              <div className="relative">
                <Input
                  placeholder="Type a name..."
                  value={paidByInput}
                  onChange={(e) => handlePaidByChange(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   {members.some(m => (m.name || m.email).toLowerCase() === paidByInput.toLowerCase()) ? (
                     <div className="h-2 w-2 rounded-full bg-green-500" title="Existing Member" />
                   ) : (
                     paidByInput.trim() && <div className="h-2 w-2 rounded-full bg-amber-500" title="Temporary Member" />
                   )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Matched names use member accounts. New names create temporary participants.
              </p>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Date
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>

            {/* Split Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Split Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["EQUAL", "UNEQUAL", "PERCENTAGE"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, splitType: type }))}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                      form.splitType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                Participants
              </label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {allParticipatingEntities.map((entity) => {
                  const selected = participants.includes(entity.id);
                  return (
                    <div
                      key={entity.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
                        selected ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                      )}
                      onClick={() => toggleParticipant(entity.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                            selected
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          )}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 10 8"
                              className="h-3 w-3 text-white fill-current"
                            >
                              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                          entity.isMember ? "bg-gradient-to-br from-blue-400 to-purple-500" : "bg-amber-400"
                        )}>
                          {(entity.isMember ? "M" : "T")}
                        </div>
                        <span className="text-sm truncate max-w-[120px]">
                          {entity.name}
                          {entity.id === currentUserId ? " (You)" : ""}
                        </span>
                      </div>

                      {/* Manual / Percentage inputs */}
                      {selected && form.splitType !== "EQUAL" && (
                        <div className="relative w-20" onClick={(e) => e.stopPropagation()}>
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            {form.splitType === "PERCENTAGE" ? "%" : "₹"}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full pl-5 pr-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                            value={manualSplits[entity.id] || ""}
                            onChange={(e) =>
                              updateManualSplit(entity.id, e.target.value)
                            }
                            placeholder="0"
                          />
                        </div>
                      )}

                      {/* Equal share preview */}
                      {selected && form.splitType === "EQUAL" && totalAmount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ₹{equalShare}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
