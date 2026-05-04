"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Mail, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GroupCard } from "@/components/groups/GroupCard";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { getUserGroups, getPendingInvites, acceptInvite, rejectInvite } from "@/actions/groups";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [groupData, inviteData] = await Promise.all([
        getUserGroups(),
        getPendingInvites(),
      ]);
      setGroups(groupData);
      setInvites(inviteData);
    } catch (err) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async (token) => {
    try {
      const result = await acceptInvite(token);
      if (result.success) {
        toast.success("Joined group!");
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleReject = async (token) => {
    try {
      await rejectInvite(token);
      toast.success("Invite declined");
      fetchData();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <Toaster richColors />
      <div className="space-y-8">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-title">
              Groups
            </h1>
            <p className="text-muted-foreground mt-1">
              Track shared expenses with friends, flatmates, and travel buddies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <CreateGroupModal onGroupCreated={fetchData} />
          </div>
        </div>

        {/* ── Pending Invites ── */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-violet-500" />
              Pending Invites
              <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                {invites.length}
              </span>
            </h2>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-violet-50 border-violet-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {inv.groupName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{inv.groupName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {inv.memberCount} member{inv.memberCount !== 1 ? "s" : ""}
                        <span className="mx-1">·</span>
                        <Clock className="h-3 w-3" />
                        Expires {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(inv.token)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => handleAccept(inv.token)}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Group List ── */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Your Groups
            {groups.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {groups.length}
              </span>
            )}
          </h2>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg">No groups yet</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  Create your first group to start splitting expenses with friends
                </p>
                <CreateGroupModal onGroupCreated={fetchData} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} onDeleted={fetchData} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}