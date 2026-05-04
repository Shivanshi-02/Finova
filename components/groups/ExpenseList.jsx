"use client";

import { useState } from "react";
import { Trash2, Loader2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { deleteGroupExpense } from "@/actions/groups";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExpenseList({ expenses, currentUserId, onDeleted }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">💸</span>
        </div>
        <p className="font-medium text-gray-500">No expenses yet</p>
        <p className="text-sm text-gray-400 mt-1">Add your first group expense above</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          currentUserId={currentUserId}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}

function ExpenseRow({ expense, currentUserId, onDeleted }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPayer = expense.paidBy === currentUserId;
  const myShare = expense.splits?.find((s) => s.userId === currentUserId);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteGroupExpense(expense.id);
      if (result.success) {
        toast.success("Expense deleted");
        setConfirmOpen(false);
        onDeleted?.();
      } else {
        toast.error(result.message || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border bg-white hover:border-gray-300 transition-all group">
      <div className="flex items-start gap-3 min-w-0">
        {/* Date circle */}
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-blue-600 leading-none">
            {new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit" })}
          </span>
          <span className="text-[10px] text-blue-400 leading-none mt-0.5">
            {new Date(expense.date).toLocaleDateString("en-IN", { month: "short" })}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {expense.description || "Expense"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {isPayer ? "You paid" : `${expense.paidByName || expense.paidBy} paid`}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              {expense.splitType === "EQUAL" ? "Equal" : expense.splitType === "PERCENTAGE" ? "%" : "Custom"}
            </span>
          </div>
          {myShare && (
            <p className={cn(
              "text-xs mt-1 font-medium",
              isPayer ? "text-green-600" : "text-red-500"
            )}>
              {isPayer ? `You get back ₹${(expense.amount - myShare.amount).toFixed(2)}` : `Your share: ₹${myShare.amount.toFixed(2)}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-base font-bold">₹{Number(expense.amount).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{expense.splits?.length || 0} splits</p>
        </div>

        {/* Delete confirm */}
        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Trigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
              <Dialog.Title className="text-base font-semibold mb-2">Delete Expense?</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-6">
                This will permanently delete <strong>{expense.description || "this expense"}</strong> (₹{Number(expense.amount).toFixed(2)}) and all its splits. This cannot be undone.
              </Dialog.Description>
              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline" className="flex-1">Cancel</Button>
                </Dialog.Close>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
