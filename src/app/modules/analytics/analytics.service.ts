import mongoose from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Client } from "../client/client.model";
import { ClientVisit } from "../clientVisit/clientVisit.model";

const getAnalyticsData = async (userId: string) => {
  // Get all client IDs belonging to this user
  const clientIds = await Client.find({ userId }).distinct("_id");

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // This week: last 7 days
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 6); // includes today = 7 days

  // Previous week: the 7 days before this week
  const startOfPrevWeek = new Date(startOfThisWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

  const matchClients = { clientId: { $in: clientIds } };

  const [todayAgg, thisWeekAgg, prevWeekAgg] = await Promise.all([
    // Today's earnings
    ClientVisit.aggregate([
      {
        $match: {
          ...matchClients,
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          service: { $sum: { $ifNull: ["$servicePrice", 0] } },
          tips: { $sum: { $ifNull: ["$tips", 0] } },
        },
      },
    ]),
    // This week's earnings (last 7 days)
    ClientVisit.aggregate([
      {
        $match: {
          ...matchClients,
          createdAt: { $gte: startOfThisWeek, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          service: { $sum: { $ifNull: ["$servicePrice", 0] } },
          tips: { $sum: { $ifNull: ["$tips", 0] } },
        },
      },
    ]),
    // Previous week's earnings (7 days before this week)
    ClientVisit.aggregate([
      {
        $match: {
          ...matchClients,
          createdAt: { $gte: startOfPrevWeek, $lt: startOfThisWeek },
        },
      },
      {
        $group: {
          _id: null,
          service: { $sum: { $ifNull: ["$servicePrice", 0] } },
          tips: { $sum: { $ifNull: ["$tips", 0] } },
        },
      },
    ]),
  ]);

  // Today
  const todayService = todayAgg[0]?.service ?? 0;
  const todayTips = todayAgg[0]?.tips ?? 0;
  const todayTotal = todayService + todayTips;

  // This week
  const thisWeekService = thisWeekAgg[0]?.service ?? 0;
  const thisWeekTips = thisWeekAgg[0]?.tips ?? 0;
  const thisWeekTotal = thisWeekService + thisWeekTips;

  // Previous week
  const prevWeekService = prevWeekAgg[0]?.service ?? 0;
  const prevWeekTips = prevWeekAgg[0]?.tips ?? 0;
  const prevWeekTotal = prevWeekService + prevWeekTips;

  // Growth percentage compared to previous week
  let growthPercentage = 0;
  if (prevWeekTotal > 0) {
    growthPercentage = Math.round(
      ((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100,
    );
  } else if (thisWeekTotal > 0) {
    growthPercentage = 100;
  }

  // Tips percentage compared to this week's total earning
  const tipsPercentageComparetotalEarning =
    thisWeekTotal > 0 ? Math.round((thisWeekTips / thisWeekTotal) * 100) : 0;

  return {
    todaysEarning: {
      total: todayTotal,
      service: todayService,
      tips: todayTips,
    },
    thisWeek: {
      totalEarning: thisWeekTotal,
      growthPercentage,
    },
    tips: {
      totalTips: thisWeekTips,
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
        createdAt: { $gte: startOfMonth, $lt: endOfMonth },
      },
    },
    {
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
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
