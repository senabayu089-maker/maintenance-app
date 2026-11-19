
<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <i class="bi bi-pc-display me-2"></i>
        PC Maintenance
      </div>

      <div class="sidebar-user">
        <div class="user-avatar">
          {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
        </div>

        <div>
          <div class="fw-semibold">{{ auth.user?.name }}</div>
          <small>{{ auth.user?.role }}</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-link">
          <i class="bi bi-grid me-2"></i>
          Dashboard
        </router-link>

        <router-link
          v-if="auth.isAdmin"
          to="/users"
          class="nav-link"
        >
          <i class="bi bi-people me-2"></i>
          User Management
        </router-link>

        <router-link
          v-if="auth.isAdmin || auth.isTechnician"
          to="/maintenance"
          class="nav-link"
        >
          <i class="bi bi-tools me-2"></i>
          Maintenance
        </router-link>

        <router-link
          to="/schedules"
          class="nav-link"
        >
          <i class="bi bi-calendar-check me-2"></i>
          Jadwal Maintenance
        </router-link>

        <router-link
          to="/annual-schedules"
          class="nav-link"
        >
          <i class="bi bi-calendar3 me-2"></i>
          Jadwal Tahunan
        </router-link>

        <router-link
          to="/assets"
          class="nav-link"
        >
          <i class="bi bi-pc me-2"></i>
          Inventaris Aset
        </router-link>

        <router-link
          to="/asset-categories"
          class="nav-link"
        >
          <i class="bi bi-tags me-2"></i>
          Kategori Aset
        </router-link>

        <router-link
          v-if="auth.isAdmin || auth.isTechnician"
          to="/reports"
          class="nav-link"
        >
          <i class="bi bi-file-earmark-bar-graph me-2"></i>
          Laporan
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <button
          class="btn btn-outline-light w-100"
          @click="handleLogout"
        >
          <i class="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <span>PC Maintenance Monitoring System</span>

        <span class="text-muted small">
          {{ auth.user?.username }}
        </span>
      </header>

      <div class="page-content">
        <router-view />
      </div>

      <footer class="main-footer">
        PC Maintenance Monitoring System
      </footer>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await auth.logout();
  router.push('/login');
};
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #172337;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-brand {
  padding: 24px 20px;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid #334155;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 18px;
  border-bottom: 1px solid #334155;
}

.sidebar-user small {
  color: #94a3b8;
}

.user-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
  border-radius: 50%;
  font-weight: bold;
}

.sidebar-nav {
  padding: 15px 10px;
  flex: 1;
}

.sidebar-nav .nav-link {
  color: #cbd5e1;
  padding: 12px;
  border-radius: 7px;
  margin-bottom: 5px;
}

.sidebar-nav .nav-link:hover,
.sidebar-nav .nav-link.router-link-active {
  background: #334155;
  color: white;
}

.sidebar-bottom {
  padding: 15px;
}

.main-content {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
}

.topbar {
  height: 65px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 25px;
}

.page-content {
  padding: 30px;
  min-height: calc(100vh - 115px);
}

.main-footer {
  padding: 15px 25px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  border-top: 1px solid #e2e8f0;
}

@media (max-width: 768px) {
  .sidebar {
    width: 190px;
  }

  .page-content {
    padding: 15px;
  }
}

@media (max-width: 576px) {
  .app-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .sidebar-nav {
    display: flex;
    flex-wrap: wrap;
  }

  .sidebar-user {
    padding: 12px 18px;
  }
}
</style>
