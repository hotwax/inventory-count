type InventoryCountPermission = {
  permissionId: string;
  title: string;
  description: string;
  category: string;
  impliedBy: string[];
  usedIn: {
    file: string;
    context: string;
  }[];
};

type InventoryCountPermissionCatalog = {
  appId: string;
  appName: string;
  appDescription: string;
  appAccessPermissionIds: string[];
  adminPermissionIds: string[];
  permissions: InventoryCountPermission[];
};

export const inventoryCountPermissionCatalog: InventoryCountPermissionCatalog = {
  appId: "inventory-count",
  appName: "Inventory Count",
  appDescription: "Controls cycle count store workflows and inventory variance review.",
  appAccessPermissionIds: ["INVCOUNT_APP_VIEW"],
  adminPermissionIds: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
  permissions: [
    {
      permissionId: "INVCOUNT_APP_VIEW",
      title: "Access inventory counts",
      description:
        "Select security groups that can access the inventory count app store view and create counts in sessions. This does not allow them to impact inventory.",
      category: "Store operations",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/router/index.ts", context: "Store count tab access" }],
    },
    {
      permissionId: "INV_CNT_VIEW_QOH",
      title: "View quantity on hand",
      description:
        "Select security groups that can view the current quantity on hand for products during counting.",
      category: "Counting",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/views/CountProgressReview.vue", context: "Show QOH during count review" }],
    },
    {
      permissionId: "PREVIEW_COUNT_ITEM",
      title: "Preview count",
      description:
        "Select security groups that can preview products in a directed count before the start time.",
      category: "Counting",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/views/CountProgressReview.vue", context: "Preview count items before start" }],
    },
    {
      permissionId: "INV_COUNT_PRE_START",
      title: "Start count early",
      description:
        "Select security groups that can start a cycle count at a store before the designated start time.",
      category: "Counting",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/views/Count.vue", context: "Start count before planned start time" }],
    },
    {
      permissionId: "INV_COUNT_SUBMIT",
      title: "Submit cycle count for review",
      description:
        "Select security groups that can approve sessions and then submit proposed count variances for review. This will now allow them to apply variances to their inventory.",
      category: "Review",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/views/CountProgressReview.vue", context: "Submit cycle count for review" }],
    },
    {
      permissionId: "INV_COUNT_LOCK_RLS",
      title: "Force release session",
      description:
        "Select security groups that can forcefully release sessions that are not their own. The force released device will be booted from their session within 30 seconds.",
      category: "Session control",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/views/Count.vue", context: "Force release locked count session" }],
    },
    {
      permissionId: "INV_COUNT_VAR_LOG",
      title: "Log inventory variance",
      description:
        "Select security groups that can log inventory variances for products at a store. This allows users to manually adjust inventory levels by adding or removing stock with specific reason codes.",
      category: "Inventory adjustments",
      impliedBy: ["COMMON_ADMIN", "INV_COUNT_ADMIN"],
      usedIn: [{ file: "src/router/index.ts", context: "Variance tab access" }],
    },
    {
      permissionId: "INV_COUNT_ADMIN",
      title: "Inventory count admin",
      description:
        "Select security groups that can perform all cycle count functions without any restrictions including start counts early, submit cycle counts for review and accept and reject variances. This permission is required to access the cycle count admin pages.",
      category: "Administration",
      impliedBy: ["COMMON_ADMIN"],
      usedIn: [{ file: "src/router/index.ts", context: "Admin pages and store permissions access" }],
    },
  ],
};
