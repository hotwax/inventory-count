import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import store from "@/store";
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import 'vue-router'
import { DxpLogin, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/user-utils';
import Draft from "@/views/Draft.vue";
import DraftDetail from "@/views/DraftDetail.vue"
import Assigned from "@/views/Assigned.vue"
import AssignedDetail from "@/views/AssignedDetail.vue"
import PendingReview from "@/views/PendingReview.vue";
import PendingReviewDetail from "@/views/PendingReviewDetail.vue"
import Closed from "@/views/Closed.vue"
import StorePermissions from "@/views/StorePermissions.vue"
import Settings from "@/views/Settings.vue";

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
    redirect: '/draft'
  },
  {
    path: '/draft',
    name: 'Draft',
    component: Draft,
    beforeEnter: authGuard,
  },
  {
    path: "/draft-detail",
    name: "DraftDetail",
    component: DraftDetail,
    beforeEnter: authGuard,
  },
  {
    path: '/assigned',
    name: 'Assigned',
    component: Assigned,
    beforeEnter: authGuard,
  },
  {
    path: '/assigned-detail',
    name: 'AssignedDetail',
    component: AssignedDetail,
    beforeEnter: authGuard,
  },
  {
    path: '/pending-review',
    name: 'PendingReview',
    component: PendingReview,
    beforeEnter: authGuard,
  },
  {
    path: '/pending-review-detail',
    name: 'PendingReviewDetail',
    component: PendingReviewDetail,
    beforeEnter: authGuard,
  },
  {
    path: '/closed',
    name: 'Closed',
    component: Closed,  
    beforeEnter: authGuard, 
  },
  {
    path: '/store-permissions',
    name: 'StorePermissions',
    component: StorePermissions,
    beforeEnter: authGuard,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    beforeEnter: authGuard,
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
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/draft";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router;
