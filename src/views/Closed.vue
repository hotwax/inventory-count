<template>
  <ion-page>  
    <ClosedFilter menu-id="closed-filter" content-id="closed-filter"/>
    <ion-header :translucent="true" >
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="closed-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="closed-filter">
      <main>
        <div class="header">
          <div class="search">
            <ion-item>
              <ion-icon slot="start" :icon="listOutline"/>
              <ion-label>{{ translate("Counts closed") }}</ion-label>
              <ion-label slot="end">14</ion-label>
            </ion-item>  
          </div>
          <div class="filters">
            <ion-item>
              <ion-icon slot="start" :icon="thermometerOutline"/>
              <ion-label>{{ translate("Average variance") }}</ion-label>
              <ion-label slot="end">50%</ion-label>
            </ion-item>  
          </div>
        </div>

        <div class="list-item">
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
            <h2>3</h2>
            <p>{{ translate("rejected counts") }}</p>
          </ion-label>


          <ion-label overline>
            <h2>14</h2>
            <p>{{ translate("total variance") }}</p>
          </ion-label>

          <ion-label overline class="ion-padding">
            <h2>4th March 2024</h2>
            <p>{{ translate("closed") }}</p>
          </ion-label>
        </div>
        
        <hr/>

        <div class="list-item">
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
            <h2>3</h2>
            <p>{{ translate("rejected counts") }}</p>
          </ion-label>


          <ion-label overline>
            <h2>14</h2>
            <p>{{ translate("total variance") }}</p>
          </ion-label>

          <ion-label overline class="ion-padding">
            <h2>4th March 2024</h2>
            <p>{{ translate("closed") }}</p>
          </ion-label> 
        </div> 
        <hr/> 
      </main>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openClosedCountModal">
          <ion-icon :icon="cloudDownloadOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { translate } from '@/i18n'
import ClosedFilter from "@/components/ClosedFilter.vue"
import ClosedCountModal from '@/components/ClosedCountModal.vue';
import { filterOutline, storefrontOutline, listOutline, thermometerOutline, cloudDownloadOutline } from "ionicons/icons";
import { IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonMenuButton, IonPage, IonTitle, IonToolbar, modalController } from "@ionic/vue";

export default defineComponent({
  name: 'Closed',
  components: {
    IonButtons,
    IonChip,
    IonContent,
    IonFab, 
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    ClosedFilter
  },
  methods: {

    async openClosedCountModal() {
      const closedCountModal = await modalController.create({
        component: ClosedCountModal,
      })
      closedCountModal.present();
    }  
  },

  setup() {
    return {
      translate,
      filterOutline,
      storefrontOutline,
      listOutline, 
      thermometerOutline,
      cloudDownloadOutline
    }
  }
})
</script>

<style scoped>
.list-item {
  --columns-desktop: 6;
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.search {
  grid-column: 1 / 2;
}

.filters {
  grid-column: 2 / 3;
}

</style>
