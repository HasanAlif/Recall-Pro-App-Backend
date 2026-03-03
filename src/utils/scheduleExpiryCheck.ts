import cron from "node-cron";
import { PremiumPlan, User } from "../app/models";

const scheduleExpiryCheck = () => {
  cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    try {
      const [trialRes, paidRes] = await Promise.all([
        User.updateMany(
          { premiumPlan: PremiumPlan.TRIAL, premiumPlanExpiry: { $lte: now } },
          {
            $set: {
              premiumPlan: PremiumPlan.TRIAL_EXPIRED,
              premiumPlanExpiry: null,
            },
          },
        ),
        User.updateMany(
          {
            premiumPlan: {
              $in: [
                PremiumPlan.BASIC_MONTHLY,
                PremiumPlan.BASIC_ANNUAL,
                PremiumPlan.PREMIUM_MONTHLY,
                PremiumPlan.PREMIUM_ANNUAL,
              ],
            },
            premiumPlanExpiry: { $lte: now },
          },
          {
            $set: { premiumPlan: PremiumPlan.EXPIRED, premiumPlanExpiry: null },
          },
        ),
      ]);
      const total = trialRes.modifiedCount + paidRes.modifiedCount;
      if (total > 0) console.log(`[PlanExpiry] Expired ${total} plan(s).`);
    } catch (err) {
      console.error("[PlanExpiry] Cron error:", err);
    }
  });
  console.log("[Cron] Plan expiry check scheduled (daily at 00:00)");
};

export default scheduleExpiryCheck;
