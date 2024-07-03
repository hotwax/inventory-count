  <template>
    <main>
      <section class="product-image">
        <Image :src="getProduct(product.productId)?.mainImageUrl" />
      </section>
      <section class="product-info">
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <h1>{{ product.productId }}</h1>
            <p>{{ product.productId }}</p>
          </ion-label>

          <ion-badge slot="end" v-if="product.itemStatusId === 'INV_COUNT_REJECTED'" color="danger">
            {{ translate("rejected") }}
          </ion-badge>
        </ion-item>

        <ion-list v-if="product.statusId !== 'INV_COUNT_CREATED' && product.statusId !== 'INV_COUNT_ASSIGNED'">
          <ion-item>
            {{ translate("Counted") }}
          <ion-label slot="end">{{ product.quantity ? product.quantity : '-'}}</ion-label>
          </ion-item>
          <ion-item>
            {{ translate("Current on hand") }}
            <ion-label slot="end">{{ product.qoh }}</ion-label>
          </ion-item>
          <ion-item>
            {{ translate("Variance") }}
            <ion-label slot="end">{{ getVariance(product) }}</ion-label>
          </ion-item>
        </ion-list>

        <template v-else>
          <ion-list v-if="product.isRecounting">
            <ion-item>
              <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" required @ionInput="calculateVariance"/>
            </ion-item>
            <ion-item>
              {{ translate("Current on hand") }}
              <ion-label slot="end">{{ product.qoh }}</ion-label>
            </ion-item>
            <ion-item>
              {{ translate("Variance") }}
              <ion-label slot="end">{{ variance }}</ion-label>
            </ion-item> 
            <div class="ion-margin">
              <ion-button color="medium" fill="outline" @click="discardRecount()">
                {{ translate("Discard re-count") }}
              </ion-button>
              <ion-button fill="outline" @click="openRecountSaveAlert()">
                {{ translate("Save new count") }}
              </ion-button>
            </div>
          </ion-list>

          <ion-list v-else-if="product.quantity"> <!-- TODO: landing on this section after saving the recount need to call action to updated the product information-->
            <ion-item>
              {{ translate("Counted") }}
              <ion-label slot="end">{{ product.quantity }}</ion-label>
            </ion-item>
            <ion-item>
              {{ translate("Counted by") }}
              <ion-label slot="end">{{ getPartyName(product)}}</ion-label>
            </ion-item>
            <ion-item>
              {{ translate("Counted at") }}
              <ion-label slot="end">user.name</ion-label>
            </ion-item>
            <ion-item>
              {{ translate("Current on hand") }}
              <ion-label slot="end">{{ product.qoh }}</ion-label> 
            </ion-item>
            <ion-item>
              {{ translate("Variance") }}
              <ion-label slot="end">{{ getVariance(product) }}</ion-label>
            </ion-item>
            <ion-button class="ion-margin" fill="outline" expand="block" @click="openRecountAlert()">
              {{ translate("Re-count") }}
            </ion-button>
          </ion-list>
          
          <ion-list v-else>
            <ion-item>
              <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" required @ionInput="calculateVariance"/>
            </ion-item>
            <ion-item>
              {{ translate("Current on hand") }}
              <ion-label slot="end">{{ product.qoh }}</ion-label>
            </ion-item>
            <ion-item>
              {{ translate("Variance") }}
              <ion-label slot="end">{{ variance }}</ion-label>
            </ion-item>
            <ion-button class="ion-margin" fill="outline" expand="block" @click="saveCount()">
              {{ translate("Save count") }}
            </ion-button>
          </ion-list>
        </template>
      </section>
    </main>
  </template>

  <script setup lang="ts">
  import { computed, ref } from 'vue';
  import { IonBadge, IonButton, IonInput, IonItem, IonLabel, IonList, alertController } from "@ionic/vue";
  import { translate } from '@/i18n'
  import { useStore } from 'vuex';
  import { hasError } from '@/utils'
  import emitter from '@/event-bus';
  import logger from '@/logger'
  import { getPartyName, showToast } from '@/utils';
  import { CountService } from '@/services/CountService';
  import Image from "@/components/Image.vue"

  const store = useStore();
  const product = computed(() => store.getters['product/getCurrentProduct']);
  const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
  const userProfile = computed(() => store.getters["user/getUserProfile"])

  const inputCount = ref('');
  const variance = ref(0);

  async function calculateVariance() {
    if (!product.value || !inputCount.value) {
      variance.value = 0;
    } else {
      variance.value = parseInt(inputCount.value) - parseInt(product.value.qoh) || 0;
    }
  }

  function getVariance(item: any, count?: any) {
    const qty = item.quantity || 0
    // As the item is rejected there is no meaning of displaying variance hence added check for REJECTED item status
    return item.itemStatusId === "INV_COUNT_REJECTED" ? 0 : parseInt(count ? count : qty) - parseInt(item.qoh)
  }

  async function saveCount() {
    if (!product.value) {
      return;
    }
    try {
      const payload = {
        inventoryCountImportId: product.value.inventoryCountImportId,
        importItemSeqId: product.value.importItemSeqId,
        productId: product.value.productId,
        quantity: inputCount.value,
        countedByUserLoginId: userProfile.value.username
      };
      const resp = await CountService.updateCount(payload);
      if (!hasError(resp)) {
        inputCount.value = ''; 
      } else {
        throw resp.data;
      }
      await store.dispatch("count/fetchCycleCountItems", payload.inventoryCountImportId); 
      emitter.emit("updateItemList");
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong, please try again"));
    }
  }

  async function openRecountAlert() {
    const alert = await alertController.create({
      header: translate("Update count"),
      message: translate("Updating a count will replace the existing count. The previous count cannot be restored after being replaced."),
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel',
      },
      {
        text: translate('Re-count'),
        handler: () => {
          inputCount.value = ''; 
          product.value.isRecounting = true;
        }
      }]
    });
    await alert.present();
  }

  async function openRecountSaveAlert() {
    const alert = await alertController.create({
      header: translate("Save re-count"),
      message: translate("Saving recount will replace the existing count for item."),
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel',
      },
      {
        text: translate('Save Re-count'),
        handler: async () => {
          await saveCount(); 
          product.value.isRecounting = false;
        }
      }]
    });
    await alert.present();
  }

  async function discardRecount() {
    const alert = await alertController.create({
      header: translate("Discard re-count"),
      message: translate("Discarding the re-count will revert the count to the previous count value."),
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel',
      },
      {
        text: translate('Discard'),
        handler: async () => {
          inputCount.value = ''; 
          product.value.isRecounting = false;
        }
      }]
    });
    await alert.present();
  }
  </script>

  <style>
  .product-info {
    width: 100%;
    margin-top: var(--spacer-lg);
    margin-right: var(--spacer-lg);
  }

  .product-info > ion-list {
    max-width: 400px;
  }

  .product-image {
    text-align: center;
    margin-top: var(--spacer-lg);
    max-width: 350px;
  }

  ion-content > main {
    display: grid;
    height: 100%;
  }
  </style>