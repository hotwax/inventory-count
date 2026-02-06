<template>
  <img :src="imageUrl"/>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import defaultImage from "@/assets/images/defaultImage.png";

export default defineComponent({
  name: "Image",
  props: ['src'],
  components: {},
  created() {
    if (
      import.meta.env.VITE_RESOURCE_URL
    ) {
      this.resourceUrl = import.meta.env.VITE_RESOURCE_URL;
    }
  },
  mounted() {
    this.setImageUrl();
  },
  updated() {
    this.setImageUrl();
  },
  data() {
    return {
      resourceUrl: '',
      imageUrl: defaultImage
    }
  },
  methods: {
    checkIfImageExists(src: string) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
          resolve(true);
        }
        img.onerror = function () {
          resolve(false);
        }
        img.src = src;
      })
    },
    setImageUrl() {
      if (this.src) {
        if (this.src.indexOf('assets/') != -1) {
          // Assign directly in case of assets
          this.imageUrl = this.src;
        } else if (this.src.startsWith('http')) {
          // If starts with http, it is web url check for existence and assign
          this.checkIfImageExists(this.src).then((exists) => {
            if (exists) {
              this.imageUrl = this.src;
            } else {
              this.imageUrl = defaultImage;
            }
          })
        } else {
          // Image is from resource server, hence append to base resource url, check for existence and assign
          const imageUrl = this.resourceUrl.concat(this.src)
          this.checkIfImageExists(imageUrl).then(() => {
            this.imageUrl = imageUrl;
          })
        }
      }
    }
  },
});
</script>
