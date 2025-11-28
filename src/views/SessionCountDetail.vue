<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/count"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Session Count Detail") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="pageRef">
        <div v-if="isLoadingItems" class="loading-overlay">
          <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
        </div>
      <main v-else>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">sku</ion-label>
            <ion-input ref="barcodeInput" v-model="scannedValue" placeholder="Scan a barcode" @keyup.enter="handleScan" @click="clearSearchResults"
              :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'"></ion-input>
          </ion-item>

          <ion-button expand="block" color="success" class="focus ion-margin-top ion-margin-horizontal" @click="focusScanner" :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ translate("start counting") }}
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              {{ translate("Items you scan or count will show on this list. Focus your scanner on the input field to begin.") }}
            </ion-label>
          </ion-item>

          <div class="events">
          <DynamicScroller :items="events" key-field="createdAt" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
            <template v-slot="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                <ion-item>
                  <div class="img-preview">
                    <ion-thumbnail @click="openImagePreview(item.product?.mainImageUrl)">
                      <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                    </ion-thumbnail>
                      <ion-badge class="qty-badge" color="medium">
                        {{ item.quantity }}
                      </ion-badge>
                  </div>
                  <ion-label>
                    {{ item.scannedValue }}
                    <p class="clickable-time" @click="showTime(item.createdAt)">{{ timeAgo(item.createdAt) }}</p>
                  </ion-label>
                  <ion-badge v-if="item.aggApplied === 0" class="unagg-badge" color="primary">
                    {{ translate('unaggregated') }}
                  </ion-badge>
                  <ion-button v-if="item.quantity > 0" fill="clear" color="medium" slot="end" :id="item.createdAt" @click="openScanActionMenu(item)">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                  </ion-button>  
                </ion-item>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          <ion-popover :is-open="showScanAction" :trigger="popoverTrigger" @didDismiss="showScanAction = false" show-backdrop="false">
            <ion-content>
              <ion-item lines="none" button @click="removeScan(selectedScan)">
                <ion-label color="danger">{{ translate("Remove") }}</ion-label>
              </ion-item>
            </ion-content>
          </ion-popover>
          </div>

          <ion-card class="add-pre-counted" :disabled="inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'" button
            @click="router.push(`/add-pre-counted/${props.workEffortId}/${props.inventoryCountImportId}`)">
            <ion-item lines="none">
              <ion-label class="ion-text-nowrap">{{ translate("Add pre-counted items") }}</ion-label>
              <ion-icon slot="end" :icon="addOutline"></ion-icon>
            </ion-item>
          </ion-card>
        </div>

        <!-- Right Panel -->
        <div class="count-dashboard">
          <div class="header ion-padding">
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ countTypeLabel }}</p>
                <h1>{{ inventoryCountImport?.countImportName || 'Untitled session' }}</h1>
                <p>Created by {{ userLogin?.userFullName ? userLogin.userFullName : userLogin?.username }}</p>
              </ion-label>
            </ion-item>
            <!-- When session is SUBMITTED: show only Re-open button -->
            <template v-if="inventoryCountImport?.statusId === 'SESSION_SUBMITTED'">
              <ion-button color="warning" fill="outline" @click="reopen">
                <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
                {{ translate("Re-open session") }}
              </ion-button>
            </template>

            <!-- When session is VOIDED: all buttons disabled -->
            <template v-else-if="inventoryCountImport?.statusId === 'SESSION_VOIDED'">
              <ion-button color="warning" fill="outline" disabled>
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                {{ translate("Session discarded") }}
              </ion-button>
            </template>

            <!-- Default: show Edit / Discard / Submit -->
            <template v-else>
              <ion-button color="medium" fill="outline" @click="openEditSessionModal" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
                {{ translate("Edit") }}
              </ion-button>
              <ion-button color="warning" fill="outline" @click="showDiscardAlert = true" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                {{ translate("Discard") }}
              </ion-button>
              <ion-button color="success" fill="outline" @click="showSubmitAlert = true" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
                {{ translate("Submit") }}
              </ion-button>
            </template>
          </div>

          <div class="statistics ion-padding">
            <!-- Last Scanned Product Card -->
            <ion-card v-if="lastScannedEvent">
              <ion-item lines="none">
                <ion-label class="overline">{{ translate("Current Product") }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <Image :src="lastScannedEvent.product?.mainImageUrl || defaultImage" :key="lastScannedEvent.product?.mainImageUrl"/>
                </ion-thumbnail>
                <ion-label>
                  <template v-if="lastScannedEvent.product">
                    <h2>{{ useProductMaster().primaryId(lastScannedEvent.product) }}</h2>
                    <p>{{ useProductMaster().secondaryId(lastScannedEvent.product) }}</p>
                  </template>
                  <template v-else>
                    <h2>{{ lastScannedEvent.scannedValue }}</h2>
                    <p>{{ translate("Identifying product...") }}</p>
                  </template>
                </ion-label>
              </ion-item>
              
              <ion-item lines="none">
                <ion-label>
                  <p>{{ translate("Last updated") }} {{ timeAgo(lastScannedEvent.createdAt) }}</p>
                </ion-label>
              </ion-item>

              <ion-item lines="none">
                <ion-label>{{ translate("Units") }}</ion-label>
                <ion-label slot="end">{{ lastScannedProductTotal }}</ion-label>
              </ion-item>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">{{ translate("Products counted") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.productsCounted }}</p>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>{{ translate("Pending match scans") }}</ion-label>
                  <p slot="end">{{events.filter((event: any) => event.aggApplied === 0).length}}</p>
                </ion-item>
                <ion-item>
                  <ion-label>{{ translate("Unmatched scans") }}</ion-label>
                  <p slot="end">{{ stats.unmatched }}</p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">{{ translate("Units counted") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.totalUnits }}</p>
              </ion-card-content>
            </ion-card>
          </div>

          <ion-segment v-model="selectedSegment">
            <ion-segment-button v-if="isDirected" value="uncounted">
              <ion-label>{{ translate("Uncounted", { uncountedItemsLength: uncountedItems.length } ) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="isDirected" value="undirected">
              <ion-label>{{ translate("Undirected", { undirectedItemsLength: undirectedItems.length } ) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unmatched">
              <ion-label>{{ translate("Unmatched", { unmatchedItemsLength: unmatchedItems.length } ) }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="counted">
              <ion-label>{{ translate("Counted", { countedItemsLength: countedItems.length } ) }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <!-- Uncounted -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'uncounted'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <DynamicScroller :items="filteredItems" key-field="uuid" :buffer="30" class="virtual-list" :min-item-size="64" :emit-update="true">
                  <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-item>
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                        </ion-label>
                        <ion-note slot="end">
                          {{ item.quantity }} {{ translate('Units') }}
                        </ion-note>
                      </ion-item>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>

              <template v-else>
                <DynamicScroller :items="uncountedItems" key-field="uuid" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
                  <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-item>
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          {{ useProductMaster().primaryId(item.product) }}
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                        </ion-label>
                        <ion-note slot="end">{{ item.quantity }} {{ translate('Units') }}</ion-note>
                      </ion-item>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </template>
            </ion-segment-content>

            <!-- Undirected -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'undirected'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <DynamicScroller :items="filteredItems" key-field="uuid" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
                  <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-item>
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                        </ion-label>
                        <ion-note slot="end">
                          {{ item.quantity }} {{ translate('Units') }}
                        </ion-note>
                      </ion-item>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>

              <template v-else>
                <DynamicScroller :items="undirectedItems" key-field="uuid" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
                  <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-item>
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          {{ useProductMaster().primaryId(item.product) }}
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                        </ion-label>
                        <ion-note slot="end">{{ item.quantity }} {{ translate('Units') }}</ion-note>
                      </ion-item>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </template>
            </ion-segment-content>

            <!-- Unmatched -->
            <ion-segment-content v-if="selectedSegment === 'unmatched'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <ion-card v-for="item in filteredItems" :key="item.uuid">
                  <ion-item>
                    <ion-label>
                      <h2>{{ item.productIdentifier }}</h2>
                      <p>{{ getScanContext(item).scansAgo }} {{ translate("scans ago") }}</p>
                      <p>{{ timeAgo(item.createdAt) }}</p>
                    </ion-label>
                    <ion-button slot="end" fill="outline" @click="openMatchModal(item)">
                      <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                      {{ translate("Match") }}
                    </ion-button>
                  </ion-item>
                  <!-- Previous good scan -->
                  <ion-item v-if="getScanContext(item).previousGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).previousGood.product?.mainImageUrl" :key="getScanContext(item).previousGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).previousDistance }} {{ translate("scans later") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ getScanContext(item).previousGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronUpCircleOutline"></ion-icon>
                  </ion-item>
                  <!-- Next good scan -->
                  <ion-item lines="none" v-if="getScanContext(item).nextGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).nextGood.product?.mainImageUrl" :key="getScanContext(item).nextGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).nextDistance }} {{ translate("scans ago") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ getScanContext(item).nextGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronDownCircleOutline"></ion-icon>
                  </ion-item>
                </ion-card>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding ion-text-center">
                  <ion-label>{{ translate("No products found for") }} {{ searchKeyword }}</ion-label>
                </div>
              </template>

              <template v-else>
                <ion-card v-for="item in unmatchedItems" :key="item.uuid">
                  <ion-item>
                    <ion-label>
                      <h2>{{ item.productIdentifier }}</h2>
                      <p>{{ getScanContext(item).scansAgo }} {{ translate("scans ago") }}</p>
                      <p>{{ timeAgo(item.createdAt) }}</p>
                    </ion-label>
                    <ion-button slot="end" fill="outline" @click="openMatchModal(item)">
                      <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                      {{ translate("Match") }}
                    </ion-button>
                  </ion-item>
                  <!-- Previous good scan -->
                  <ion-item v-if="getScanContext(item).previousGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).previousGood.product?.mainImageUrl" :key="getScanContext(item).previousGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).previousDistance }} {{ translate("scans later") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ getScanContext(item).previousGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronUpCircleOutline"></ion-icon>
                  </ion-item>
                  <!-- Next good scan -->
                  <ion-item lines="none" v-if="getScanContext(item).nextGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).nextGood.product?.mainImageUrl" :key="getScanContext(item).nextGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).nextDistance }} {{ translate("scans ago") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ getScanContext(item).nextGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronDownCircleOutline"></ion-icon>
                  </ion-item>
                </ion-card>
              </template>
            </ion-segment-content>

            <!-- Counted -->
            <ion-segment-content v-if="selectedSegment === 'counted'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <DynamicScroller :items="filteredItems" key-field="uuid" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
                  <template v-slot="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-item>
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                          <p v-if="item.wasUnmatched">{{ item.scannedValue }}</p>
                        </ion-label>
                        <ion-note slot="end">
                          {{ item.quantity }} {{ translate('Units') }}
                        </ion-note>
                      </ion-item>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>
              
              <template v-else>
                <DynamicScroller :items="countedItems" key-field="uuid" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
                <template v-slot="{ item, index, active }">
                  <DynamicScrollerItem :item="item" :index="index" :active="active">
                    <ion-item>
                      <ion-thumbnail slot="start">
                        <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                      </ion-thumbnail>
                      <ion-label>
                        {{ useProductMaster().primaryId(item.product) }}
                        <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                      </ion-label>
                      <ion-note slot="end">{{ item.quantity }} {{ translate('Units') }}</ion-note>
                    </ion-item>
                  </DynamicScrollerItem>
                </template>
              </DynamicScroller>
            </template>
            </ion-segment-content>
          </ion-segment-view>
        </div>
      </main>
      <ion-modal :is-open="isMatchModalOpen" @didDismiss="closeMatchModal" @didPresent="focusMatchSearch">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeMatchModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Match Product") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar ref="matchSearchbar" v-model="queryString" placeholder="Search product" @keyup.enter="handleSearch" />
          <div v-if="isLoading" class="empty-state ion-padding">
            <ion-spinner name="crescent" />
            <ion-label>{{ translate("Searching for") }} "{{ queryString }}"</ion-label>
          </div>
          <template v-else-if="isSearching && products.length">
            <ion-radio-group v-model="selectedProductId">
              <ion-item v-for="product in products" :key="product.productId">
                <ion-thumbnail slot="start">
                  <Image :src="product?.mainImageUrl" :key="product?.mainImageUrl"/>
                </ion-thumbnail>
                <ion-radio :value="product.productId">
                  <ion-label>
                    {{ useProductMaster().primaryId(product) || product.productName }}
                    <p>{{ useProductMaster().secondaryId(product) }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </template>
          <div v-else-if="queryString && isSearching && !products.length" class="empty-state ion-padding">
            <p>{{ translate("No results found") }}</p>
          </div>
          <div v-else class="empty-state ion-padding">
            <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
            <p>{{ translate("Enter a SKU or product name to search a product") }}</p>
          </div>
          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button :disabled="!selectedProductId" @click="saveMatchProduct">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
      <!-- Edit Session Modal -->
      <ion-modal :is-open="isEditNewSessionModalOpen" @did-dismiss="isEditNewSessionModalOpen = false"
        :presenting-element="pageRef?.$el" :keep-contents-mounted="true">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="isEditNewSessionModalOpen = false" fill="clear" aria-label="Close">
                <ion-icon :icon="closeOutline" slot="icon-only" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Edit session") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-item>
            <ion-label position="stacked">{{ translate("Name") }}</ion-label>
            <ion-input v-model="newCountName" placeholder="category, section, or person"></ion-input>
            <ion-note slot="helper">{{ translate("Add a name to help identify what inventory is counted in this session")}}</ion-note>
          </ion-item>

          <ion-list>
            <ion-list-header>{{ translate("Area")}}</ion-list-header>

            <ion-radio-group v-model="selectedArea">
              <ion-item v-for="area in areas" :key="area.value">
                <ion-radio label-placement="start" :value="area.value">{{ area.label }}</ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>

          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button @click="updateSessionOnServer">
              <ion-icon :icon="checkmarkDoneOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
      <ion-modal :is-open="isImageModalOpen" @didDismiss="closeImagePreview">
        <ion-content class="ion-padding image-preview-modal">
          <ion-img :src="largeImage" />
        </ion-content>
      </ion-modal>
      <ion-alert :is-open="showSubmitAlert" header="Submit for review" message="Make sure you’ve reviewed the products and their counts before uploading them for review."
        :buttons="[
          { text: 'Cancel', role: 'cancel', handler: () => showSubmitAlert = false },
          { text: 'Submit', role: 'confirm', handler: confirmSubmit }
        ]"
        @didDismiss="showSubmitAlert = false"/>

      <ion-alert :is-open="showDiscardAlert" header="Leave session" message="Leaving this session unlinks it from your device and allows other users to continue this session on their device."
        :buttons="[
          { text: 'Cancel', role: 'cancel', handler: () => showDiscardAlert = false },
          { text: 'Leave', role: 'confirm', handler: confirmDiscard }
        ]"
        @didDismiss="showDiscardAlert = false"/>
    </ion-content>
  </ion-page>
</template>


<script setup lang="ts">
import { IonPopover, IonAlert, IonBackButton, IonButtons, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon, IonInput, IonImg, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonSearchbar, IonSpinner, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonThumbnail, IonTitle, IonToolbar, IonFab, IonFabButton, IonModal, IonRadio, IonRadioGroup, onIonViewDidEnter, onIonViewDidLeave } from '@ionic/vue';
import { addOutline, chevronUpCircleOutline, chevronDownCircleOutline, timerOutline, searchOutline, barcodeOutline, checkmarkDoneOutline, exitOutline, pencilOutline, saveOutline, closeOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { ref, computed, defineProps, watch, watchEffect, toRaw, onBeforeUnmount } from 'vue';
import { useProductMaster } from '@/composables/useProductMaster';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { loader, showToast } from '@/services/uiUtils';
import { translate } from '@/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from "@/components/Image.vue";
import { Subscription, from } from 'rxjs';
import { inventorySyncWorker } from "@/workers/workerInitiator";
import router from '@/router';
import { wrap } from 'comlink'
import type { Remote } from 'comlink'
import type { LockHeartbeatWorker } from '@/workers/lockHeartbeatWorker';
import { useAuthStore } from '@/stores/authStore';
import { useUserProfile } from '@/stores/userProfileStore';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import ProgressBar from '@/components/ProgressBar.vue';
import { useProductStore } from '@/stores/productStore';
import { debounce } from "lodash-es";
import defaultImage from "@/assets/images/defaultImage.png";


const props = defineProps<{
  workEffortId: string;
  inventoryCountImportId: string;
  inventoryCountTypeId: string;
}>();

const scannedValue = ref('');
const events = ref<any[]>([]);
const selectedSegment = ref('counted');
const stats = ref({ productsCounted: 0, totalUnits: 0, unmatched: 0 });
const totalUnitsCount = ref(0);
const subscriptions: Subscription[] = [];
const barcodeInput = ref();
const sessionLocked = ref(false);
const unmatchedItems = ref<any[]>([]);
const countedItems = ref<any[]>([]);
const uncountedItems = ref<any[]>([]);
const undirectedItems = ref<any[]>([]);
const isMatchModalOpen = ref(false);
const isLoading = ref(false);
const isSearching = ref(false);
const queryString = ref('');
const matchSearchbar = ref();
const selectedProductId = ref('');
const matchedItem = ref<any>(null);
const products = ref<any[]>([]);
const inventoryCountImport = ref();
const newCountName = ref();
const searchKeyword = ref('')
const filteredItems = ref<any[]>([])
const currentLock = ref<any>(null);
const isNewLockAcquired = ref(false);
const showSubmitAlert = ref(false)
const showDiscardAlert = ref(false)

//Progress bar
const totalItems = ref(0)
const loadedItems = ref(0)
const isLoadingItems = ref(true)

// Remove ScanEvent Record
const showScanAction = ref(false)
const selectedScan = ref<any>(null)
const popoverTrigger = ref('')

let lockWorker: Remote<LockHeartbeatWorker> | null = null
let lockLeaseSeconds = 300
let lockGracePeriod = 300

const pageRef = ref(null);

const isEditNewSessionModalOpen = ref(false);

const areas = [
  { value: 'back_stock', label: 'Back stock' },
  { value: 'display', label: 'Display' },
  { value: 'floor_wall', label: 'Floor - wall' },
  { value: 'floor_shelf', label: 'Floor - shelf' },
  { value: 'overflow', label: 'Overflow' },
  { value: 'register', label: 'Register' },
];
const selectedArea = ref(areas[0].value);

let aggregationWorker: Worker | null = null

const countTypeLabel = computed(() =>
  props.inventoryCountTypeId === 'HARD_COUNT' ? 'Hard Count' : 'Directed Count'
);
const isDirected = computed(() => props.inventoryCountTypeId === 'DIRECTED_COUNT');
const userLogin = computed(() => useUserProfile().getUserProfile);

const lastScannedEvent = computed(() => events.value[0]);

const lastScannedProductTotal = computed(() => {
  if (!lastScannedEvent.value) return 0;

  // If the last scanned event has an associated product, calculate the total aggregated quantity.
  if (lastScannedEvent.value.productId) {
    const productId = lastScannedEvent.value.productId;

    const total = [...countedItems.value, ...undirectedItems.value]
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return total;
  }

  // If the event is not yet aggregated, fall back to showing the quantity of the single scan event.
  return lastScannedEvent.value.quantity;
});
  
watchEffect(() => {
  const distinctProducts = new Set(countedItems.value.map(item => item.productId)).size
  stats.value = {
    productsCounted: distinctProducts,
    totalUnits: totalUnitsCount.value,
    unmatched: unmatchedItems.value.length
  }
})

onIonViewDidEnter(async () => {
  try {
    await startSession();
    await handleSessionLock();

    if (props.inventoryCountTypeId === 'DIRECTED_COUNT') selectedSegment.value = 'uncounted';
    
    // Fetch the items from IndexedDB via liveQuery to update the lists reactively
    subscriptions.push(
      from(useInventoryCountImport().getUnmatchedItems(props.inventoryCountImportId)).subscribe(items => (unmatchedItems.value = items))
    )
    subscriptions.push(
      from(useInventoryCountImport().getCountedItems(props.inventoryCountImportId)).subscribe(items => (countedItems.value = items))
    )
    subscriptions.push(
      from(useInventoryCountImport().getUncountedItems(props.inventoryCountImportId)).subscribe(items => (uncountedItems.value = items))
    )
    subscriptions.push(
      from(useInventoryCountImport().getUndirectedItems(props.inventoryCountImportId)).subscribe(items => (undirectedItems.value = items))
    )
    subscriptions.push(
      from(useInventoryCountImport().getScanEvents(props.inventoryCountImportId)).subscribe(scans => { events.value = scans; })
    );
    subscriptions.push(
      from(useInventoryCountImport().getTotalCountedUnits(props.inventoryCountImportId)).subscribe(total => {
        totalUnitsCount.value = total;
      })
    );

    dayjs.extend(relativeTime);

    watch(selectedSegment, () => {
      searchKeyword.value = ""
      filteredItems.value = []
    })
    // Start the background aggregation worker and schedule periodic aggregation
    aggregationWorker = new Worker(
      new URL('@/workers/backgroundAggregation.ts', import.meta.url), { type: 'module' }
    )

    aggregationWorker.onmessage = (event) => {
      const { type, count } = event.data
      if (type === 'aggregationComplete') {
        console.info(`Aggregated ${count} products from scans`)
      }
    }
    aggregationWorker.onerror = (err) => {
      console.error('[Worker Error]', err.message || err);
    };
    aggregationWorker.onmessageerror = (err) => {
      console.error('[Worker Message Error]', err);
    };
    // Run every 10 seconds
    // const productIdentifications = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(JSON.stringify(process.env.VUE_APP_PRDT_IDENT)) : []
    const barcodeIdentification = useProductStore().getBarcodeIdentificationPref;

    aggregationWorker.postMessage({
      type: 'schedule',
      payload: {
        workEffortId: props.workEffortId,
        inventoryCountImportId: props.inventoryCountImportId,
        intervalMs: 8000,
        context: {
          omsUrl: useAuthStore().getOmsRedirectionUrl,
          userLoginId: useUserProfile().getUserProfile?.username,
          maargUrl: useAuthStore().getBaseUrl,
          token: useAuthStore().token.value,
          barcodeIdentification: barcodeIdentification,
          inventoryCountTypeId: props.inventoryCountTypeId
        }
      }
    })
  } catch (error) {
    console.error(error);
    showToast("Failed to load session details");
  }
});

onIonViewDidLeave(async () => {
  subscriptions.forEach(subscription => subscription.unsubscribe());
  subscriptions.length = 0;

  await finalizeAggregationAndSync();
  await unscheduleWorker();
  if (lockWorker) {
    await lockWorker.stopHeartbeat()
    lockWorker = null
  }
})

function openEditSessionModal() {
  isEditNewSessionModalOpen.value = true;
  newCountName.value = inventoryCountImport.value.countImportName;
}

async function updateSessionOnServer() {
  try {
    const resp = await useInventoryCountImport().updateSession({
      inventoryCountImportId: props.inventoryCountImportId,
      countImportName: newCountName.value,
      facilityAreaId: selectedArea.value,
      fromDate: currentLock.value.fromDate
    });

    if (resp?.status === 200 && resp.data) {
      inventoryCountImport.value.countImportName = newCountName.value;
      inventoryCountImport.value.facilityAreaId = selectedArea.value
      showToast(translate("Session Updated Successfully"))
    } else {
      showToast(translate("Failed to Update Session Details"));
    }
  } catch (error) {
    console.error(error);
  }
  isEditNewSessionModalOpen.value = false;
}

async function startSession() {
  try {
    const resp = await useInventoryCountImport().getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId });
    if (resp?.status === 200 && resp.data) {
      inventoryCountImport.value = resp.data;
    } else {
      console.error("Session not Found");
      throw resp;
    }

    await getTotalItemCount();

    // Load InventoryCountImportItem records into IndexedDB
    const sessionItemsCount = await useInventoryCountImport().getInventoryCountImportItemsCount(props.inventoryCountImportId);

    if (!sessionItemsCount || totalItems.value !== sessionItemsCount) {
      console.log("[Session] No local records found, fetching from backend...");
      await loadInventoryItemsWithProgress();
    } else {
      isLoadingItems.value = false
    }

    // Prefetch product details for all related productIds
    const productIds = await useInventoryCountImport().getSessionProductIds(props.inventoryCountImportId);
    if (productIds.length) {
      // fire asynchronously, don’t block UI
      useProductMaster().prefetch(productIds)
        .then(() => console.info(`Prefetch ${productIds.length} products hydrated`))
        .catch(err => console.warn('Prefetch Failed:', err))
    }    showToast('Session ready to start counting');
  } catch (err) {
    console.error(err);
    showToast('Failed to initialize session');
  }

  focusScanner();
}

async function loadInventoryItemsWithProgress() {
  loadedItems.value = 0
  isLoadingItems.value = true
  const pageSize = 500
  let pageIndex = 0
  let totalFetched = 0

  try {
    let hasMore = true
    while (hasMore) {
      const resp = await useInventoryCountImport().getSessionItemsByImportId({
        inventoryCountImportId: props.inventoryCountImportId,
        facilityId: useProductStore().getCurrentFacility.facilityId,
        pageIndex,
        pageSize
      })

      if (resp?.status !== 200 || !resp.data?.length) break

      const items = resp.data
      totalFetched += items.length
      loadedItems.value = totalFetched

      // store in IndexedDB
      await useInventoryCountImport().storeInventoryCountItems(items)

      if (items.length < pageSize) {
        hasMore = false
        break
      }
      pageIndex++
    }
  } catch (err) {
    console.error('Error loading items with progress', err)
    showToast('Failed to load session items')
  } finally {
    isLoadingItems.value = false
  }
}

function focusScanner() {
  barcodeInput.value?.$el?.setFocus();
  filteredItems.value = [];
  searchKeyword.value = '';
}

function handleScan() {
  const value = scannedValue.value.trim();
  if (!value) return;

  try {
    useInventoryCountImport().recordScan({ inventoryCountImportId: props.inventoryCountImportId, productIdentifier: value, quantity: 1 });
    events.value.unshift({ scannedValue: value, quantity: 1, createdAt: Date.now() });
    filteredItems.value = [];
    searchKeyword.value = '';
  } catch (err) {
    console.error(err);
    showToast('Failed to record scan');
  } finally {
    scannedValue.value = '';
  }
}

async function handleSessionLock() {
  try {
    const userId = useUserProfile().getUserProfile?.username;
    const inventoryCountImportId = props.inventoryCountImportId;
    const currentDeviceId = useUserProfile().getDeviceId;

    // Fetch existing lock
    const existingLockResp = await useInventoryCountImport().getSessionLock({
      inventoryCountImportId,
      deviceId: currentDeviceId,
      userId,
    });
    const existingLock = existingLockResp?.data?.entityValueList?.[0] || null;
    currentLock.value = existingLock;

    // --- If existing lock found ---
    if (existingLock) {
      if (existingLock.userId !== userId || existingLock.deviceId !== currentDeviceId) {
        // Different user → lock session
        sessionLocked.value = true;
        showToast('This session is locked by another user.');
        return;
      }

      // Same user + same device → continue, schedule worker
      sessionLocked.value = false;
      showToast('Existing lock found. Resuming session.');

      // Schedule heartbeat worker for existing lock
      let worker: Worker | null = null;
      if (!lockWorker) {
        worker = new Worker(
          new URL('@/workers/lockHeartbeatWorker.ts', import.meta.url),
          { type: 'module' }
        );
        lockWorker = wrap<Remote<LockHeartbeatWorker>>(worker);
      }

      const payload = {
        inventoryCountImportId,
        lock: JSON.parse(JSON.stringify(toRaw(currentLock.value))),
        leaseSeconds: lockLeaseSeconds,
        gracePeriod: lockGracePeriod,
        maargUrl: useAuthStore().getBaseUrl,
        token: useAuthStore().token.value,
        userId,
        deviceId: currentDeviceId
      };

      await lockWorker.startHeartbeat(payload);

      // Message listener
      if (worker) {
        worker.onmessage = async (event: any) => {
          const { type, thruDate } = event.data;
          if (type === 'heartbeatSuccess') {
            currentLock.value.thruDate = thruDate;
          } else if (type === 'lockForceReleased') {
            showToast('Session lock was force-released by another user.');
            await releaseSessionLock();
            if (lockWorker) await lockWorker.stopHeartbeat();
            router.push('/tabs/count');
          } else if (type === 'lockExpired') {
            showToast('Session lock expired. Please reacquire the lock.');
            await releaseSessionLock();
            router.push('/tabs/count');
          } else if (type === 'reacquireLock') {
            showToast('Reacquiring lock...');
            await handleSessionLock();
          }
        };
      }

      return;
    }

    // --- If no lock found, acquire a new one ---
    const fromDate = Date.now();
    const newLockResp = await useInventoryCountImport().lockSession({
      inventoryCountImportId,
      userId,
      deviceId: currentDeviceId,
      fromDate,
      thruDate: fromDate + (lockLeaseSeconds * 1000)
    });

    if (newLockResp?.status === 200) {
      currentLock.value = newLockResp.data;
      showToast('Session lock acquired.');

      let worker: Worker | null = null;
      if (!lockWorker) {
        worker = new Worker(
          new URL('@/workers/lockHeartbeatWorker.ts', import.meta.url),
          { type: 'module' }
        );
        lockWorker = wrap<Remote<LockHeartbeatWorker>>(worker);
      }

      const payload = {
        inventoryCountImportId,
        lock: JSON.parse(JSON.stringify(toRaw(currentLock.value))),
        leaseSeconds: lockLeaseSeconds,
        gracePeriod: lockGracePeriod,
        maargUrl: useAuthStore().getBaseUrl,
        token: useAuthStore().token.value,
        userId,
        deviceId: currentDeviceId
      };

      await lockWorker.startHeartbeat(payload);

      // Listen for messages
      if (worker) {
        worker.onmessage = async (event: any) => {
          const { type, thruDate } = event.data;
          if (type === 'heartbeatSuccess') {
            currentLock.value.thruDate = thruDate;
          } else if (type === 'lockForceReleased') {
            showToast('Session lock was force-released by another user.');
            await releaseSessionLock();
            if (lockWorker) await lockWorker.stopHeartbeat();
            router.push('/tabs/count');
          } else if (type === 'lockExpired') {
            showToast('Session lock expired. Please reacquire the lock.');
            await releaseSessionLock();
            router.push('/tabs/count');
          } else if (type === 'reacquireLock') {
            showToast('Reacquiring lock...');
            await handleSessionLock();
          }
        };
      }
      isNewLockAcquired.value = true;
    } else {
      sessionLocked.value = true;
      showToast('Failed to acquire lock.');
    }
  } catch (err) {
    console.error('Error handling session lock:', err);
    sessionLocked.value = true;
    showToast('Error while acquiring session lock.');
  }
}

/** Releases the active lock */
async function releaseSessionLock() {
  if (!currentLock.value) return;

  try {
    const payload = {
      inventoryCountImportId: props.inventoryCountImportId,
      userId: useUserProfile().getUserProfile?.username,
      thruDate: Date.now(),
      fromDate: currentLock.value.fromDate
    };

    const resp = await useInventoryCountImport().releaseSession(payload);
    if (resp?.status === 200) {
      showToast('Session lock released.');
      currentLock.value = null;
    } else {
      showToast('Failed to release session lock.');
    }
  } catch (err) {
    console.error('Error releasing session lock:', err);
    showToast('Error while releasing session lock.');
  }
}

async function getTotalItemCount() {
  try {
    const resp = await useInventoryCountImport().getInventoryCountImportItemCount(props.inventoryCountImportId)
    if (resp?.status === 200 && resp.data?.count !== undefined) {
      totalItems.value = resp.data.count
    } else {
      totalItems.value = 0
    }
  } catch (err) {
    console.error('Failed to fetch total item count', err)
    totalItems.value = 0
  }
}

function timeAgo(ts: number) {
  return dayjs(ts).fromNow();
}

function openMatchModal(item: any) {
  matchedItem.value = item;
  queryString.value = item.productIdentifier;
  isMatchModalOpen.value = true;
}

function closeMatchModal() {
  selectedProductId.value = '';
  isMatchModalOpen.value = false;
  products.value = [];
  queryString.value = "";
}

function focusMatchSearch() {
  matchSearchbar.value?.$el?.setFocus();
}

async function handleSearch() {
  selectedProductId.value = '';
  if (!queryString.value.trim()) {
    isSearching.value = false;
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts() {

  const queryPayload = useProductMaster().buildProductQuery({
    keyword: queryString.value.trim(),
    viewSize: 100,
    filter: 'isVirtual:false,isVariant:true',
  })

  isLoading.value = true
  try {
    const resp = await useProductMaster().loadProducts(queryPayload)
    if (resp?.status === 200 && resp.data?.response?.docs) {
      products.value = resp.data.response.docs.length ? resp.data.response.docs : []
    }
  } catch (err) {
    console.error('Failed to fetch products', err)
  } finally {
    isLoading.value = false
  }
}

async function saveMatchProduct() {
  if (!selectedProductId.value) {
    showToast("Please select a product to match");
    return;
  }
  const context = {
    maargUrl: useAuthStore().getBaseUrl,
    token: useAuthStore().token.value,
    omsUrl: useAuthStore().getOmsRedirectionUrl,
    userLoginId: useUserProfile().getUserProfile?.username,
    isRequested: 'Y',
  };

  const plainItem = JSON.parse(JSON.stringify(toRaw(matchedItem.value)));
  const plainContext = JSON.parse(JSON.stringify(context));

  try {
    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      props.inventoryCountImportId,
      plainItem,
      selectedProductId.value,
      plainContext
    );
    if (result.success) {
      showToast("Product matched successfully");
      closeMatchModal();
    } else {
      showToast("Failed to match product");
    }
  } catch (err) {
    showToast("An error occurred while matching product");
  }
}

async function finalizeAggregationAndSync() {
  try {
    if (!aggregationWorker) return;

    const barcodeIdentification = useProductStore().getBarcodeIdentificationPref;

    const context = {
      omsUrl: useAuthStore().getOmsRedirectionUrl,
      userLoginId: useUserProfile().getUserProfile?.username,
      maargUrl: useAuthStore().getBaseUrl,
      token: useAuthStore().token.value,
      barcodeIdentification,
      inventoryCountTypeId: props.inventoryCountTypeId
    };

    aggregationWorker.postMessage({
      type: 'aggregate',
      payload: {
        workEffortId: props.workEffortId,
        inventoryCountImportId: props.inventoryCountImportId,
        context
      }
    });

    // Wait until the worker confirms completion
    loader.present('Finalising aggregation...');
    const result = await new Promise<number>((resolve) => {
      const timeout = setTimeout(() => resolve(0), 15000); // safety timeout
      if (aggregationWorker) {
        aggregationWorker.onmessage = (event) => {
          const { type, count } = event.data;
          if (type === 'aggregationComplete') {
            console.log(`Aggregated ${count} products from scans`)
            clearTimeout(timeout);
            resolve(count);
          }
        };
      }
    });
    loader.dismiss();

    return result;
  } catch (err) {
    console.error('[Session] Error during final aggregation:', err);
    return 0;
  }
}

/** Stop background worker schedule and terminate */
async function unscheduleWorker() {
  try {
    if (aggregationWorker) {
      console.log('[Session] Terminating background aggregation worker...');
      aggregationWorker.terminate();
      aggregationWorker = null;
    }
  } catch (err) {
    console.error('[Session] Failed to terminate worker:', err);
  }
}

async function confirmSubmit() {
  showSubmitAlert.value = false
  try {
    if (unmatchedItems.value.length > 0) {
      showToast(translate("Unmatched products should be resolved before submission"))
      return
    }
    await finalizeAggregationAndSync()
    await useInventoryCountImport().updateSession({
      inventoryCountImportId: props.inventoryCountImportId,
      statusId: 'SESSION_SUBMITTED'
    })
    inventoryCountImport.value.statusId = 'SESSION_SUBMITTED'
    await releaseSessionLock()
    if (lockWorker) await lockWorker.stopHeartbeat()
    showToast('Session submitted successfully')
  } catch (err) {
    console.error(err)
    showToast('Failed to submit session')
  }
}

async function confirmDiscard() {
  showDiscardAlert.value = false
  try {
    await finalizeAggregationAndSync()
    await useInventoryCountImport().updateSession({
      inventoryCountImportId: props.inventoryCountImportId,
      statusId: 'SESSION_VOIDED',
      fromDate: currentLock.value.fromDate
    })
    inventoryCountImport.value.statusId = 'SESSION_VOIDED'
    await releaseSessionLock()
    if (lockWorker) await lockWorker.stopHeartbeat()
    showToast('Session discarded')
  } catch (err) {
    console.error(err)
    showToast('Failed to discard session')
  }
}

async function reopen() {
  try {
    await useInventoryCountImport().updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_ASSIGNED' });
    inventoryCountImport.value.statusId = 'SESSION_ASSIGNED';
    showToast('Session reopened');
    await handleSessionLock();
  } catch (err) {
    console.error(err);
    showToast('Failed to reopen session');
  }
}

const handleIndexedDBSearch = debounce(async () => {
  if (!searchKeyword.value.trim()) {
    filteredItems.value = [] // show all
    return
  }
  const results = await useInventoryCountImport().searchInventoryItemsByIdentifier(
    props.inventoryCountImportId,
    searchKeyword.value,
    selectedSegment.value
  )
  filteredItems.value = results
}, 150)

function clearSearchResults() {
  searchKeyword.value = ''
  filteredItems.value = []
}

function getScanContext(item: any) {
  if (!item || !item.productIdentifier || !events.value?.length) return {}

  //newest to oldest
  const sortedScans = [...events.value].sort(
    (predecessor, successor) => (successor.createdAt ?? 0) - (predecessor.createdAt ?? 0)
  )

  const unmatchedIndex = sortedScans.findIndex(
    (scan) => scan.scannedValue === item.productIdentifier
  )
  if (unmatchedIndex === -1) return {}

  //How many scans ago = index itself since list is newest→oldest
  const scansAgo = unmatchedIndex + 1

  // Find previous good scan (relative newer scan)
  let previousGood = null
  let previousGoodIndex = -1

  for (let i = unmatchedIndex - 1; i >= 0; i--) {
    if (sortedScans[i]?.productId) {
      previousGood = sortedScans[i]
      previousGoodIndex = i
      break
    }
  }

  // Find next good scan (relative older scan)
  let nextGood = null
  let nextGoodIndex = -1

  for (let i = unmatchedIndex + 1; i < sortedScans.length; i++) {
    if (sortedScans[i]?.productId) {
      nextGood = sortedScans[i]
      nextGoodIndex = i
      break
    }
  }

  //Compute scan-distance relative to the unmatched item
  const previousDistance =
    previousGoodIndex !== -1 ? previousGoodIndex - unmatchedIndex : -1

  const nextDistance =
    nextGoodIndex !== -1 ? unmatchedIndex - nextGoodIndex : -1

  return {
    // how many scans ago this mismatched item occurred
    scansAgo,
    previousGood,
    previousGoodIndex,
    previousDistance: Math.abs(previousDistance),
    nextGood,
    nextGoodIndex,
    nextDistance: Math.abs(nextDistance)
  }
}

function showTime(ts: number) {
  const exact = dayjs(ts).format('DD MMM YYYY, hh:mm:ss A');
  showToast(`Scanned at: ${exact}`);
}

const isImageModalOpen = ref(false)
const largeImage = ref("")

function openImagePreview(src: string) {
  if (!src) return
  largeImage.value = src
  isImageModalOpen.value = true
}

function closeImagePreview() {
  isImageModalOpen.value = false
}

// Negate ScanEvent record
function openScanActionMenu(item: any) {
  selectedScan.value = item
  popoverTrigger.value = item.createdAt
  showScanAction.value = true
}

async function removeScan(item: any) {
  try {
    await useInventoryCountImport().recordScan({
      inventoryCountImportId: props.inventoryCountImportId,
      productIdentifier: item.scannedValue,
      quantity: -Math.abs(item.quantity || 1)
    })
    showToast(`Scan ${item.scannedValue} removed`)
  } catch (error) {
    console.error(error)
    showToast("Failed to remove scan")
  } finally {
    showScanAction.value = false
  }
}

</script>

<style scoped>
main {
  display: grid;
  grid-template-columns: 25% auto;
  justify-content: unset;
  align-items: stretch;
}

.count-events {
  border-right: 1px solid var(--ion-color-medium);
  contain: paint;
  height: 100%;
  display: grid;
  grid-template-areas:
  "scan"
  "focus"
  "empty"
  "events";

  grid-template-rows: min-content min-content min-content 1fr;
}

.scan {
  grid-area: scan;
}

.focus {
  grid-area: focus;
}

.empty {
  grid-area: empty;
}

.events {
  grid-area: events;
  overflow-y: scroll;
  max-height: 100%;
  position: relative;
}

.events ion-list {
  position: absolute;
  inset-inline: 0;
}

.add-pre-counted {
  position: absolute;
  bottom: var(--spacer-base);
  inset-inline: var(--spacer-sm);
  width: stretch;
  grid-area: events;
  align-self: end;
}

ion-card ion-item {
  --background: transparent
}

.count-dashboard {
  height: 100%;
  overflow-y: scroll;
}

.header {
  display: flex;
  flex-wrap: wrap;
}

.header ion-item {
  flex: 1 0 max-content;
}

.header ion-button {
  flex: 0 1 max-content;
}

.statistics {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
}

.statistics ion-card {
  flex: 0 1 305px;
}

ion-segment {
  justify-content: start;
  border-bottom: 1px solid var(--ion-color-medium);
}

ion-segment-view {
  height: unset;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

.scan-badge {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 1;
}

.virtual-list {
  display: block;
  width: 100%;
  height: auto;
  max-height: calc(100vh - 200px); /* Adjust for toolbar and stats height */
  overflow-y: auto;
}

.virtual-list ion-item {
  --min-height: 64px;
  border-bottom: 1px solid var(--ion-color-light);
}

.loading-overlay {
  position: fixed;
  inset: 0; /* covers entire screen */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all; /* ensure it blocks all clicks */
}

.clickable-time {
  text-decoration: underline;
  cursor: pointer;
}

.clickable-image {
  cursor: pointer;
  border-radius: 6px;
}
.image-preview-modal ion-img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.img-preview {
  cursor: pointer;
  position: relative;
}

.qty-badge {
  border-radius: 100%;
  top: -5px;
  right: -1px;
  position: absolute;
  font-size: 10px;
}

.unagg-badge {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 12px;
  padding: 2px 4px;
  z-index: 5;
}
</style>
