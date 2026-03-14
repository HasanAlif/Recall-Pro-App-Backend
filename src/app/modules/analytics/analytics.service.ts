import { Client } from "../client/client.model";
import { ClientVisit } from "../clientVisit/clientVisit.model";

type EarningFilter = "today" | "7-days" | "30-days" | "all-time";

const getAnalyticsData = async (
  userId: string,
  filter: EarningFilter = "today",
) => {
  const clientIds = await Client.find({ userId }).distinct("_id");
  const matchClients = { clientId: { $in: clientIds } };

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // Compute current and previous period boundaries based on filter
  // today        → current: today,       previous: yesterday
  // 7-days       → current: last 7 days, previous: the 7 days before that
  // 30-days      → current: last 30 days,previous: the 30 days before that
  // all-time     → no comparison, only Earning
  const periodDays: Record<string, number> = {
    today: 1,
    "7-days": 7,
    "30-days": 30,
  };

  const days = periodDays[filter]; // undefined for all-time

  // For all-time: single aggregation, no date filter
  if (!days) {
    const [allTimeAgg] = await ClientVisit.aggregate([
      { $match: matchClients },
      {
        $group: {
          _id: null,
          service: { $sum: { $ifNull: ["$servicePrice", 0] } },
          tips: { $sum: { $ifNull: ["$tips", 0] } },
        },
      },
    ]);

    const service = allTimeAgg?.service ?? 0;
    const tips = allTimeAgg?.tips ?? 0;

    return {
      Earning: { total: service + tips, service, tips },
    };
  }

  // Current period: [currentStart, endOfToday)
  const currentStart = new Date(startOfToday);
  currentStart.setDate(currentStart.getDate() - (days - 1));

  // Previous period: [prevStart, currentStart)
  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - days);

  const groupStage = {
    $group: {
      _id: null,
      service: { $sum: { $ifNull: ["$servicePrice", 0] } },
      tips: { $sum: { $ifNull: ["$tips", 0] } },
    },
  };

  const [currentAgg, prevAgg] = await Promise.all([
    ClientVisit.aggregate([
      {
        $match: {
          ...matchClients,
          createdAt: { $gte: currentStart, $lt: endOfToday },
        },
      },
      groupStage,
    ]),
    ClientVisit.aggregate([
      {
        $match: {
          ...matchClients,
          createdAt: { $gte: prevStart, $lt: currentStart },
        },
      },
      groupStage,
    ]),
  ]);

  const currentService = currentAgg[0]?.service ?? 0;
  const currentTips = currentAgg[0]?.tips ?? 0;
  const currentTotal = currentService + currentTips;

  const prevTotal = (prevAgg[0]?.service ?? 0) + (prevAgg[0]?.tips ?? 0);

  // Growth percentage: current period vs previous period
  let growthPercentage = 0;
  if (prevTotal > 0) {
    growthPercentage = Math.round(
      ((currentTotal - prevTotal) / prevTotal) * 100,
    );
  } else if (currentTotal > 0) {
    growthPercentage = 100;
  }

  // Tips percentage relative to current period total earning
  const tipsPercentageComparetotalEarning =
    currentTotal > 0 ? Math.round((currentTips / currentTotal) * 100) : 0;

  return {
    Earning: {
      total: currentTotal,
      service: currentService,
      tips: currentTips,
    },
    thisWeek: {
      totalEarning: currentTotal,
      growthPercentage,
    },
    tips: {
      totalTips: currentTips,
      tipsPercentageComparetotalEarning,
    },
  };
};

const revenueBreakDown = async (
  userId: string,
  year: number,
  month: number,
) => {
  const clientIds = await Client.find({ userId }).distinct("_id");

  // Month is 1-based (1 = January)
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1); // first day of next month
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyAgg = await ClientVisit.aggregate([
    {
      $match: {
        clientId: { $in: clientIds },
        date: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$date" },
        service: { $sum: { $ifNull: ["$servicePrice", 0] } },
        tips: { $sum: { $ifNull: ["$tips", 0] } },
      },
    },
  ]);

  // Build a map of day -> data
  const dayMap: Record<number, { service: number; tips: number }> = {};
  for (const entry of dailyAgg) {
    dayMap[entry._id] = { service: entry.service, tips: entry.tips };
  }

  // Build response for every day in the month
  const result: Record<string, object> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `Day-${day}`;
    if (dayMap[day]) {
      result[key] = {
        service: dayMap[day].service,
        tips: dayMap[day].tips,
        total: dayMap[day].service + dayMap[day].tips,
      };
    } else {
      result[key] = {};
    }
  }

  return result;
};

export const analyticsService = {
  getAnalyticsData,
  revenueBreakDown,
};
