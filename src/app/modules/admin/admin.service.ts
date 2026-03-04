import { ContentType, AppContent } from "./appContent.model";
import { PremiumPlan, User } from "../../models";

const PAID_PREMIUM_PLANS: PremiumPlan[] = [
  PremiumPlan.BASIC_MONTHLY,
  PremiumPlan.BASIC_ANNUAL,
  PremiumPlan.PREMIUM_MONTHLY,
  PremiumPlan.PREMIUM_ANNUAL,
];

const ACTIVE_PREMIUM_PLANS: PremiumPlan[] = [
  PremiumPlan.TRIAL,
  ...PAID_PREMIUM_PLANS,
];

const INACTIVE_PREMIUM_PLANS: PremiumPlan[] = [
  PremiumPlan.TRIAL_EXPIRED,
  PremiumPlan.EXPIRED,
];

const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ACTIVE_PLAN_SET = new Set<PremiumPlan>(ACTIVE_PREMIUM_PLANS);

const formatJoinedDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const getUserActivityStatus = (
  premiumPlan: PremiumPlan | null | undefined,
): "Active" | "Inactive" => {
  if (!premiumPlan) {
    return "Inactive";
  }

  return ACTIVE_PLAN_SET.has(premiumPlan) ? "Active" : "Inactive";
};

const getContentTypeName = (type: ContentType): string => {
  const typeNames: Record<ContentType, string> = {
    [ContentType.ABOUT_US]: "About Us",
    [ContentType.PRIVACY_POLICY]: "Privacy Policy",
    [ContentType.TERMS_AND_CONDITIONS]: "Terms and Conditions",
  };
  return typeNames[type] || type;
};

const createOrUpdateContent = async (type: ContentType, content: string) => {
  const result = await AppContent.findOneAndUpdate(
    { type },
    { content },
    { new: true, upsert: true, runValidators: true },
  );
  return result;
};

const getContentByType = async (type: ContentType) => {
  const result = await AppContent.findOne({ type });
  if (!result) {
    return {
      _id: null,
      type,
      content: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return result;
};

type CountResult = { count: number };

type RecentUserResult = {
  fullName: string;
  profilePicture?: string;
  email: string;
  mobileNumber: string;
  location?: string;
  createdAt: Date;
  premiumPlan: PremiumPlan | null;
};

const dashboardOverviewData = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [overview] = await User.aggregate<{
    totalUsers: CountResult[];
    activeUsers: CountResult[];
    inactiveUsers: CountResult[];
    subscribedUsers: CountResult[];
    recentUsers: RecentUserResult[];
  }>([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalUsers: [{ $count: "count" }],
        activeUsers: [
          {
            $match: {
              premiumPlan: {
                $in: ACTIVE_PREMIUM_PLANS,
              },
            },
          },
          { $count: "count" },
        ],
        inactiveUsers: [
          {
            $match: {
              $or: [
                {
                  premiumPlan: {
                    $in: INACTIVE_PREMIUM_PLANS,
                  },
                },
                { premiumPlan: null },
                {
                  premiumPlan: {
                    $exists: false,
                  },
                },
              ],
            },
          },
          { $count: "count" },
        ],
        subscribedUsers: [
          {
            $match: {
              premiumPlan: {
                $in: PAID_PREMIUM_PLANS,
              },
            },
          },
          { $count: "count" },
        ],
        recentUsers: [
          {
            $match: {
              createdAt: { $gte: sevenDaysAgo },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $project: {
              _id: 0,
              fullName: 1,
              profilePicture: 1,
              email: 1,
              mobileNumber: 1,
              location: 1,
              createdAt: 1,
              premiumPlan: 1,
            },
          },
        ],
      },
    },
  ]);

  const getCount = (items?: CountResult[]): number => {
    return items?.[0]?.count ?? 0;
  };

  return {
    totalUsers: getCount(overview?.totalUsers),
    activeUsers: getCount(overview?.activeUsers),
    inactiveUsers: getCount(overview?.inactiveUsers),
    subscribedUsers: getCount(overview?.subscribedUsers),
    recentUsers: (overview?.recentUsers ?? []).map((user) => ({
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      location: user.location,
      profilePicture: user.profilePicture,
      Joined: formatJoinedDate(user.createdAt),
      status: getUserActivityStatus(user.premiumPlan),
    })),
  };
};
type MonthlyGrowthAggregateResult = {
  _id: number;
  count: number;
};

const getMonthlyUserGrowth = async (year: number) => {
  const yearStartDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const nextYearStartDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  const growthData = await User.aggregate<MonthlyGrowthAggregateResult>([
    {
      $match: {
        isDeleted: false,
        createdAt: {
          $gte: yearStartDate,
          $lt: nextYearStartDate,
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  const growthCountByMonth = new Map<number, number>(
    growthData.map((item) => [item._id, item.count]),
  );

  return MONTH_SHORT_NAMES.map((monthName, index) => ({
    month: `${monthName} ${year}`,
    count: growthCountByMonth.get(index + 1) ?? 0,
  }));
};

export const adminService = {
  getContentTypeName,
  createOrUpdateContent,
  getContentByType,
  dashboardOverviewData,
  getMonthlyUserGrowth,
};
