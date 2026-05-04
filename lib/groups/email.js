import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a group invitation email using Resend.
 */
export async function sendGroupInviteEmail({ to, inviterName, groupName, inviteLink }) {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Note: In production use a verified domain
      to: to,
      subject: `You're invited to join "${groupName}" on FINOVA`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #1e40af; margin-bottom: 16px;">Group Invitation</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">
            Hello! <strong>${inviterName}</strong> has invited you to join their group <strong>"${groupName}"</strong> on FINOVA to track shared expenses.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; text-align: center; color: #64748b;">
            If the button doesn't work, copy and paste this link into your browser: <br/>
            <span style="color: #2563eb; font-size: 12px;">${inviteLink}</span>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Sent via FINOVA — Your Collaborative Expense Tracker
          </p>
        </div>
      `,
    });

    console.log("Resend FULL response:", JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error("Resend Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: err.message };
  }
}













export async function sendBudgetAlertEmail({
  to,
  userName,
  percentageUsed,
  totalExpenses,
  budgetAmount,
  accountName,
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "⚠️ Budget Alert - FINOVA",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #dc2626;">Budget Alert ⚠️</h2>

          <p>Hello <strong>${userName}</strong>,</p>

          <p>
            You have used <strong>${percentageUsed.toFixed(2)}%</strong> of your budget 
            for account <strong>${accountName}</strong>.
          </p>

          <p>
            💸 Expenses: ₹${totalExpenses}<br/>
            🎯 Budget: ₹${budgetAmount}
          </p>

          <p style="color: #ef4444; font-weight: bold;">
            You are close to exceeding your budget. Please track your spending!
          </p>

          <hr />
          <p style="font-size: 12px; color: #94a3b8;">
            FINOVA - Smart Expense Tracker
          </p>
        </div>
      `,
    });

    console.log("Budget Email:", { data, error });

    if (error) return { success: false, error };

    return { success: true };
  } catch (err) {
    console.error("Budget email failed:", err);
    return { success: false, error: err.message };
  }
}