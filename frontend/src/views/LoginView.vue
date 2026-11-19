
<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <i class="bi bi-pc-display-horizontal"></i>
      </div>

      <h3>PC Maintenance</h3>
      <p class="text-muted">
        Maintenance Monitoring System
      </p>

      <form @submit.prevent="handleLogin">
        <div class="mb-3">
          <label class="form-label">Username</label>
          <input
            v-model.trim="username"
            type="text"
            class="form-control"
            placeholder="Enter your username"
            autocomplete="username"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-100"
          :disabled="auth.loading"
        >
          <span
            v-if="auth.loading"
            class="spinner-border spinner-border-sm me-2"
          ></span>

          {{ auth.loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="login-footer">
        PC Maintenance Monitoring System
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';

  const result = await auth.login(
    username.value,
    password.value
  );

  if (!result.success) {
    errorMessage.value = result.message;
    return;
  }

  const redirect = route.query.redirect;

  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    await router.push(redirect);
  } else {
    await router.push('/');
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  padding: 40px;
  border-radius: 14px;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
}

.login-logo {
  width: 65px;
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  background: #e8efff;
  color: #2563eb;
  border-radius: 16px;
  font-size: 30px;
}

.login-card h3,
.login-card > p {
  text-align: center;
}

.login-card h3 {
  font-weight: 700;
}

.login-footer {
  margin-top: 30px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}
</style>
