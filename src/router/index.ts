import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import Upload from "@/views/Upload.vue";
import Settings from "@/views/Settings.vue";
import store from "@/store";
import Search from "@/views/Search.vue";
import Count from "@/views/count.vue";
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@/i18n'

import 'vue-router'
import { Login, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/user-utils';

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
  if (authStore.isAuthenticated) {
    // if route has token and oms do the login flow processing
    if (to.query?.token && to.query?.oms) next()
    else next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/search",
  },
  {
    path: "/upload",
    name: "upload",
    component: Upload,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_UPLOAD_VIEW"
    }
  },
  {
  
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
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
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: '/search',
    name: 'Search',
    component: Search,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_SEARCH_VIEW"
    }
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
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router;
