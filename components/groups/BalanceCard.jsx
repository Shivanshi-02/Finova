import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BalanceCard – shows per-user balance in the group detail page
 * @param {string} userId
 * @param {string} name
 * @param {number} balance  positive = owed to them, negative = they owe
 * @param {boolean} isCurrentUser
 */
export function BalanceCard({ userId, name, balance, isCurrentUser }) {
  const rounded = parseFloat(balance.toFixed(2));
  const isOwed = rounded > 0.01;
  const isOwe = rounded < -0.01;
  const isSettled = !isOwed && !isOwe;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-colors",
        isOwed && "bg-green-50 border-green-200",
        isOwe && "bg-red-50 border-red-200",
        isSettled && "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">
            {isCurrentUser ? "You" : name}
          </p>
          <p className={cn(
            "text-xs font-medium",
            isOwed && "text-green-600",
            isOwe && "text-red-600",
            isSettled && "text-gray-400"
          )}>
            {isOwed && `get back ₹${Math.abs(rounded).toFixed(2)}`}
            {isOwe && `owe ₹${Math.abs(rounded).toFixed(2)}`}
            {isSettled && "settled up"}
          </p>
        </div>
      </div>

      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center",
        isOwed && "bg-green-100",
        isOwe && "bg-red-100",
        isSettled && "bg-gray-100"
      )}>
        {isOwed && <TrendingUp className="h-4 w-4 text-green-600" />}
        {isOwe && <TrendingDown className="h-4 w-4 text-red-600" />}
        {isSettled && <Minus className="h-4 w-4 text-gray-400" />}
      </div>
    </div>
  );
}
