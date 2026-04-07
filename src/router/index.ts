import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import { translate, commonUtil } from '@common'
import 'vue-router'
import Tabs from '@/views/Tabs.vue';
import Assigned from "@/views/Assigned.vue";
import AssignedDetail from "@/views/AssignedDetail.vue";
import PendingReview from '@/views/PendingReview.vue';
import PendingReviewDetail from '@/views/PendingReviewDetail.vue';
import Settings from "@/views/Settings.vue";
import SessionCountDetail from "@/views/SessionCountDetail.vue"
import BulkUpload from "@/views/BulkUpload.vue";
import Closed from "@/views/Closed.vue";
import StorePermissions from "@/views/StorePermissions.vue";
import ClosedDetail from "@/views/ClosedDetail.vue";
import ExportHistory from "@/views/ExportHistory.vue";
import { createOutline, storefrontOutline, mailUnreadOutline, receiptOutline, shieldCheckmarkOutline, settingsOutline } from "ionicons/icons";
import PreCountedItems from "@/views/PreCountedItems.vue";
import { useAuth } from "@/composables/useAuth";
import Login from "@/views/Login.vue";
import { useUserProfile } from "@/stores/userProfileStore";
import CountProgressReview from "@/views/CountProgressReview.vue";

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
    next('/login')
  } else {
    next()
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (useAuth().isAuthenticated.value) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: () => {
      if (useUserProfile().hasPermission("COMMON_ADMIN OR INV_COUNT_ADMIN")) {
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
          permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN OR INVCOUNT_APP_VIEW"
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
          permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN OR INV_COUNT_VAR_LOG"
        }
      }
    ],
    beforeEnter: authGuard,
  },
  {
    path: '/assigned',
    name: 'Assigned',
    component: Assigned,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
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
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
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
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN"
    }
  },
  {
    path: '/pending-review',
    name: 'PendingReview',
    component: PendingReview,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
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
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
    }
  },
  {
    path: '/add-hand-counted/:workEffortId/:inventoryCountImportId/:inventoryCountTypeId',
    name: 'PreCountedItems',
    component: PreCountedItems,
    props: true,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN OR INVCOUNT_APP_VIEW"
    }
  },
  {
    path: '/count-progress-review/:workEffortId',
    component: CountProgressReview,
    props: true,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN OR INVCOUNT_APP_VIEW"
    }
  },
  {
    path: '/bulkUpload',
    name: 'Draft bulk',
    component: BulkUpload,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
      showInMenu: true,
      title: "Bulk Upload",
      iosIcon: createOutline,
      mdIcon: createOutline

    }
  },
  {
    path: '/store-permissions',
    name: 'StorePermissions',
    component: StorePermissions,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
      showInMenu: true
    }
  },
  {
    path: '/pending-review',
    name: 'PendingReview',
    component: PendingReview,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
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
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN"
    }
  },
  {
    path: '/closed',
    name: 'Closed',
    component: Closed,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
      showInMenu: true,
      title: "Closed",
      iosIcon: receiptOutline,
      mdIcon: receiptOutline,
    }
  },
  {
    path: '/closed/:workEffortId',
    name: 'ClosedDetail',
    component: ClosedDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN"
    }
  },
  {
    path: '/export-history',
    name: 'ExportHistory',
    component: ExportHistory,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN"
    }
  },
  {
    path: '/store-permissions',
    name: 'StorePermissions',
    component: StorePermissions,
    beforeEnter: authGuard,
    meta: {
      permissionId: "COMMON_ADMIN OR INV_COUNT_ADMIN",
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
    beforeEnter: loginGuard
  },
  {
    path: '/session-count-detail/:workEffortId/:inventoryCountTypeId/:inventoryCountImportId',
    name: 'SessionCountDetail',
    component: SessionCountDetail,
    beforeEnter: authGuard,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
});

router.beforeEach((to, from) => {
  if (to.meta.permissionId && !useUserProfile().hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") {
      if (useUserProfile().hasPermission("COMMON_ADMIN OR INV_COUNT_ADMIN"))
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
