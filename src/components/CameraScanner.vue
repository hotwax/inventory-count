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
          <!-- Next up (directed counts) -->
          <div v-if="nextUp && !confirmVisible" class="cam-nextup" data-testid="camera-scanner-nextup">
            <ion-thumbnail v-if="nextUp.imageUrl">
              <Image :src="nextUp.imageUrl" :key="nextUp.imageUrl" />
            </ion-thumbnail>
            <ion-label>
              <p class="overline"><ion-text color="light">{{ translate("Next up") }}</ion-text></p>
              <ion-text color="light"><h2>{{ nextUp.primary }}</h2></ion-text>
              <ion-text color="medium"><p v-if="nextUp.secondary">{{ nextUp.secondary }}</p></ion-text>
            </ion-label>
          </div>

          <!-- Reticle -->
          <div class="reticle" aria-hidden="true">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
            <span class="laser"></span>
          </div>

          <!-- Transient feedback -->
          <div class="cam-feedback">
            <ion-chip v-if="cooledName" color="success" data-testid="camera-scanner-cooldown">
              <ion-icon :icon="checkmarkCircle" />
              <ion-label>{{ cooledName }} {{ translate("counted") }}</ion-label>
            </ion-chip>
            <ion-chip v-if="showDupFlag" color="warning" data-testid="camera-scanner-duplicate">
              <ion-icon :icon="handLeftOutline" />
              <ion-label>{{ translate("Same barcode, not double counted") }}</ion-label>
            </ion-chip>
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
import { IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonFooter, IonItem, IonLabel, IonText, IonThumbnail, IonChip, IonSegment, IonSegmentButton } from '@ionic/vue';
import { closeOutline, flash, flashOutline, videocamOffOutline, checkmarkCircle, handLeftOutline, addOutline, removeOutline } from 'ionicons/icons';
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { translate } from '@common';
import Image from '@/components/Image.vue';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

interface ResolvedProduct { primary: string; secondary?: string; imageUrl?: string; countedSoFar?: number }
interface NextUpProduct { primary: string; secondary?: string; imageUrl?: string }

const props = withDefaults(defineProps<{
  isOpen: boolean;
  mode?: 'rapid' | 'confirm';
  nextUp?: NextUpProduct | null;
  resolveProduct?: ((code: string) => Promise<ResolvedProduct | null>) | null;
  recordScan?: ((code: string, quantity: number) => Promise<boolean>) | null;
}>(), {
  mode: 'rapid',
  nextUp: null,
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

// Transient feedback
const cooledName = ref('');
const showDupFlag = ref(false);

let controls: IScannerControls | null = null;
let stopRequested = false;
const cooldown = new Map<string, number>();
const pendingCodes = new Set<string>();
const COOLDOWN_MS = 2600;
let cooledTimer: any = null;
let dupTimer: any = null;

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
  cameraError.value = false;
  stopRequested = false;
  try {
    const activeReader = new BrowserMultiFormatReader(undefined, { delayBetweenScanSuccess: 600, delayBetweenScanAttempts: 120 });
    const activeControls = await activeReader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      videoEl.value as HTMLVideoElement,
      (result: any) => { if (result) handleDecode(result.getText()); }
    );
    // The modal may have been dismissed while the camera was warming up; release it immediately if so.
    if (stopRequested || !props.isOpen) {
      try { activeControls.stop(); } catch (e) { /* ignore */ }
      return;
    }
    controls = activeControls;
    detectTorch();
  } catch (err) {
    console.error('[CameraScanner] Failed to start camera', err);
    cameraError.value = true;
  }
}

function stopCamera() {
  stopRequested = true;
  try { controls?.stop(); } catch (e) { /* ignore */ }
  controls = null;
  torchOn.value = false;
  torchAvailable.value = false;
  clearTimeout(cooledTimer);
  clearTimeout(dupTimer);
  cooledName.value = '';
  showDupFlag.value = false;
  cooldown.clear();
  resetConfirm();
}

function detectTorch() {
  try {
    const capabilities: any = controls?.streamVideoCapabilitiesGet?.((track: MediaStreamTrack) => [track]);
    torchAvailable.value = Boolean(capabilities && 'torch' in capabilities && capabilities.torch);
  } catch (e) {
    torchAvailable.value = false;
  }
}

async function toggleTorch() {
  if (!controls?.switchTorch) return;
  torchOn.value = !torchOn.value;
  try {
    await controls.switchTorch(torchOn.value);
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
      const recorded = await props.recordScan?.(code, 1);
      if (recorded) {
        cooldown.set(code, Date.now() + COOLDOWN_MS);
        flashCooled(code);
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
      flashCooled(code);
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

function flashCooled(code: string) {
  clearTimeout(cooledTimer);
  cooledName.value = (confirmProduct.value?.primary) || code;
  cooledTimer = setTimeout(() => { cooledName.value = ''; }, COOLDOWN_MS);
}

function flashDuplicate() {
  clearTimeout(dupTimer);
  showDupFlag.value = true;
  dupTimer = setTimeout(() => { showDupFlag.value = false; }, 1100);
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
  display: flex;
  align-items: center;
  gap: var(--spacer-xs);
  padding: var(--spacer-xs);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.72);
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

.cam-feedback {
  position: absolute;
  inset-inline: 0;
  bottom: var(--spacer-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacer-2xs);
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
