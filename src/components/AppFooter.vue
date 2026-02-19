<template>
  <footer class="border-t border-gray-800 py-8 mt-auto">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-2">
        <p class="text-gray-500 text-sm">EngramX &mdash; <router-link to="/licensing" class="text-gray-400 hover:text-white transition-colors">Licensing</router-link></p>
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/verify" class="text-gray-400 hover:text-white text-sm transition-colors">Verify</router-link>
        <router-link to="/docs" class="text-gray-400 hover:text-white text-sm transition-colors">Docs</router-link>
        <a href="https://github.com/vhew/engramx" class="text-gray-500 hover:text-gray-300 text-sm">GitHub</a>
        <a href="mailto:developer@engramx.ai" class="text-gray-500 hover:text-gray-300 text-sm">Contact</a>
        <a href="https://internetcomputer.org" class="text-gray-500 hover:text-gray-300 text-sm">Powered by ICP</a>
      </div>
    </div>
  </footer>
</template>
