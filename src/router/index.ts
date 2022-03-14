import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import Upload from "@/views/Upload.vue";
import Settings from "@/views/Settings.vue";
import Login from "@/views/Login.vue";
import store from "@/store";
import Count from "@/views/count.vue";

const authGuard = (to: any, from: any, next: any) => {
  if (store.getters["user/isAuthenticated"]) {
    next();
  } else {
    next("/login");
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters["user/isAuthenticated"]) {
    next();
  } else {
    next("/");
  }
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
    props: true
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard,
  },
  {
    path: "/count/:sku",
    name: "Count",
    component: Count,
    beforeEnter: authGuard,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
