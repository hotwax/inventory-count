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
          <ion-item lines="none" class="ion-padding">
            <ion-label slot="start">
              CountName
              <p>CountId</p>
            </ion-label>
            <ion-button slot="end" fill="outline" color="medium">{{ translate("Rename") }}</ion-button>
          </ion-item>
        </div>
        <div class="filters">
          <ion-list class="ion-padding">
            <ion-item>
              <ion-icon slot="start" :icon="cloudUploadOutline"/>
              <ion-label>{{ translate("Import CSV") }}</ion-label>
              <input id="inputFile" class="ion-hide"/>
              <label for="inputFile" @click="openDraftImportCsvModal">{{ translate("Upload") }}</label>
            </ion-item> 
            <ion-item>
              <ion-icon slot="start" :icon="calendarNumberOutline" />
              <ion-label>{{ translate("Due date") }}</ion-label>  
              <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">Date</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
                    <ion-datetime    
                      id="schedule-datetime"        
                      show-default-buttons 
                      hour-cycle="h23"
                      value="3rd March 2024"
                    />
                  </ion-content>
                </ion-modal>     
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="businessOutline"/>
              <ion-label>{{ translate("Facility") }}</ion-label>  
              <ion-button fill="outline" @click="openDraftSearchFacilityModal">
                <ion-icon slot="start" :icon="addCircleOutline"/>
                {{ translate("Assign") }}
              </ion-button>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="list-item">
        <ion-item>
          <ion-icon slot="start" :icon="listOutline"/>
          <ion-input
            :label="translate('Add product')"
            label-placement="floating"
            :clear-input="true"
            value="WS-90-BL"
          >
          </ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg/>
          </ion-thumbnail>
          <ion-label>
            <p class="overline">{{ translate("Search result") }}</p>
            Internal Name
          </ion-label>
        </ion-item>
        <ion-button fill="clear" slot="end">
          <ion-icon slot="icon-only" :icon="addCircleOutline"/>
        </ion-button>
      </div>
      
      <hr/>

      <main>
        <div class="list-item">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              primary identifier
              <p>secondary identifier</p>
            </ion-label>
          </ion-item>          
          <ion-label>
            3
            <p>{{ translate("QoH") }}</p>
          </ion-label>
          <div class="tablet">
            <ion-chip outline>
              <ion-label>4th March 2024</ion-label>
            </ion-chip>
            <ion-label class="config-label">{{ translate("last counted") }}</ion-label>
          </div>
          <div class="tablet">
            <ion-chip outline>
              <ion-label>{{ translate("3 rejections in the last week") }}</ion-label>
            </ion-chip>
          </div>
          <ion-button fill="clear" slot="end">
            <ion-icon slot="icon-only" color="medium" :icon="closeCircleOutline"/>
          </ion-button>
        </div>
        <hr/>
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { translate } from "@/i18n";
import DraftImportCsvModal from "@/components/DraftImportCsvModal.vue"
import DraftSearchFacilityModal from "@/components/DraftSearchFacilityModal.vue"
import { cloudUploadOutline, calendarNumberOutline, businessOutline, addCircleOutline, listOutline, closeCircleOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonChip, IonContent, IonDatetime, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonThumbnail, IonTitle, IonToolbar, modalController} from "@ionic/vue";

export default defineComponent({
  name: 'DraftDetail',
  components: {
    IonBackButton,
    IonButton,
    IonChip,
    IonContent,
    IonDatetime,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonPage,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    DxpShopifyImg
  },
  
  data() {
    return {
      dateTimeModalOpen: false,
    }
  },
  
  methods: {
    async openDraftImportCsvModal() {
      const draftImportCsvModal = await modalController.create({
        component: DraftImportCsvModal,
      })
      draftImportCsvModal.present();
    },
    
    async openDraftSearchFacilityModal() {
      const draftSearchFacilityModal = await modalController.create({
        component: DraftSearchFacilityModal,
      })
      draftSearchFacilityModal.present();
    },

    openDateTimeModal() {
      this.dateTimeModalOpen = true;
    }
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
