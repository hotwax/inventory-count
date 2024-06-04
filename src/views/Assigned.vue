<template>
  <ion-page>  
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/drafts" />
        <ion-title>{{ translate("Assinged")}}</ion-title>
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
              <h2>primary identifier</h2>
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-chip outline>
            <ion-label>facilityId</ion-label>
          </ion-chip>
         
          <ion-label overline>
            <h2>10/20</h2>
            <p>counter</p>
          </ion-label>

          <ion-label overline>
            <h2>4th March 2024</h2>
            <p>due date</p>
          </ion-label>
          
          <ion-item class="ion-padding" lines="none">
            <ion-badge outline slot="end">Assigned</ion-badge>
          </ion-item>
        </div>

        <div class="list-item border">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>primary identifier</h2>
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
        
          <ion-chip outline>
            <ion-label>facilityId</ion-label>
          </ion-chip>

          <ion-label overline>
            <h2>10/20</h2>
            <p>counter</p>
          </ion-label>

          <ion-label overline>
            <h2>4th March 2024</h2>
            <p>due date</p>
          </ion-label>
          
          <ion-item class="ion-padding" lines="none">
            <ion-badge outline slot="end" color="danger">Recount requested</ion-badge>
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
import { IonBackButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonPage, IonTitle, IonToolbar} from "@ionic/vue";

export default defineComponent({
  name: 'Assigned',
  components: {
    IonBackButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
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
