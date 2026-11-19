
<template>
  <div>
    <!-- HEADER -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Dashboard</h3>
        <p class="text-muted mb-0">
          Welcome back, {{ auth.user?.name || 'User' }}.
        </p>
      </div>

      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="loading"
        @click="loadDashboard"
      >
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-2"
        ></span>
        <i v-else class="bi bi-arrow-clockwise me-2"></i>
        Refresh
      </button>
    </div>

    <!-- ERROR MESSAGE -->
    <div
      v-if="errorMessage"
      class="alert alert-danger d-flex justify-content-between align-items-center"
      role="alert"
    >
      <span>{{ errorMessage }}</span>

      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        @click="errorMessage = ''"
      ></button>
    </div>

    <!-- ACCOUNT INFORMATION -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card dashboard-card h-100">
          <div class="card-body">
            <div class="text-muted">Your Role</div>
            <h5 class="fw-bold mt-2 mb-0">
              {{ auth.userRole }}
            </h5>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card dashboard-card h-100">
          <div class="card-body">
            <div class="text-muted">Account</div>
            <h5 class="fw-bold mt-2 mb-0">
              {{ auth.user?.isActive === false ? 'Inactive' : 'Active' }}
            </h5>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card dashboard-card h-100">
          <div class="card-body">
            <div class="text-muted">Username</div>
            <h5 class="fw-bold mt-2 mb-0">
              {{ auth.user?.username || '-' }}
            </h5>
          </div>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading && !dashboard" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div
          class="spinner-border text-primary mb-3"
          role="status"
        ></div>
        <p class="text-muted mb-0">
          Loading dashboard data...
        </p>
      </div>
    </div>

    <template v-else>
      <!-- ASSET SUMMARY -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold mb-0">Asset Overview</h5>
        <span class="text-muted small">
          Total Aset: {{ dashboard?.assets?.total ?? 0 }}
        </span>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="summary-icon bg-primary-subtle text-primary">
                <i class="bi bi-box-seam"></i>
              </div>
              <div class="text-muted small mt-3">Total Aset</div>
              <h3 class="fw-bold mb-0">
                {{ dashboard?.assets?.total ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="summary-icon bg-success-subtle text-success">
                <i class="bi bi-check-circle"></i>
              </div>
              <div class="text-muted small mt-3">Active</div>
              <h3 class="fw-bold mb-0">
                {{ dashboard?.assets?.active ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="summary-icon bg-warning-subtle text-warning">
                <i class="bi bi-tools"></i>
              </div>
              <div class="text-muted small mt-3">Maintenance</div>
              <h3 class="fw-bold mb-0">
                {{ dashboard?.assets?.maintenance ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="summary-icon bg-danger-subtle text-danger">
                <i class="bi bi-exclamation-triangle"></i>
              </div>
              <div class="text-muted small mt-3">Broken</div>
              <h3 class="fw-bold mb-0">
                {{ dashboard?.assets?.broken ?? 0 }}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <!-- MAINTENANCE SUMMARY -->
      <h5 class="fw-bold mb-3">Maintenance Overview</h5>

      <div class="row g-3 mb-4">
        <div class="col-6 col-lg">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="text-muted small">Pending</div>
              <h3 class="fw-bold mt-2 mb-0">
                {{ dashboard?.maintenance?.pending ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="text-muted small">In Progress</div>
              <h3 class="fw-bold mt-2 mb-0">
                {{ dashboard?.maintenance?.inProgress ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="text-muted small">Waiting Parts</div>
              <h3 class="fw-bold mt-2 mb-0">
                {{ dashboard?.maintenance?.waitingParts ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="text-muted small">Completed</div>
              <h3 class="fw-bold mt-2 mb-0 text-success">
                {{ dashboard?.maintenance?.completed ?? 0 }}
              </h3>
            </div>
          </div>
        </div>

        <div class="col-6 col-lg">
          <div class="card summary-card h-100">
            <div class="card-body">
              <div class="text-muted small">Cancelled</div>
              <h3 class="fw-bold mt-2 mb-0 text-danger">
                {{ dashboard?.maintenance?.cancelled ?? 0 }}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <!-- SCHEDULE SUMMARY -->
      <h5 class="fw-bold mb-3">Maintenance Schedule</h5>

      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="card summary-card h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="summary-icon bg-primary-subtle text-primary">
                <i class="bi bi-calendar-check"></i>
              </div>

              <div>
                <div class="text-muted small">Scheduled</div>
                <h3 class="fw-bold mb-0">
                  {{ dashboard?.schedules?.scheduled ?? 0 }}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card summary-card h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="summary-icon bg-danger-subtle text-danger">
                <i class="bi bi-calendar-x"></i>
              </div>

              <div>
                <div class="text-muted small">Overdue</div>
                <h3 class="fw-bold mb-0 text-danger">
                  {{ dashboard?.schedules?.overdue ?? 0 }}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- UPCOMING SCHEDULES -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white border-0 pt-4 px-4">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-calendar-event me-2 text-primary"></i>
            Upcoming Maintenance
          </h5>
        </div>

        <div class="card-body p-0">
          <div
            v-if="!dashboard?.schedules?.upcoming?.length"
            class="text-center text-muted py-4"
          >
            No upcoming maintenance schedules.
          </div>

          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-4">Schedule</th>
                  <th>Aset</th>
                  <th>Kategori</th>
                  <th>Location</th>
                  <th>Scheduled Date</th>
                  <th class="pe-4">Status</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="schedule in dashboard.schedules.upcoming"
                  :key="schedule.id"
                >
                  <td class="ps-4">
                    <div class="fw-semibold">
                      {{ schedule.title }}
                    </div>
                    <small class="text-muted">
                      {{ schedule.description || '-' }}
                    </small>
                  </td>

                  <td>
                    <div class="fw-semibold">
                      {{ schedule.asset?.assetCode || '-' }}
                    </div>
                    <small class="text-muted">
                      {{ schedule.asset?.name || '-' }}
                    </small>
                  </td>

                  <td>
                    {{ schedule.asset?.category?.name || '-' }}
                  </td>

                  <td>
                    {{ schedule.asset?.location || '-' }}
                  </td>

                  <td>
                    {{ formatDate(schedule.scheduledDate) }}
                  </td>

                  <td class="pe-4">
                    <span class="badge text-bg-primary">
                      Scheduled
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- RECENT MAINTENANCE -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white border-0 pt-4 px-4">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-clock-history me-2 text-primary"></i>
            Recent Maintenance
          </h5>
        </div>

        <div class="card-body p-0">
          <div
            v-if="!dashboard?.recentMaintenance?.length"
            class="text-center text-muted py-4"
          >
            No maintenance records found.
          </div>

          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-4">Maintenance Code</th>
                  <th>Aset</th>
                  <th>Kategori</th>
                  <th>Technician</th>
                  <th>Date</th>
                  <th class="pe-4">Status</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="record in dashboard.recentMaintenance"
                  :key="record.id"
                >
                  <td class="ps-4 fw-semibold">
                    {{ record.maintenanceCode }}
                  </td>

                  <td>
                    <div class="fw-semibold">
                      {{ record.asset?.assetCode || '-' }}
                    </div>
                    <small class="text-muted">
                      {{ record.asset?.name || '-' }}
                    </small>
                  </td>

                  <td>
                    {{ record.asset?.category?.name || '-' }}
                  </td>

                  <td>
                    {{ record.technician?.name || '-' }}
                  </td>

                  <td>
                    {{ formatDate(record.maintenanceDate) }}
                  </td>

                  <td class="pe-4">
                    <span
                      class="badge"
                      :class="maintenanceStatusClass(record.status)"
                    >
                      {{ maintenanceStatusLabel(record.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ROLE INFORMATION -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <template v-if="auth.isAdmin">
            <h5 class="fw-bold">Administrator Panel</h5>
            <p class="text-muted mb-0">
              You have access to user management, asset inventory,
              asset categories, maintenance records, schedules and reports.
            </p>
          </template>

          <template v-else-if="auth.isTechnician">
            <h5 class="fw-bold">Technician Workspace</h5>
            <p class="text-muted mb-0">
              You can manage asset inventory, maintenance tasks,
              maintenance records and schedules.
            </p>
          </template>

          <template v-else>
            <h5 class="fw-bold">User Workspace</h5>
            <p class="text-muted mb-0">
              You can view relevant asset information
              and maintenance history.
            </p>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const auth = useAuthStore();

const loading = ref(false);
const errorMessage = ref('');

const dashboard = ref(null);

// ==========================================
// LOAD DASHBOARD
// ==========================================

const loadDashboard = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/dashboard');

    dashboard.value = response.data.data;
  } catch (error) {
    console.error('Dashboard error:', error);

    errorMessage.value =
      error.response?.data?.message ||
      'Failed to load dashboard data.';
  } finally {
    loading.value = false;
  }
};

// ==========================================
// FORMAT DATE
// ==========================================

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

// ==========================================
// MAINTENANCE STATUS
// ==========================================

const maintenanceStatusLabel = (status) => {
  const labels = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    WAITING_PARTS: 'Waiting Parts',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return labels[status] || status || '-';
};

const maintenanceStatusClass = (status) => {
  const classes = {
    PENDING: 'text-bg-secondary',
    IN_PROGRESS: 'text-bg-primary',
    WAITING_PARTS: 'text-bg-warning',
    COMPLETED: 'text-bg-success',
    CANCELLED: 'text-bg-danger',
  };

  return classes[status] || 'text-bg-secondary';
};

// ==========================================
// INITIALIZATION
// ==========================================

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
.dashboard-card,
.summary-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.card-header {
  border-radius: 12px 12px 0 0 !important;
}

.table th {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6c757d;
  white-space: nowrap;
}

.table td {
  font-size: 0.9rem;
}

.badge {
  font-weight: 500;
  padding: 0.45rem 0.65rem;
}
</style>
