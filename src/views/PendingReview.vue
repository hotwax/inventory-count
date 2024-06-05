<template>
  <ion-page>  
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Pending review")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button>
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="list-item border">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Count name</h2>
              <p>count id</p>
            </ion-label>
          </ion-item>
          
          <ion-chip outline>
            <ion-label>facilityId</ion-label>
          </ion-chip>
         
          <ion-label overline>
            <h2>10/20</h2>
            <p>{{ translate("counter") }}</p>
          </ion-label>

          <ion-label overline>
            <h2>4th March 2024</h2>
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item class="ion-padding" lines="none">
            <ion-badge outline slot="end">{{ translate("Submitted") }}</ion-badge>
          </ion-item>
        </div>

        <div class="list-item border">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Count name</h2>
              <p>count id</p>
            </ion-label>
          </ion-item>
        
          <ion-chip outline>
            <ion-label>facilityId</ion-label>
          </ion-chip>

          <ion-label overline>
            <h2>10/20</h2>
            <p>{{ translate("counter") }}</p>
          </ion-label>

          <ion-label overline>
            <h2>4th March 2024</h2>
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item class="ion-padding" lines="none">
            <ion-badge outline slot="end" color="danger">{{ translate("Re-submitted") }}</ion-badge>
          </ion-item>
        </div>  
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { translate } from "@hotwax/dxp-components";
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { IonBadge, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/vue";

export default defineComponent({
  name: 'PendingReview',
  components: {
    IonBadge, 
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
  },

  setup() {
    return {
      translate,
      filterOutline,
      storefrontOutline
    }
  }
})
</script>

<style scoped>
.border {
  border-bottom: var(--border-medium);
}

.list-item {
  --columns-desktop: 6;
}

.list-item > ion-item {
  width: 100%;
}
</style>
