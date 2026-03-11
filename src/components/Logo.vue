<template>
  <figure data-testid="logo-container">
    <img class="light" src="../assets/images/LogoLight.png" data-testid="logo-light"/>
    <img class="dark" src="../assets/images/LogoDark.png" data-testid="logo-dark"/>
  </figure>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: "Logo",
})
</script>

<style scoped>
.dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .dark {
    display: unset;
  }
  
  .light {
    display: none;
  }
}
</style>