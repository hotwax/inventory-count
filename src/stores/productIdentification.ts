import { defineStore } from "pinia";
import { setProductIdentificationPref, getProductIdentificationPref, fetchGoodIdentificationTypes } from "@/adapter";

export const useProductIdentificationStore = defineStore('productIdentification', {
  state: () => {
    return {
      productIdentificationPref: {
        primaryId: '',
        secondaryId: ''
      },
      productIdentificationOptions: [],
      goodIdentificationOptions: []
    }
  },
  getters: {
    getProductIdentificationPref: (state) => state.productIdentificationPref,
    getProductIdentificationOptions: (state) => state.productIdentificationOptions,
    getGoodIdentificationOptions: (state) => state.goodIdentificationOptions
  },
  actions: {
    async setDxpProductIdentificationPref(id: string, value: string, eComStoreId: string) {
      const productIdentificationPref = JSON.parse(JSON.stringify(this.getProductIdentificationPref))

      // When eComStoreId is not available then make the values change to what selected previously
      if(!eComStoreId) {
        this.productIdentificationPref = productIdentificationPref
        return;
      }

      productIdentificationPref[id] = value

      try {
        this.productIdentificationPref = await setProductIdentificationPref(eComStoreId, productIdentificationPref)
      } catch(err) {
        // TODO: display a toast message in failed scenario
        console.error('error', err)
      }
    },
    async getDxpIdentificationPref(eComStoreId: string) {
      // when selecting none as ecom store, not fetching the pref as it returns all the entries with the pref id
      if(!eComStoreId) {
        return this.productIdentificationPref = {
          primaryId: 'productId',
          secondaryId: ''
        };
      }

      this.productIdentificationPref = await getProductIdentificationPref(eComStoreId)
    },
    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      const fetchedGoodIdentificationTypes = await fetchGoodIdentificationTypes("HC_GOOD_ID_TYPE");
      const fetchedGoodIdentificationOptions = fetchedGoodIdentificationTypes || []
      // Merge the arrays and remove duplicates
      this.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort() as any;
      this.goodIdentificationOptions = fetchedGoodIdentificationOptions
    }
  }
})