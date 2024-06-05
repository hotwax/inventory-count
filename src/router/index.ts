import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import store from "@/store";
import Count from "@/views/count.vue";
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import TabBar from "@/components/TabBar.vue";
import 'vue-router'
import { DxpLogin, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/user-utils';
import Drafts from "@/views/Drafts.vue";
import DraftCount from "@/views/DraftCount.vue"
import Assigned from "@/views/Assigned.vue"
import AssignedCount from "@/views/AssignedCount.vue"
import PendingReview from "@/views/PendingReview.vue";
import ReviewCount from "@/views/ReviewCount.vue"
import Closed from "@/views/Closed.vue"
import StorePermissions from "@/views/StorePermissions.vue"

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/drafts'
  },
  {
    path: '/drafts',
    name: 'Drafts',
    component: Drafts,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: "/draft-count",
    name: "DraftCount",
    component: DraftCount,
    // beforeEnter: authGuard,
    // props: true,
    // meta: {
    //   permissionId: "APP_COUNT_VIEW"
    // }
  },
  {
    path: '/assigned',
    name: 'Assigned',
    component: Assigned,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/assigned-count',
    name: 'AssignedCount',
    component: AssignedCount,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/pending-review',
    name: 'PendingReview',
    component: PendingReview,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/review-count',
    name: 'ReviewCount',
    component: ReviewCount,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/closed',
    name: 'Closed',
    component: Closed,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/store-permissions',
    name: 'StorePermissions',
    component: StorePermissions,
    // beforeEnter: authGuard,
    // meta: {
    //   permissionId: "APP_SHIPMENTS_VIEW"
    // }
  },
  {
    path: '/tabs',
    component: TabBar,
    children: [
      {
        path: '',
        redirect: '/search'
      },
      {
        path: 'search',
        component: () => import('@/views/Search.vue'),
        meta: {
          permissionId: "APP_SEARCH_VIEW"
        }
      },
      {
        path: 'upload',
        component: () => import('@/views/Upload.vue'),
        meta: {
          permissionId: "APP_UPLOAD_VIEW"
        }
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
      },
    ],
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: "/count/:sku",
    name: "Count",
    component: Count,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "APP_COUNT_VIEW"
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: DxpLogin,
    beforeEnter: loginGuard
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/tabs/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router;
