"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptInvite, rejectInvite } from "@/actions/groups";
import Link from "next/link";

export default function InviteAcceptPage() {
  const { token } = useParams();
  const [status, setStatus] = useState("idle"); // idle | loading | accepted | rejected | error
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState(null);

  const handleAccept = async () => {
    setStatus("loading");
    try {
      const result = await acceptInvite(token);
      if (result.success) {
        setStatus("accepted");
        setGroupId(result.groupId);
      } else {
        setStatus("error");
        setMessage(result.message || "Failed to accept invite");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const handleReject = async () => {
    setStatus("loading");
    try {
      const result = await rejectInvite(token);
      if (result.success) {
        setStatus("rejected");
      } else {
        setStatus("error");
        setMessage(result.message || "Failed to decline invite");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center">

          {status === "idle" && (
            <>
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">👥</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Group Invitation</h1>
              <p className="text-muted-foreground mb-8">
                You’ve been invited to join a group on FINOVA. Accept to start tracking expenses together.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleReject}
                >
                  Decline
                </Button>
                <Button className="flex-1" onClick={handleAccept}>
                  Accept &amp; Join
                </Button>
              </div>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Processing...</p>
            </>
          )}

          {status === "accepted" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">You’re in! 🎉</h2>
              <p className="text-muted-foreground mb-6">
                You’ve successfully joined the group.
              </p>
              <Link href={groupId ? `/groups/${groupId}` : "/groups"}>
                <Button className="w-full">
                  Go to Group
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </>
          )}

          {status === "rejected" && (
            <>
              <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Invite Declined</h2>
              <p className="text-muted-foreground mb-6">
                You’ve declined the group invite.
              </p>
              <Link href="/groups">
                <Button variant="outline" className="w-full">
                  Back to Groups
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex gap-3">
                <Link href="/groups" className="flex-1">
                  <Button variant="outline" className="w-full">Back to Groups</Button>
                </Link>
                <Button className="flex-1" onClick={handleAccept}>
                  Try Again
                </Button>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
