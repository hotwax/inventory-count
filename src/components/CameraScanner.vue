<template>
  <ion-modal :is-open="isOpen" class="scanner-modal" @didPresent="onPresent" @didDismiss="onDismiss">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="close" :aria-label="translate('Close scanner')" data-testid="camera-scanner-close-btn">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title data-testid="camera-scanner-title">{{ translate("Scan barcode") }}</ion-title>
        <ion-buttons slot="end" v-if="torchAvailable">
          <ion-button @click="toggleTorch" :aria-label="translate('Toggle flashlight')" data-testid="camera-scanner-torch-btn">
            <ion-icon slot="icon-only" :icon="torchOn ? flash : flashOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cam-content" :scroll-y="false" data-testid="camera-scanner-content">
      <div class="cam-stage">
        <video ref="videoEl" class="cam-video" autoplay playsinline muted></video>
        <div class="cam-scrim"></div>

        <div v-if="cameraError" class="cam-error" data-testid="camera-scanner-error">
          <ion-icon :icon="videocamOffOutline" size="large" color="light" />
          <ion-text color="light">
            <p>{{ translate("Camera unavailable. Allow camera access and use a secure (https) connection.") }}</p>
          </ion-text>
          <ion-button fill="outline" color="light" @click="close">{{ translate("Close") }}</ion-button>
        </div>

        <template v-else>
          <!-- Pending items stay available without closing the camera. -->
          <button v-if="pendingItems.length && !confirmVisible" type="button" class="cam-nextup" data-testid="camera-scanner-nextup" @click="pendingItemsVisible = true">
            <ion-thumbnail v-if="pendingItems[0].imageUrl">
              <Image :src="pendingItems[0].imageUrl" :key="pendingItems[0].imageUrl" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline"><ion-text color="light">{{ translate("Pending items") }} ({{ pendingItems.length }})</ion-text></p>
              <ion-text color="light"><h2>{{ pendingItems[0].primary }}</h2></ion-text>
              <ion-text color="medium"><p v-if="pendingItems[0].secondary">{{ pendingItems[0].secondary }}</p></ion-text>
              <ion-text color="primary"><p>{{ translate("View list") }}</p></ion-text>
            </ion-label>
          </button>

          <ion-popover :is-open="pendingItemsVisible && !confirmVisible" @didDismiss="pendingItemsVisible = false" class="cam-pending-popover" data-testid="camera-scanner-pending-list">
            <ion-content>
              <ion-list-header>{{ translate("Pending items") }} ({{ pendingItems.length }})</ion-list-header>
              <ion-list>
                <ion-item v-for="item in pendingItems" :key="item.primary" lines="full">
                  <ion-thumbnail slot="start" v-if="item.imageUrl">
                    <Image :src="item.imageUrl" :key="item.imageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ item.primary }}</h2>
                    <p v-if="item.secondary">{{ item.secondary }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-content>
          </ion-popover>

          <!-- Reticle -->
          <div class="reticle" aria-hidden="true">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
            <span class="laser"></span>
          </div>

          <!-- Rapid-scan feedback keeps the last saved scan and the cooldown in one place. -->
          <div v-if="rapidScanFeedback && !confirmVisible" class="cam-rapid-feedback" data-testid="camera-scanner-rapid-scan-result">
            <ion-item lines="none" color="dark">
              <ion-thumbnail slot="start" v-if="rapidScanFeedback.imageUrl">
                <Image :src="rapidScanFeedback.imageUrl" :key="rapidScanFeedback.imageUrl" />
              </ion-thumbnail>
              <ion-label>
                <p v-if="rapidScanFeedback.isDuplicate" data-testid="camera-scanner-duplicate">{{ translate("Already saved — move to the next item") }}</p>
                <p v-else>{{ translate("Scan saved") }}</p>
                <h2>{{ rapidScanFeedback.primary }}</h2>
                <p>{{ rapidScanFeedback.savedScanCount }} {{ translate("saved") }}</p>
              </ion-label>
              <ion-badge slot="end" color="success">{{ rapidScanFeedback.savedScanCount }}</ion-badge>
            </ion-item>
            <ion-progress-bar :value="cooldownProgress" color="primary" data-testid="camera-scanner-cooldown-progress" />
            <ion-text color="light" class="cam-cooldown-copy">
              <p>{{ translate("Move to the next item — this barcode is ready again in") }} {{ cooldownSeconds }}s</p>
            </ion-text>
          </div>
        </template>
      </div>
    </ion-content>

    <ion-footer v-if="!cameraError">
      <ion-toolbar>
        <!-- Confirm-each sheet -->
        <div v-if="confirmVisible" class="cam-confirm" data-testid="camera-scanner-confirm">
          <ion-item lines="none">
            <ion-thumbnail slot="start" v-if="confirmProduct?.imageUrl">
              <Image :src="confirmProduct.imageUrl" :key="confirmProduct.imageUrl" />
            </ion-thumbnail>
            <ion-label>
              <h2 data-testid="camera-scanner-confirm-name">{{ confirmProduct?.primary || confirmCode }}</h2>
              <p v-if="confirmProduct?.secondary">{{ confirmProduct.secondary }}</p>
              <p v-if="!confirmProduct">{{ translate("Identifying product...") }}</p>
              <p v-else>{{ translate("{count} counted so far", { count: confirmProduct.countedSoFar || 0 }) }}</p>
            </ion-label>
          </ion-item>
          <div class="cam-stepper">
            <ion-button fill="outline" @click="decQty" :aria-label="translate('Decrease quantity')" data-testid="camera-scanner-qty-dec">
              <ion-icon slot="icon-only" :icon="removeOutline" />
            </ion-button>
            <h1 data-testid="camera-scanner-qty">{{ confirmQty }}</h1>
            <ion-button fill="outline" @click="incQty" :aria-label="translate('Increase quantity')" data-testid="camera-scanner-qty-inc">
              <ion-icon slot="icon-only" :icon="addOutline" />
            </ion-button>
          </div>
          <div class="cam-confirm-actions">
            <ion-button expand="block" :disabled="isConfirmSaving" @click="confirmAdd" data-testid="camera-scanner-confirm-add">
              {{ translate("Add {count} units", { count: confirmQty }) }}
            </ion-button>
            <ion-button fill="clear" color="medium" :disabled="isConfirmSaving" @click="confirmDiscard" data-testid="camera-scanner-confirm-discard">
              {{ translate("Discard") }}
            </ion-button>
          </div>
        </div>

        <!-- Mode selector -->
        <div v-else class="cam-modes">
          <ion-segment :value="currentMode" @ionChange="onModeChange" data-testid="camera-scanner-mode-segment">
            <ion-segment-button value="rapid" data-testid="camera-scanner-mode-rapid">
              <ion-label>{{ translate("Rapid scan") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="confirm" data-testid="camera-scanner-mode-confirm">
              <ion-label>{{ translate("Confirm each") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-text color="medium" class="cam-hints">
            <p class="cam-hint" :class="{ 'is-active': currentMode === 'rapid' }" :aria-hidden="currentMode !== 'rapid'">
              {{ rapidModeHint }}
            </p>
            <p class="cam-hint" :class="{ 'is-active': currentMode === 'confirm' }" :aria-hidden="currentMode !== 'confirm'">
              {{ confirmModeHint }}
            </p>
          </ion-text>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonFooter, IonItem, IonLabel, IonText, IonThumbnail, IonSegment, IonSegmentButton, IonList, IonListHeader, IonBadge, IonProgressBar, IonPopover } from '@ionic/vue';
import { closeOutline, flash, flashOutline, videocamOffOutline, addOutline, removeOutline } from 'ionicons/icons';
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { translate } from '@common';
import Image from '@/components/Image.vue';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

interface ResolvedProduct { primary: string; secondary?: string; imageUrl?: string; countedSoFar?: number }
interface PendingItem { primary: string; secondary?: string; imageUrl?: string }
interface ScanSaveResult { saved: boolean; savedScanCount?: number }
interface RapidScanFeedback extends PendingItem { code: string; savedScanCount: number; isDuplicate: boolean }

const props = withDefaults(defineProps<{
  isOpen: boolean;
  mode?: 'rapid' | 'confirm';
  pendingItems?: PendingItem[];
  resolveProduct?: ((code: string) => Promise<ResolvedProduct | null>) | null;
  recordScan?: ((code: string, quantity: number) => Promise<boolean | ScanSaveResult>) | null;
}>(), {
  mode: 'rapid',
  pendingItems: () => [],
  resolveProduct: null,
  recordScan: null,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const currentMode = ref<'rapid' | 'confirm'>(props.mode);
const cameraError = ref(false);
const torchAvailable = ref(false);
const torchOn = ref(false);

// Confirm-each state
const confirmVisible = ref(false);
const confirmCode = ref('');
const confirmQty = ref(1);
const confirmProduct = ref<ResolvedProduct | null>(null);
const isConfirmSaving = ref(false);

const pendingItemsVisible = ref(false);
const rapidScanFeedback = ref<RapidScanFeedback | null>(null);
const cooldownProgress = ref(0);
const cooldownSeconds = ref(0);

let controls: IScannerControls | null = null;
let cameraGeneration = 0;
const cooldown = new Map<string, number>();
const pendingCodes = new Set<string>();
const COOLDOWN_MS = 2600;
let cooldownTimer: ReturnType<typeof setTimeout> | undefined;
let cooldownProgressTimer: ReturnType<typeof setInterval> | undefined;

const rapidModeHint = computed(() => translate("Each detection adds one unit. The same barcode is paused briefly so holding it in frame never double counts."));
const confirmModeHint = computed(() => translate("Review the product and quantity after each scan before adding it."));

watch(() => props.mode, (value) => { currentMode.value = value; });

function onModeChange(event: any) {
  currentMode.value = event.detail.value;
  resetConfirm();
}

async function onPresent() {
  await startCamera();
}

function onDismiss() {
  stopCamera();
  emit('close');
}

function close() {
  // Triggers ion-modal dismissal via :is-open binding in the parent.
  emit('close');
}

async function startCamera() {
  const generation = ++cameraGeneration;
  cameraError.value = false;
  const video = videoEl.value;
  if (!video) {
    cameraError.value = true;
    return;
  }
  try {
    const activeReader = new BrowserMultiFormatReader(undefined, { delayBetweenScanSuccess: 600, delayBetweenScanAttempts: 120 });
    const activeControls = await activeReader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      video,
      (result: any) => { if (result) handleDecode(result.getText()); }
    );
    // The modal may have been dismissed while the camera was warming up; release it immediately if so.
    if (generation !== cameraGeneration || !props.isOpen) {
      try { activeControls.stop(); } catch (e) { /* ignore */ }
      return;
    }
    controls = activeControls;
    detectTorch();
  } catch (err) {
    if (generation !== cameraGeneration) return;
    console.error('Camera [Component: CameraScanner] - Failed to start', err);
    cameraError.value = true;
  }
}

function stopCamera() {
  cameraGeneration += 1;
  try { controls?.stop(); } catch (e) { /* ignore */ }
  controls = null;
  torchOn.value = false;
  torchAvailable.value = false;
  clearCooldownFeedback();
  pendingItemsVisible.value = false;
  cooldown.clear();
  resetConfirm();
}

function getVideoTrack() {
  const stream = videoEl.value?.srcObject;
  return stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
}

function detectTorch() {
  try {
    const track = getVideoTrack();
    if (!track || typeof track.getCapabilities !== 'function') {
      torchAvailable.value = false;
      return;
    }
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    torchAvailable.value = capabilities.torch === true;
  } catch (e) {
    torchAvailable.value = false;
  }
}

async function toggleTorch() {
  const track = getVideoTrack();
  if (!track || !torchAvailable.value) return;
  const nextTorchState = !torchOn.value;
  try {
    await track.applyConstraints({
      advanced: [{ torch: nextTorchState }],
    } as MediaTrackConstraints);
    torchOn.value = nextTorchState;
  } catch (e) {
    torchOn.value = false;
    torchAvailable.value = false;
  }
}

async function handleDecode(code: string) {
  if (!code) return;
  const now = Date.now();

  if (currentMode.value === 'rapid') {
    if (pendingCodes.has(code)) return;
    const until = cooldown.get(code);
    if (until && now < until) {
      flashDuplicate();
      return;
    }
    pendingCodes.add(code);
    try {
      const recordResult = await props.recordScan?.(code, 1);
      const saved = typeof recordResult === 'boolean' ? recordResult : recordResult?.saved;
      if (saved) {
        const savedScanCount = typeof recordResult === 'object'
          ? recordResult.savedScanCount
          : undefined;
        startCooldown(code, savedScanCount);
      }
    } finally {
      pendingCodes.delete(code);
    }
    return;
  }

  // Confirm each: ignore further detections while a confirm sheet is open.
  if (confirmVisible.value) return;
  openConfirm(code);
}

async function openConfirm(code: string) {
  confirmVisible.value = true;
  confirmCode.value = code;
  confirmQty.value = 1;
  confirmProduct.value = null;
  if (props.resolveProduct) {
    try {
      confirmProduct.value = await props.resolveProduct(code);
    } catch (e) {
      confirmProduct.value = null;
    }
  }
}

function incQty() { confirmQty.value += 1; }
function decQty() { confirmQty.value = Math.max(1, confirmQty.value - 1); }

async function confirmAdd() {
  if (isConfirmSaving.value) return;

  isConfirmSaving.value = true;
  try {
    const code = confirmCode.value;
    const recorded = await props.recordScan?.(code, confirmQty.value);
    if (recorded) {
      resetConfirm();
    }
  } finally {
    isConfirmSaving.value = false;
  }
}

function confirmDiscard() { resetConfirm(); }

function resetConfirm() {
  isConfirmSaving.value = false;
  confirmVisible.value = false;
  confirmCode.value = '';
  confirmQty.value = 1;
  confirmProduct.value = null;
}

function startCooldown(code: string, savedScanCount?: number) {
  const until = Date.now() + COOLDOWN_MS;
  const existingCount = rapidScanFeedback.value?.code === code
    ? rapidScanFeedback.value.savedScanCount
    : 0;
  cooldown.set(code, until);
  rapidScanFeedback.value = {
    code,
    primary: code,
    savedScanCount: savedScanCount ?? existingCount + 1,
    isDuplicate: false,
  };
  updateCooldownProgress(until);
  clearTimeout(cooldownTimer);
  clearInterval(cooldownProgressTimer);
  cooldownProgressTimer = setInterval(() => updateCooldownProgress(until), 50);
  cooldownTimer = setTimeout(() => {
    clearCooldownFeedback();
  }, COOLDOWN_MS);
  void resolveRapidScanProduct(code);
}

function updateCooldownProgress(until: number) {
  const remainingMs = Math.max(0, until - Date.now());
  cooldownProgress.value = remainingMs / COOLDOWN_MS;
  cooldownSeconds.value = Math.max(1, Math.ceil(remainingMs / 1000));
}

async function resolveRapidScanProduct(code: string) {
  if (!props.resolveProduct) return;
  try {
    const product = await props.resolveProduct(code);
    if (product && rapidScanFeedback.value?.code === code) {
      rapidScanFeedback.value = {
        ...rapidScanFeedback.value,
        primary: product.primary,
        secondary: product.secondary,
        imageUrl: product.imageUrl,
      };
    }
  } catch (e) {
    // The barcode and saved count are still useful if product resolution is temporarily unavailable.
  }
}

function flashDuplicate() {
  if (rapidScanFeedback.value) {
    rapidScanFeedback.value = { ...rapidScanFeedback.value, isDuplicate: true };
  }
}

function clearCooldownFeedback() {
  clearTimeout(cooldownTimer);
  clearInterval(cooldownProgressTimer);
  cooldownTimer = undefined;
  cooldownProgressTimer = undefined;
  rapidScanFeedback.value = null;
  cooldownProgress.value = 0;
  cooldownSeconds.value = 0;
}

onBeforeUnmount(() => { stopCamera(); });
</script>

<style scoped>
.scanner-modal {
  --background: #000;
  --width: 100%;
  --height: 100%;
}

.cam-content {
  --background: #000;
}

.cam-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.cam-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cam-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.cam-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacer-sm);
  padding: var(--spacer-base);
  text-align: center;
}

.cam-nextup {
  position: absolute;
  top: var(--spacer-xs);
  inset-inline: var(--spacer-sm);
  width: calc(100% - (2 * var(--spacer-sm)));
  display: flex;
  align-items: center;
  gap: var(--spacer-xs);
  padding: var(--spacer-xs);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.72);
  border: 0;
  text-align: start;
  z-index: 2;
}

.cam-nextup ion-thumbnail {
  --size: 40px;
}

.reticle {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  width: min(280px, 72vw);
  height: 180px;
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 28px;
  height: 28px;
}

.tl {
  left: 0;
  top: 0;
  border-left: 3px solid var(--ion-color-light);
  border-top: 3px solid var(--ion-color-light);
  border-start-start-radius: 8px;
}

.tr {
  right: 0;
  top: 0;
  border-right: 3px solid var(--ion-color-light);
  border-top: 3px solid var(--ion-color-light);
  border-start-end-radius: 8px;
}

.bl {
  left: 0;
  bottom: 0;
  border-left: 3px solid var(--ion-color-light);
  border-bottom: 3px solid var(--ion-color-light);
  border-end-start-radius: 8px;
}

.br {
  right: 0;
  bottom: 0;
  border-right: 3px solid var(--ion-color-light);
  border-bottom: 3px solid var(--ion-color-light);
  border-end-end-radius: 8px;
}

.laser {
  position: absolute;
  inset-inline: 8px;
  height: 2px;
  top: 12%;
  border-radius: 1px;
  background: var(--ion-color-danger);
  animation: camScan 2.2s ease-in-out infinite;
}

@keyframes camScan {
  0%, 100% { top: 12%; }
  50% { top: 84%; }
}

.cam-pending-popover {
  --width: min(360px, calc(100vw - (2 * var(--spacer-sm))));
  --max-height: min(420px, 60vh);
}

.cam-rapid-feedback {
  position: absolute;
  inset-inline: var(--spacer-sm);
  bottom: var(--spacer-sm);
  z-index: 2;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.86);
}

.cam-rapid-feedback ion-item {
  --background: transparent;
  --color: var(--ion-color-light);
}

.cam-rapid-feedback ion-thumbnail {
  --size: 40px;
}

.cam-cooldown-copy {
  display: block;
  padding: 0 var(--spacer-xs);
  text-align: center;
}

.cam-confirm {
  padding: var(--spacer-xs);
}

.cam-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacer-base);
}

.cam-confirm-actions {
  display: flex;
  align-items: center;
  gap: var(--spacer-xs);
}

.cam-confirm-actions > ion-button:first-child {
  flex: 1;
}

.cam-modes {
  padding-inline: var(--spacer-xs);
}

.cam-hints {
  display: grid;
}

.cam-hint {
  grid-area: 1 / 1;
  text-align: center;
  visibility: hidden;
}

.cam-hint.is-active {
  visibility: visible;
}
</style>
