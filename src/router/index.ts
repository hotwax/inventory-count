import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import { translate, commonUtil, useAuth, ShopifyLogin, ShopifyAppInstall, Login } from '@common'
import 'vue-router'
import Tabs from '@/views/Tabs.vue';
import Assigned from "@/views/Assigned.vue";
import AssignedDetail from "@/views/AssignedDetail.vue";
import Draft from "@/views/Draft.vue";
import DraftDetail from "@/views/DraftDetail.vue";
import PendingReview from '@/views/PendingReview.vue';
import PendingReviewDetail from '@/views/PendingReviewDetail.vue';
import Settings from "@/views/Settings.vue";
import SessionCountDetail from "@/views/SessionCountDetail.vue"
import BulkUpload from "@/views/BulkUpload.vue";
import CreateCycleCount from "@/views/CreateCycleCount.vue";
import Closed from "@/views/Closed.vue";
import StorePermissions from "@/views/StorePermissions.vue";
import ClosedDetail from "@/views/ClosedDetail.vue";
import ExportHistory from "@/views/ExportHistory.vue";
import { addCircleOutline, createOutline, documentTextOutline, storefrontOutline, mailUnreadOutline, receiptOutline, shieldCheckmarkOutline, settingsOutline } from "ionicons/icons";
import PreCountedItems from "@/views/PreCountedItems.vue";
import CountProgressReview from "@/views/CountProgressReview.vue";
import { useUserProfile } from "@/stores/userProfileStore";
import Actions from "@/authorization/actions";

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
    title?: string;
    iosIcon?: any;
    mdIcon?: any;
    showInMenu?: boolean;
  }
}

