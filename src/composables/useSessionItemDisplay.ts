import { translate } from "@common";
import { useProductMaster } from "@/composables/useProductMaster";
import { useProductStore } from "@/stores/productStore";

export function useSessionItemDisplay() {
  function getIdentifierOptionDescription(type: string) {
    const option = [
      ...useProductStore().getProductIdentificationOptions,
      ...useProductStore().getGoodIdentificationOptions
    ].find((identifierOption: any) => identifierOption.goodIdentificationTypeId === type)

    return option?.description || type || translate("Preferred identifier")
  }

  function getResolvedProductIdentifierValue(product: any, type: string) {
    if(!product || !type) {return ""}

    const parsedGoodIds = Array.isArray(product.goodIdentifications)
      ? product.goodIdentifications.map((goodIdentification: any) => {
        if(typeof goodIdentification === "string" && goodIdentification.includes("/")) {
          const [identifierType, value] = goodIdentification.split("/", 2)

          return { type: identifierType?.trim(), value: value?.trim() }
        }

        return goodIdentification
      })
      : []

    const resolve = (identifierType: string) => {
      if(!identifierType) {return ""}
      if(["SKU", "SHOPIFY_PROD_SKU"].includes(identifierType)) {
        return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === "SKU")?.value || ""
      }
      if(identifierType === "internalName") {return product.internalName || ""}
      if(identifierType === "productId") {return product.productId || ""}
      if(identifierType === "parentProductName" || identifierType === "groupName") {return product.parentProductName || ""}
      if(identifierType === "title") {return product.title || ""}
      if(identifierType === "primaryProductCategoryName") {return product.primaryProductCategoryName || ""}

      return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === identifierType)?.value || ""
    }

    return resolve(type)
  }

  function getSessionItemPrimaryDisplay(item: any) {
    const preferredIdentifierType = useProductStore().getPrimaryId
    const preferredValue = getResolvedProductIdentifierValue(item?.product, preferredIdentifierType)

    if(preferredValue) {
      return {
        value: preferredValue,
        isFallback: false,
        preferredDescription: getIdentifierOptionDescription(preferredIdentifierType),
        fallbackDescription: ""
      }
    }

    const fallbackCandidates = [
      {
        value: getResolvedProductIdentifierValue(item?.product, "SKU"),
        description: getIdentifierOptionDescription("SKU")
      },
      {
        value: item?.internalName || item?.product?.internalName || "",
        description: getIdentifierOptionDescription("internalName")
      },
      {
        value: item?.productIdentifier || "",
        description: translate("Imported identifier")
      },
      {
        value: item?.productId || item?.product?.productId || "",
        description: getIdentifierOptionDescription("productId")
      }
    ].find((candidate) => candidate.value && candidate.description !== getIdentifierOptionDescription(preferredIdentifierType))

    return {
      value: fallbackCandidates?.value || "-",
      isFallback: Boolean(fallbackCandidates?.value),
      preferredDescription: getIdentifierOptionDescription(preferredIdentifierType),
      fallbackDescription: fallbackCandidates?.description || ""
    }
  }

  function getSessionItemPrimaryLabel(item: any) {
    return getSessionItemPrimaryDisplay(item).value
  }

  function getSessionItemFallbackMessage(item: any) {
    const display = getSessionItemPrimaryDisplay(item)

    if(!display.isFallback || !display.fallbackDescription) {return ""}

    return translate("Preferred identifier {preferredIdentifier} is unavailable for this item. Showing {fallbackIdentifier} instead.", {
      preferredIdentifier: display.preferredDescription,
      fallbackIdentifier: display.fallbackDescription
    })
  }

  function getSessionItemSecondaryLabel(item: any) {
    const secondaryLabel = item?.secondaryId || useProductMaster().secondaryId(item?.product)
    const primaryLabel = getSessionItemPrimaryLabel(item)

    if(!secondaryLabel || secondaryLabel === primaryLabel) {return ""}

    return secondaryLabel
  }

  return { getSessionItemPrimaryLabel, getSessionItemSecondaryLabel, getSessionItemFallbackMessage, getResolvedProductIdentifierValue };
}
