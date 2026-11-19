
<template>
  <div class="forbidden-page">
    <div class="forbidden-card">
      <div class="icon-wrapper">
        <i class="bi bi-shield-lock"></i>
      </div>

      <h1>403</h1>

      <h4>Access Denied</h4>

      <p>
        You do not have permission to access this page.
        Please contact your administrator if you believe
        this is a mistake.
      </p>

      <router-link to="/" class="btn btn-primary">
        <i class="bi bi-arrow-left me-2"></i>
        Back to Dashboard
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.forbidden-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.forbidden-card {
  width: 100%;
  max-width: 480px;
  text-align: center;
  background: white;
  padding: 45px 35px;
  border-radius: 14px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.06);
}

.icon-wrapper {
  width: 85px;
  height: 85px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  font-size: 38px;
}

.forbidden-card h1 {
  font-size: 58px;
  font-weight: 800;
  color: #dc2626;
  margin-bottom: 5px;
}

.forbidden-card h4 {
  font-weight: 700;
  margin-bottom: 12px;
}

.forbidden-card p {
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 25px;
}
</style>
