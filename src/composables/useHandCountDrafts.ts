import { onUnmounted, ref, watch } from "vue";

interface HandCountDraft { value: string; expectedQuantity: number }
type Drafts = Record<string, HandCountDraft>;

/** Keep unfinished entry separate from saved counts, including across Safari reloads. */
export function useHandCountDrafts(scope: () => string[]) {
  const drafts = ref<Drafts>({});
  const storageFailed = ref(false);
  let key = "";
  let restoring = false;

  function restore() {
    restoring = true;
    try {
      const saved = window.localStorage.getItem(key);
      const parsed = saved ? JSON.parse(saved) : {};
      if(!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
        !Object.values(parsed).every((entry: any) => entry && typeof entry.value === "string" &&
          typeof entry.expectedQuantity === "number" && Number.isFinite(entry.expectedQuantity) && entry.expectedQuantity >= 0)) {
        throw new Error("Invalid handcount draft");
      }
      drafts.value = parsed;
      storageFailed.value = false;
    } catch {
      drafts.value = {};
      storageFailed.value = true;
    } finally {
      restoring = false;
    }
  }

  watch(scope, parts => {
    key = parts.every(Boolean) ? `inventory-count:handcount-drafts:v1:${JSON.stringify(parts)}` : "";
    if(key) {restore();} else {drafts.value = {};}
  }, { immediate: true, flush: "sync" });
  watch(drafts, value => {
    if(restoring || !key) {return;}
    try {
      if(Object.keys(value).length) {window.localStorage.setItem(key, JSON.stringify(value));} else {window.localStorage.removeItem(key);}
      storageFailed.value = false;
    } catch {
      storageFailed.value = true;
    }
  }, { deep: true, flush: "sync" });

  // A save/discard in another tab must not leave an old draft ready to replay here.
  const changed = (event: StorageEvent) => {
    if(event.storageArea === window.localStorage && (event.key === key || event.key === null)) {restore();}
  };
  window.addEventListener("storage", changed);
  onUnmounted(() => window.removeEventListener("storage", changed));

  return { drafts, storageFailed };
}
