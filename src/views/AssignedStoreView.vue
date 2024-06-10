<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/tabs/cycle-count" slot="start"></ion-back-button>
        <ion-title>{{ translate("Count name") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="find">
        <aside class="filters menu">
          <ion-item lines="none">
            <ion-input slot="start" :label="translate('SKU')" :placeholder="translate('Scan or search products')"/>  
          </ion-item>
          <ion-segment v-model="selectedSegment">
            <ion-segment-button value="all">
              <ion-label>{{ translate("ALL") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="pending">
              <ion-label>{{ translate("PENDING") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="counted">
              <ion-label>{{ translate("COUNTED") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-list>
            <ion-item>
              <ion-thumbnail slot="start">
                <DxpShopifyImg/>
              </ion-thumbnail>  
              <ion-label class="ion-text-wrap">
                <h2>Primary Identifier</h2>
                <p>Secondary Identifier</p>
              </ion-label>
              <ion-label slot="end">{{ translate("Pending") }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-thumbnail slot="start">
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>Primary Identifier</h2>
                <p>Secondary Identifier</p>
              </ion-label>
              <ion-label slot="end">{{ translate("Pending") }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-thumbnail slot="start">
                <DxpShopifyImg/>
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>Primary Identifier</h2>
                <p>Secondary Identifier</p>
              </ion-label>
              <ion-badge slot="end">30 units</ion-badge>
            </ion-item>
          </ion-list>
        </aside>

        <main>
          
          <section class="product-image">
            <DxpShopifyImg />
          </section>
  
          <section class="product-info">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>Product name</h1>
                <p>internal name</p>
              </ion-label>
            </ion-item>
            <ion-list>
              <ion-item>
                {{ translate("Counted") }}
                <ion-label slot="end">10</ion-label>
              </ion-item>
              <ion-item>
                {{ translate("Current on hand") }}
                <ion-label slot="end">15</ion-label>
              </ion-item>
              <ion-item>
                {{ translate("Variance") }}
                <ion-label slot="end">-15</ion-label>
              </ion-item>
            </ion-list>
            <ion-button fill="outline" expand="block" class="re-count" @click="openRecountAlert()">
              {{ translate("Re-count") }}
            </ion-button>
          </section>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import {
  alertController,
  IonBackButton,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonBadge
} from '@ionic/vue';
import { idCardOutline } from 'ionicons/icons';
import { translate } from '@/i18n'
import { defineComponent } from "vue";

export default defineComponent({
  name: "AssignedStoreView",
  components: {
    IonBackButton,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    IonBadge
  },
  data() {
    return {
      selectedSegment: 'all'
    }
  },

  methods: {
    async openRecountAlert() {
      const alert = await alertController.create({
        header: translate("Upload count"),
        message: translate("Updating a count will replace the existing count. The previous count cannot be restored after being replaced."),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel',
        },
        {
          text: translate('Re-count'),
          handler: () => {
            this.upload()
          }
        }]
      });
      await alert.present();
    },
  },

  setup() {
    return {
      idCardOutline,
      translate,
    };
  }
});
</script>

<style scoped>
.find {
  display: grid;
  height: 100%;
  grid-template-areas: "search"
                       "main";
}

.find >.filters {
  display: none;
}

.find > main {
  grid-area: main;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
}

.product-image {
  text-align: center;
}

.product-image > img {
  width: 200px;
}

ion-content > main {
  display: grid;
  grid-template-columns: repeat(2, minmax(375px, 25%)) 1fr;
  height: 100%;
}

.menu {
  border-right: 1px solid var(--ion-color-medium);
}

.re-count {
  margin: var(--spacer-base) var(--spacer-sm);
}


@media (min-width: 720px) {
  main {
    padding: var(--spacer-sm);
    margin: auto;
  }

  .product-image > img {
    width: 400px;
  }
}

@media (min-width: 991px) {
 .find {
    grid: "search main" min-content
          "filters main" 1fr
          / 375px;
    column-gap: var(--spacer-2xl);
    /* margin: var(--spacer-lg); */
  }

 /* .filters {
    margin-top: var(--spacer-lg);
  } */

 .find >.filters {
    display: unset;
  }
}
</style>