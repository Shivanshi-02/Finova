"use client";

import Link from "next/link";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Users, TrendingUp, TrendingDown, Minus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GroupCard({ group, onDeleted }) {
  const { id, name, description, memberCount, myBalance } = group;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const balanceStatus =
    myBalance > 0.01 ? "owed" : myBalance < -0.01 ? "owe" : "settled";

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to delete group");
        return;
      }

      toast.success("Group deleted");
      setConfirmOpen(false);
      onDeleted?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/groups/${id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border hover:border-blue-200 group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors">
                  {name}
                </CardTitle>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BalanceBadge status={balanceStatus} amount={myBalance} />

              <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500"
                    title="Delete group"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                  <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
                    <Dialog.Title className="text-base font-semibold mb-2">
                      Delete group?
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mb-6">
                      Are you sure you want to delete <strong>{name}</strong>?
                      This will remove the group and its related records.
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete();
                        }}
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
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BalanceBadge({ status, amount }) {
  if (status === "settled") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" />
        Settled
      </Badge>
    );
  }
  if (status === "owed") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />
        +₹{Math.abs(amount).toFixed(2)}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 text-xs font-medium">
      <TrendingDown className="h-3 w-3" />
      -₹{Math.abs(amount).toFixed(2)}
    </Badge>
  );
}
