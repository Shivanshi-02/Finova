import { cn } from "@/lib/utils";

/**
 * MemberAvatars – shows a row of overlapping avatar initials.
 * @param {Array<{userId, name, email, role}>} members
 * @param {number} max  – max avatars before "+N more"
 */
export function MemberAvatars({ members = [], max = 5 }) {
  const visible = members.slice(0, max);
  const extra = members.length - max;

  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
  ];

  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div
          key={m.userId}
          title={m.name || m.email}
          className={cn(
            "h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
            colors[i % colors.length],
            i > 0 && "-ml-2"
          )}
        >
          {(m.name || m.email || "?").charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold -ml-2">
          +{extra}
        </div>
      )}
    </div>
  );
}
