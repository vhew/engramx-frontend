import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useAuth } from './composables/useAuth';
import './styles/global.css';

const app = createApp(App);

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const { isAuthenticated, isLoading } = useAuth();
    // Wait for auth state to resolve before making a decision
    if (isLoading.value) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isLoading.value) {
            resolve();
            return;
          }
          setTimeout(check, 50);
        };
        check();
      });
    }
    if (!isAuthenticated.value) return '/';
  }
});

app.config.errorHandler = (err, _instance, info) => {
  console.error(`[Vue error] ${info}:`, err);
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled promise rejection]:', event.reason);
});

app.use(router);
app.mount('#root');

// Register PWA service worker — skip on local replica (*.localhost:4943)
const isLocal = location.hostname.endsWith('.localhost') || location.hostname === 'localhost';
if (!isLocal) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        onRegisteredSW(_swUrl, registration) {
          if (registration) {
            setInterval(() => {
              registration.update();
            }, 60_000);
          }
        },
        onOfflineReady() {
          console.log('[SW] App ready for offline use.');
        },
      });
    })
    .catch(() => {});
}
