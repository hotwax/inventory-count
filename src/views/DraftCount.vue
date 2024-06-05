<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/drafts" />
        <ion-title>{{ translate("Draft count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <div class="search">
          <ion-item lines="none">
            <ion-label>
              <h1>CountName</h1> 
              <p>CountId</p>
            </ion-label>
            <ion-button slot="end" fill="outline" color="medium">Rename</ion-button>
          </ion-item>
        </div>
        <div class="filters">
          <ion-list>
            <ion-item>
              <ion-icon slot="start" :icon="cloudUploadOutline"/>
              <ion-label>{{ translate("Import CSV") }}</ion-label>
              <input id="inputFile" class="ion-hide"/>
              <label for="inputFile">Upload</label>
            </ion-item> 
            <ion-item>
              <ion-icon slot="start" :icon="calendarNumberOutline"/>
              <ion-label>{{ translate("Due date") }}</ion-label>  
              <ion-button class="date-time-button" slot="end" fill="solid" color="light">
                3rd March 2024
              </ion-button> 
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="businessOutline"/>
              <ion-label>{{ translate("Facility") }}</ion-label>  
              <ion-button fill="outline">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                Assign
              </ion-button>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="header border">
        <div class="search">
          <ion-item>
            <ion-icon slot="start" :icon="listOutline"></ion-icon>
            <ion-input
              label="Add product"
              label-placement="stacked"
              :clear-input="true"
              placeholder="Enter product"
              value="">
            </ion-input>
          </ion-item>
        </div>
        <div class="filters">
          <ion-item lines="none">
              <ion-thumbnail slot="start">
                <DxpShopifyImg size="small" />
              </ion-thumbnail>
              <ion-label overline>
                <p>SEARCH RESULT</p>
                Internal Name
              </ion-label>
              <ion-button fill="clear" slot="end">
                <ion-icon slot="icon-only" :icon="addCircleOutline"></ion-icon>
              </ion-button>
          </ion-item>
        </div>
      </div>

      <main>
        <div class="list-item border">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg size="small" />
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>
          
          <ion-label>
            3
            <p>QoH</p>
          </ion-label>

          <div class="tablet">
            <ion-chip outline>
              <ion-label>4th March 2024</ion-label>
            </ion-chip>
            <ion-label class="config-label">last counted</ion-label>
          </div>

          <div class="tablet">
            <ion-chip outline>
              <ion-label>3 rejections in the last week</ion-label>
            </ion-chip>
          </div>

          <div class="tablet">
            <ion-button fill="clear" slot="end">
              <ion-icon slot="icon-only" color="medium" :icon="closeCircleOutline"></ion-icon>
            </ion-button>
          </div> 
        </div>
        
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { translate } from '@/i18n'
import { cloudUploadOutline, calendarNumberOutline, businessOutline, addCircleOutline, listOutline, closeCircleOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonThumbnail, IonTitle, IonToolbar} from "@ionic/vue";
 export default defineComponent({
   name: 'DraftCount',
   components: {
    IonBackButton,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    DxpShopifyImg
   },
   setup() {

    return {
      translate,
      cloudUploadOutline,
      calendarNumberOutline,
      businessOutline,
      addCircleOutline,
      closeCircleOutline,
      listOutline
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

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
}

.config-label {
  display: block;
  text-align: center;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
