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
        <ion-list>
          <div class="list-item">
            <ion-item lines="none">
              <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
              <ion-label>
                Count name
                <p>count id</p>
              </ion-label>
            </ion-item>
            
            <ion-chip outline>
              <ion-label>facilityId</ion-label>
            </ion-chip>
           
            <ion-label>
              10/20
              <p>{{ translate("counter") }}</p>
            </ion-label>
  
            <ion-label>
              4th March 2024
              <p>{{ translate("due date") }}</p>
            </ion-label>
            
            <ion-item lines="none">
              <ion-badge slot="end">{{ translate("Submitted") }}</ion-badge>
            </ion-item>
          </div>
        </ion-list>
              
        <ion-list>
          <div class="list-item">
            <ion-item lines="none">
              <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
              <ion-label>
                Count name
                <p>count id</p>
              </ion-label>
            </ion-item>
          
            <ion-chip outline>
              <ion-label>facilityId</ion-label>
            </ion-chip>
  
            <ion-label>
              10/20
              <p>{{ translate("counter") }}</p>
            </ion-label>
  
            <ion-label>
              4th March 2024
              <p>{{ translate("due date") }}</p>
            </ion-label>
            
            <ion-item lines="none">
              <ion-badge outline slot="end" color="danger">{{ translate("Re-submitted") }}</ion-badge>
            </ion-item>
          </div>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { translate } from '@/i18n'
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { IonButtons, IonBadge, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/vue";

export default defineComponent({
  name: 'PendingReview',
  components: {
    IonButtons, 
    IonBadge,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
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
.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>
