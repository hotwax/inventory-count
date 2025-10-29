<template>
  <ion-menu content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="receiving-list">
        <ion-menu-toggle
          auto-hide="false"
          v-for="(page, index) in visibleMenuItems"
          :key="index"
        >
          <ion-item
            button
            router-direction="root"
            :router-link="page.path"
            :class="{ selected: selectedIndex === index }"
          >
            <ion-icon :icon="page.meta.icon" slot="start" />
            <ion-label>{{ translate(page.meta.title || page.name) }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonMenuToggle,
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters } from "vuex";
import { useRouter } from "vue-router";
import { translate } from "@/i18n";
import { hasPermission } from "@/authorization";

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonTitle,
    IonLabel,
    IonList,
    IonToolbar,
    IonMenu,
    IonMenuToggle,
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: "user/isUserAuthenticated",
    }),
  },
  setup() {
    const router = useRouter();

    const menuOrder = [
      "/bulkUpload",
      "/draft",
      "/assigned",
      "/pending-review",
      "/closed",
      "/store-permissions",
      "/settings",
    ];

    const visibleMenuItems = computed(() => {
      const allVisible = router
        .getRoutes()
        .filter(
          (r) =>
            r.meta?.showInMenu &&
            (!r.meta.permissionId || hasPermission(r.meta.permissionId))
        );

      return allVisible.sort((a, b) => {
        const aIndex = menuOrder.indexOf(a.path);
        const bIndex = menuOrder.indexOf(b.path);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    });

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path;
      return visibleMenuItems.value.findIndex((r) =>
        path.startsWith(r.path)
      );
    });

    return {
      visibleMenuItems,
      translate,
      selectedIndex,
    };
  },
});
</script>

<style scoped>
ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}
ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>
