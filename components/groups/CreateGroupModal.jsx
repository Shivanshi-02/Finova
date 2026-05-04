"use client";

import { useState } from "react";
import { Plus, X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroup } from "@/actions/groups";
import * as Dialog2 from "@radix-ui/react-dialog";

export function CreateGroupModal({ onGroupCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (emails.includes(trimmed)) {
      toast.error("Email already added");
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setLoading(true);
    try {
      const result = await createGroup({
        name: name.trim(),
        description,
        memberEmails: emails,
      });
      if (result.success) {
        toast.success("Group created!");
        setOpen(false);
        setName("");
        setDescription("");
        setEmails([]);
        onGroupCreated?.();
      } else {
        toast.error(result.message || "Failed to create group");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog2.Root open={open} onOpenChange={setOpen}>
      <Dialog2.Trigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </Dialog2.Trigger>

      <Dialog2.Portal>
        <Dialog2.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog2.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-md bg-white rounded-xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <Dialog2.Title className="text-lg font-semibold">
                Create New Group
              </Dialog2.Title>
            </div>
            <Dialog2.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </Dialog2.Close>
          </div>

          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Group Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Goa Trip, Flatmates"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description (optional)
              </label>
              <Input
                placeholder="What's this group for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Invite Members */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Invite Members by Email
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="friend@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                  Add
                </Button>
              </div>

              {/* Email chips */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200"
                    >
                      {email}
                      <button onClick={() => removeEmail(email)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                They’ll receive an invite link to join. You can also add them later.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Dialog2.Close asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </Dialog2.Close>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </Dialog2.Content>
      </Dialog2.Portal>
    </Dialog2.Root>
  );
}
