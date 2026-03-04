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

const PAID_PLAN_DURATION_MS: Record<PremiumPlan, number> = {
  [PremiumPlan.TRIAL]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.TRIAL_EXPIRED]: 0,
  [PremiumPlan.BASIC_MONTHLY]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.BASIC_ANNUAL]: 365 * 24 * 60 * 60 * 1000,
  [PremiumPlan.PREMIUM_MONTHLY]: 30 * 24 * 60 * 60 * 1000,
  [PremiumPlan.PREMIUM_ANNUAL]: 365 * 24 * 60 * 60 * 1000,
  [PremiumPlan.EXPIRED]: 0,
};

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

const getMonthlyPremiumUsersGrowth = async (year: number) => {
  const yearStartDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const nextYearStartDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  const growthData = await User.aggregate<MonthlyGrowthAggregateResult>([
    {
      $match: {
        isDeleted: false,
        premiumPlanHistory: { $exists: true, $ne: [] },
      },
    },
    {
      $unwind: "$premiumPlanHistory",
    },
    {
      $match: {
        "premiumPlanHistory.plan": {
          $in: PAID_PREMIUM_PLANS,
        },
        "premiumPlanHistory.purchasedAt": {
          $gte: yearStartDate,
          $lt: nextYearStartDate,
        },
      },
    },
    {
      $group: {
        _id: { $month: "$premiumPlanHistory.purchasedAt" },
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

  const legacyPremiumUsers = await User.find({
    isDeleted: false,
    premiumPlan: { $in: PAID_PREMIUM_PLANS },
    premiumPlanExpiry: { $ne: null },
    $or: [
      { premiumPlanHistory: { $exists: false } },
      { premiumPlanHistory: { $size: 0 } },
    ],
  })
    .select("premiumPlan premiumPlanExpiry")
    .lean();

  legacyPremiumUsers.forEach((user) => {
    if (!user.premiumPlan || !user.premiumPlanExpiry) {
      return;
    }

    const duration = PAID_PLAN_DURATION_MS[user.premiumPlan];
    if (!duration) {
      return;
    }

    const purchasedAt = new Date(
      new Date(user.premiumPlanExpiry).getTime() - duration,
    );

    if (purchasedAt >= yearStartDate && purchasedAt < nextYearStartDate) {
      const monthIndex = purchasedAt.getUTCMonth() + 1;
      growthCountByMonth.set(
        monthIndex,
        (growthCountByMonth.get(monthIndex) ?? 0) + 1,
      );
    }
  });

  return MONTH_SHORT_NAMES.map((monthName, index) => ({
    month: `${monthName} ${year}`,
    count: growthCountByMonth.get(index + 1) ?? 0,
  }));
};

const getAllUsers = async (status?: string) => {
  type UserStatus = "Active" | "Inactive";

  let matchFilter: Record<string, unknown> = { isDeleted: false };

  if (status === "active") {
    matchFilter.premiumPlan = { $in: ACTIVE_PREMIUM_PLANS };
  } else if (status === "inactive") {
    matchFilter.$or = [
      { premiumPlan: { $in: INACTIVE_PREMIUM_PLANS } },
      { premiumPlan: null },
      { premiumPlan: { $exists: false } },
    ];
  }

  const users = await User.aggregate<RecentUserResult>([
    { $match: matchFilter },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 0,
        fullName: 1,
        email: 1,
        mobileNumber: 1,
        profilePicture: 1,
        createdAt: 1,
        premiumPlan: 1,
      },
    },
  ]);

  return users.map((user) => ({
    fullName: user.fullName,
    email: user.email,
    mobileNumber: user.mobileNumber,
    profilePicture: user.profilePicture,
    Joined: formatJoinedDate(user.createdAt),
    status: getUserActivityStatus(user.premiumPlan) as UserStatus,
  }));
};

type PremiumUserResult = {
  fullName: string;
  profilePicture?: string;
  email: string;
  mobileNumber: string;
  premiumPlan: PremiumPlan | null;
  premiumPlanExpiry?: Date | null;
};

const MONTHLY_PLANS = new Set<PremiumPlan>([
  PremiumPlan.BASIC_MONTHLY,
  PremiumPlan.PREMIUM_MONTHLY,
]);

const getPlanLabel = (plan: PremiumPlan): "Monthly" | "Yearly" => {
  return MONTHLY_PLANS.has(plan) ? "Monthly" : "Yearly";
};

const getPremiumUsers = async () => {
  const users = await User.aggregate<PremiumUserResult>([
    {
      $match: {
        isDeleted: false,
        premiumPlan: { $in: PAID_PREMIUM_PLANS },
      },
    },
    { $sort: { premiumPlanExpiry: -1 } },
    {
      $project: {
        _id: 0,
        fullName: 1,
        email: 1,
        mobileNumber: 1,
        profilePicture: 1,
        premiumPlan: 1,
        premiumPlanExpiry: 1,
      },
    },
  ]);

  return users.map((user) => {
    let billingDate: string | null = null;

    if (user.premiumPlan && user.premiumPlanExpiry) {
      const duration = PAID_PLAN_DURATION_MS[user.premiumPlan];
      if (duration) {
        const purchasedAt = new Date(
          new Date(user.premiumPlanExpiry).getTime() - duration,
        );
        billingDate = formatJoinedDate(purchasedAt);
      }
    }

    return {
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      profilePicture: user.profilePicture,
      billingDate,
      plan: user.premiumPlan ? getPlanLabel(user.premiumPlan) : null,
    };
  });
};

export const adminService = {
  getContentTypeName,
  createOrUpdateContent,
  getContentByType,
  dashboardOverviewData,
  getMonthlyUserGrowth,
  getMonthlyPremiumUsersGrowth,
  getAllUsers,
  getPremiumUsers,
};