const authGuard = (to: any, from: any, next: any) => {
  if (!useAuth().isAuthenticated.value) {
    if (!commonUtil.isAppEmbedded()) next('/login')
    else next('/shopify-login')
  } else {
    next()
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: () => {
      // Approvers start on Draft, since that is where a count begins its life for them
      if (useUserProfile().hasPermission(Actions.APP_INV_COUNT_APPROVAL)) {
        return "/draft"
      }
      if (useUserProfile().hasPermission(Actions.APP_INV_COUNT_ADMIN)) {
        return "/assigned"
      }
      return "/tabs/count"
    },
  },
  {
    path: '/tabs',
    component: Tabs,
    children: [
      {
        path: '',
        redirect: '/tabs/count'
      },
      {
        path: 'count',
        component: () => import('@/views/Count.vue'),
        meta: {
          permissionId: Actions.APP_COUNT_VIEW
        }
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
      },
      {
        path: 'variance',
        component: () => import('@/views/Variance.vue'),
        meta: {
          permissionId: Actions.APP_VARIANCE_VIEW
        }
      },
      {
        path: 'create-cycle-count',
        component: () => import('@/views/CreateCycleCount.vue'),
        meta: {
          permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN OR INVCOUNT_APP_VIEW"
        }
      },
    ],
    beforeEnter: authGuard,
  },
  {
    path: '/draft',
    name: 'Draft',
    component: Draft,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_INV_COUNT_APPROVAL,
      showInMenu: true,
      title: "Draft",
      iosIcon: documentTextOutline,
      mdIcon: documentTextOutline,
    }
  },
  {
    path: '/draft/:workEffortId',
    name: 'DraftDetail',
    component: DraftDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_INV_COUNT_APPROVAL
    }
  },
  {
    path: '/assigned',
    name: 'Assigned',
    component: Assigned,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_ASSIGNED_VIEW,
      showInMenu: true,
      title: "Assigned",
      iosIcon: storefrontOutline,
      mdIcon: storefrontOutline,
    }
  },
  {
    path: '/closed',
    name: 'Closed',
    component: Closed,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_CLOSED_VIEW,
      showInMenu: true,
      title: "Closed",
      iosIcon: receiptOutline,
      mdIcon: receiptOutline,
    }
  },
  {
    path: '/assigned/:workEffortId',
    name: 'AssignedDetail',
    component: AssignedDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_ASSIGNED_VIEW
    }
  },
  {
    path: '/pending-review',
    name: 'PendingReview',
    component: PendingReview,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_PENDING_REVIEW_VIEW,
      showInMenu: true,
      title: "Pending review",
      iosIcon: mailUnreadOutline,
      mdIcon: mailUnreadOutline,
    }
  },
  {
    path: '/pending-review/:workEffortId',
    name: 'PendingReviewDetail',
    component: PendingReviewDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_PENDING_REVIEW_VIEW,
    }
  },
  {
    path: '/add-hand-counted/:workEffortId/:inventoryCountImportId/:inventoryCountTypeId',
    name: 'PreCountedItems',
    component: PreCountedItems,
    props: true,
    meta: {
      permissionId: Actions.APP_COUNT_VIEW
    }
  },
  {
    path: '/count-progress-review/:workEffortId',
    component: CountProgressReview,
    props: true,
    meta: {
      permissionId: Actions.APP_COUNT_VIEW
    }
  },
  {
    path: '/create-cycle-count',
    name: 'CreateCycleCount',
    component: CreateCycleCount,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
      showInMenu: true,
      title: "Create count",
      iosIcon: addCircleOutline,
      mdIcon: addCircleOutline
    }
  },
  {
    path: '/bulkUpload',
    name: 'Draft bulk',
    component: BulkUpload,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_DRAFT_VIEW,
      showInMenu: true,
      title: "Bulk Upload",
      iosIcon: createOutline,
      mdIcon: createOutline

    }
  },
  {
    path: '/closed/:workEffortId',
    name: 'ClosedDetail',
    component: ClosedDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_CLOSED_VIEW
    }
  },
  {
    path: '/export-history',
    name: 'ExportHistory',
    component: ExportHistory,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_EXPORT_HISTORY_VIEW
    }
  },
  {
    path: '/store-permissions',
    name: 'StorePermissions',
    component: StorePermissions,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_STORE_PERMISSIONS_VIEW,
      showInMenu: true,
      title: "Store permissions",
      iosIcon: shieldCheckmarkOutline,
      mdIcon: shieldCheckmarkOutline,
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    beforeEnter: authGuard,
    meta: {
      showInMenu: true,
      title: "Settings",
      iosIcon: settingsOutline,
      mdIcon: settingsOutline,
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/session-count-detail/:workEffortId/:inventoryCountTypeId/:inventoryCountImportId',
    name: 'SessionCountDetail',
    component: SessionCountDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/shopify-app-install',
    name: 'ShopifyAppInstall',
    component: ShopifyAppInstall
  },
  {
    path: '/shopify-login',
    name: 'ShopifyLogin',
    component: ShopifyLogin
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from) => {
  // Enforce the canonical version URL on every navigation (no-op until the version is resolved, or if
  // already canonical). Redirect cancels this navigation. Logic lives in useAuth so it's shared.
  if (useAuth().checkAppVersionRedirect()) return false;

  if (to.meta.permissionId && !useUserProfile().hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") {
      if (useUserProfile().hasPermission(Actions.APP_INV_COUNT_ADMIN))
        redirectToPath = "/settings";
      else
        redirectToPath = "/tabs/settings";
    } else {
      commonUtil.showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }

  // Adding check to clear the filters in the router beforeEach as we have found specific cases when clearing the filters on page itself
  // - If using unmounted hook to clear the filters on page, the ionViewDidEnter/WillEnter hook of `to` page runs before unmounted hook of `from` page, leading to fetch filtered records and then the filters are cleared
  // - If using ionViewWillLeave/DidLeave hook to clear the filters, the filters are also cleared when moving to and fro from the details page of the same parent page, but in this case we do not want to clear the filters
  //
  // Added check that if the `to` page has the same url pattern as the `from` page and vice-versa then do not clear the filters, used this approach as parent and child page paths are identical
  // if(!(to.path.includes(from.path) || from.path.includes(to.path))) {
  //   store.dispatch("count/clearQuery")
  // }
})


export default router;
