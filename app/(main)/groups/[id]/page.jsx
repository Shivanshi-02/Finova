"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatars } from "@/components/groups/MemberAvatars";
import { BalanceCard } from "@/components/groups/BalanceCard";
import { ExpenseList } from "@/components/groups/ExpenseList";
import { AddExpenseModal } from "@/components/groups/AddExpenseModal";
import { SettleUpModal } from "@/components/groups/SettleUpModal";
import { InviteMemberModal } from "@/components/groups/InviteMemberModal";
import { GroupMemberRow } from "@/components/groups/GroupMemberRow";
import { PendingInviteRow } from "@/components/groups/PendingInviteRow";
import { getGroupById } from "@/actions/groups";
import { simplifyDebts } from "@/lib/groups/splitCalculator";
import { cn } from "@/lib/utils";

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses"); // expenses | balances | settlements

  const fetchGroup = useCallback(async () => {
    try {
      setRefreshing(true);
      const result = await getGroupById(id);
      setData(result);
    } catch (err) {
      toast.error(err.message || "Failed to load group");
      router.push("/groups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (!data) return null;

  const { group, balances, currentUserId } = data;
  const myBalance = balances?.[currentUserId]?.balance ?? 0;
  const myBalanceRounded = parseFloat(myBalance.toFixed(2));
  const suggestedSettlements = simplifyDebts(balances);

  const isAdmin = group.members.find((m) => m.userId === currentUserId)?.role === "ADMIN";

  return (
    <>
      <Toaster richColors />
      <div className="space-y-6">

        {/* ── Back + Title ── */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/groups"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Groups
            </Link>
            <h1 className="text-3xl font-bold tracking-tight gradient-title">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-muted-foreground mt-1 text-sm">{group.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchGroup}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ── Summary Header Card ── */}
        <Card className="border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Members + avatars */}
              <div className="flex items-center gap-3">
                <MemberAvatars members={group.members} />
                <div>
                  <p className="text-white/70 text-sm">
                    {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {group.members.slice(0, 3).map((m) => (
                      <span key={m.userId} className="text-xs text-white/90">
                        {m.userId === currentUserId ? "You" : m.name || m.email}
                        {m.role === "ADMIN" && (
                          <Crown className="h-3 w-3 inline ml-0.5 text-yellow-300" />
                        )}
                      </span>
                    ))}
                    {group.members.length > 3 && (
                      <span className="text-xs text-white/70">
                        +{group.members.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* My balance summary */}
              <div className="text-right">
                <p className="text-white/70 text-sm">Your balance</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  {myBalanceRounded > 0.01 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-300" />
                      <span className="text-2xl font-bold text-green-300">
                        +₹{Math.abs(myBalanceRounded).toFixed(2)}
                      </span>
                    </>
                  ) : myBalanceRounded < -0.01 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-red-300" />
                      <span className="text-2xl font-bold text-red-300">
                        -₹{Math.abs(myBalanceRounded).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-5 w-5 text-white/60" />
                      <span className="text-2xl font-bold text-white/80">All settled</span>
                    </>
                  )}
                </div>
                <p className="text-white/60 text-xs mt-0.5">
                  {myBalanceRounded > 0.01
                    ? "you are owed"
                    : myBalanceRounded < -0.01
                    ? "you owe"
                    : "no pending dues"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/20">
              <AddExpenseModal
                groupId={id}
                members={group.members}
                currentUserId={currentUserId}
                onExpenseAdded={fetchGroup}
              />
              <SettleUpModal
                groupId={id}
                members={group.members}
                currentUserId={currentUserId}
                balances={balances}
                onSettled={fetchGroup}
              />
              <InviteMemberModal groupId={id} onInvited={fetchGroup} />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b">
          {["expenses", "balances", "settlements"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "expenses" && group.expenses.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                  {group.expenses.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Expenses ── */}
        {activeTab === "expenses" && (
          <ExpenseList
            expenses={group.expenses}
            currentUserId={currentUserId}
            onDeleted={fetchGroup}
          />
        )}

        {/* ── Tab: Balances ── */}
        {activeTab === "balances" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Balance Summary
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(balances).map(([uid, { name, balance }]) => (
                  <BalanceCard
                    key={uid}
                    userId={uid}
                    name={name}
                    balance={balance}
                    isCurrentUser={uid === currentUserId}
                  />
                ))}
              </div>
            </div>

            {suggestedSettlements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Suggested Settlements
                </h3>
                <div className="space-y-2">
                  {suggestedSettlements.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-amber-50 border-amber-200">
                      <div className="text-sm">
                        <span className="font-semibold">
                          {t.from === currentUserId ? "You" : t.fromName}
                        </span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-semibold">
                          {t.to === currentUserId ? "You" : t.toName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">
                        ₹{t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Settlements ── */}
        {activeTab === "settlements" && (
          <div>
            {group.settlements.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🤝</span>
                </div>
                <p className="font-medium text-gray-500">No settlements yet</p>
                <p className="text-sm text-gray-400 mt-1">Use “Settle Up” to record payments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {group.settlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border bg-emerald-50 border-emerald-200">
                    <div>
                      <div className="text-sm font-medium">
                        <span>{s.fromUserId === currentUserId ? "You" : s.fromUserName}</span>
                        <span className="text-muted-foreground mx-2">paid</span>
                        <span>{s.toUserId === currentUserId ? "You" : s.toUserName}</span>
                      </div>
                      {s.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.settledAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    </div>
                    <span className="text-base font-bold text-emerald-700">
                      ₹{Number(s.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Members Panel ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {group.members.map((m) => (
              <GroupMemberRow
                key={m.userId}
                member={m}
                groupId={id}
                currentUserId={currentUserId}
                groupCreatedBy={group.createdBy}
                canRemoveOthers={isAdmin}
                onRemoved={fetchGroup}
              />
            ))}
          </CardContent>
        </Card>

        {/* Pending invites panel */}
        {group.invites.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Pending Invites ({group.invites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.invites.map((inv) => (
                <PendingInviteRow
                  key={inv.id}
                  invite={inv}
                  onDeleted={fetchGroup}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}