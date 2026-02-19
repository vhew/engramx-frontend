<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AuthButton from './AuthButton.vue';
import EngramIcon from './icons/EngramIcons.vue';
import logoMark from '../assets/logo-mark.svg';

const props = defineProps<{
  isAuthenticated: boolean;
  isLoading: boolean;
  principal: string | null;
  isGuardianOnly?: boolean;
  isAlsoGuardian?: boolean;
}>();

const emit = defineEmits<{
  login: [];
  logout: [];
}>();

const route = useRoute();
const mobileMenuOpen = ref(false);

const navLinks = computed(() => {
  if (props.isGuardianOnly) {
    return [{ to: '/guardian', label: 'Guardian' }];
  }
  if (props.isAuthenticated) {
    const links = [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/memory', label: 'Memory' },
      { to: '/access', label: 'Access' },
      { to: '/billing', label: 'Billing' },
      { to: '/system', label: 'System' },
    ];
    if (props.isAlsoGuardian) {
      links.push({ to: '/guardian', label: 'Guardian' });
    }
    return links;
  }
  return [];
});

watch(() => route.path, () => {
  mobileMenuOpen.value = false;
});
</script>

<template>
  <nav class="border-b border-gray-800 backdrop-blur-xs sticky top-0 z-50" style="background:rgba(10,14,20,0.9)">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center gap-3 md:gap-8">
          <router-link to="/" class="flex items-center gap-2">
            <img :src="logoMark" alt="EngramX" class="w-8 h-8" />
            <span class="text-lg font-semibold text-white font-mono tracking-wide">EngramX</span>
          </router-link>
          <div class="hidden md:flex items-center gap-1">
            <router-link
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              :class="[
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                route.path === link.to
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
              ]"
            >
              {{ link.label }}
            </router-link>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <AuthButton
            :is-authenticated="isAuthenticated"
            :is-loading="isLoading"
            :principal="principal"
            class="hidden md:block"
            @login="emit('login')"
            @logout="emit('logout')"
          />
          <!-- Mobile hamburger -->
          <button
            class="md:hidden p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <EngramIcon :name="mobileMenuOpen ? 'x' : 'menu'" :size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-800 animate-fade-in">
      <div class="px-3 py-3 space-y-1">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          :class="[
            'block px-3 py-3 rounded-lg text-base font-medium transition-colors',
            route.path === link.to
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
          ]"
        >
          {{ link.label }}
        </router-link>
      </div>
      <div class="border-t border-gray-800 px-4 py-3 flex justify-center">
        <AuthButton
          :is-authenticated="isAuthenticated"
          :is-loading="isLoading"
          :principal="principal"
          @login="emit('login')"
          @logout="emit('logout')"
        />
      </div>
    </div>
  </nav>
</template>
