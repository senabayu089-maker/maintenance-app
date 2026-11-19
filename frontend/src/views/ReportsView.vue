
<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';

const loading = ref(false);
const optionsLoading = ref(false);
const exporting = ref('');
const errorMessage = ref('');

const records = ref([]);
const assets = ref([]);
const technicians = ref([]);

const summary = ref({
  total: 0,
  completed: 0,
  pending: 0,
  inProgress: 0,
  waitingParts: 0,
  cancelled: 0,
});

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
});

const filters = ref({
  startDate: '',
  endDate: '',
  assetId: '',
  technicianId: '',
  maintenanceType: '',
  status: '',
});

const maintenanceTypes = [
  { value: 'PREVENTIVE', label: 'Preventive Maintenance' },
  { value: 'CORRECTIVE', label: 'Corrective Maintenance' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'HARDWARE_UPGRADE', label: 'Hardware Upgrade' },
  { value: 'SOFTWARE_MAINTENANCE', label: 'Software Maintenance' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_PARTS', label: 'Waiting Parts' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const totalPages = computed(() => {
  return Math.max(1, pagination.value.totalPages || 1);
});

const visiblePages = computed(() => {
  const current = pagination.value.page;
  const total = totalPages.value;
  const pages = [];

  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  return pages;
});

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeLabel(value) {
  const type = maintenanceTypes.find((item) => item.value === value);
  return type ? type.label : value || '-';
}

function getStatusLabel(value) {
  const status = statusOptions.find((item) => item.value === value);
  return status ? status.label : value || '-';
}

function getStatusClass(status) {
  const classes = {
    PENDING: 'bg-warning text-dark',
    IN_PROGRESS: 'bg-primary',
    WAITING_PARTS: 'bg-info text-dark',
    COMPLETED: 'bg-success',
    CANCELLED: 'bg-secondary',
  };

  return classes[status] || 'bg-secondary';
}

async function loadOptions() {
  optionsLoading.value = true;

  try {
    const response = await api.get('/reports/options');
    const data = response.data.data || response.data;

    assets.value = data.assets || [];
    technicians.value = data.technicians || [];
  } catch (error) {
    console.error('Gagal memuat opsi laporan:', error);

    errorMessage.value =
      error.response?.data?.message ||
      'Gagal memuat pilihan filter laporan.';
  } finally {
    optionsLoading.value = false;
  }
}

function getFilterParams() {
  const params = {};

  Object.entries(filters.value).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params[key] = value;
    }
  });

  return params;
}

async function loadReport(page = 1) {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params = {
      page,
      limit: pagination.value.limit,
      ...getFilterParams(),
    };

    const response = await api.get('/reports/maintenance', { params });
    const data = response.data.data || response.data;

    records.value = data.records || [];

    summary.value = {
      total: data.summary?.total ?? data.pagination?.total ?? 0,
      completed: data.summary?.completed ?? 0,
      pending: data.summary?.pending ?? 0,
      inProgress: data.summary?.inProgress ?? 0,
      waitingParts: data.summary?.waitingParts ?? 0,
      cancelled: data.summary?.cancelled ?? 0,
    };

    pagination.value = {
      page: data.pagination?.page ?? page,
      limit: data.pagination?.limit ?? pagination.value.limit,
      total: data.pagination?.total ?? 0,
      totalPages: data.pagination?.totalPages ?? 1,
    };
  } catch (error) {
    console.error('Gagal memuat laporan:', error);

    records.value = [];

    errorMessage.value =
      error.response?.data?.message ||
      'Gagal memuat data laporan maintenance.';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  loadReport(1);
}

function resetFilters() {
  filters.value = {
    startDate: '',
    endDate: '',
    assetId: '',
    technicianId: '',
    maintenanceType: '',
    status: '',
  };

  loadReport(1);
}

function changePage(page) {
  if (
    page < 1 ||
    page > totalPages.value ||
    page === pagination.value.page
  ) {
    return;
  }

  loadReport(page);
}

async function getExportErrorMessage(error) {
  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);

      return parsed.message || 'Gagal mengekspor laporan.';
    } catch {
      return 'Gagal mengekspor laporan. Periksa koneksi backend.';
    }
  }

  return (
    responseData?.message ||
    error.message ||
    'Gagal mengekspor laporan.'
  );
}

async function exportReport(format) {
  if (exporting.value) return;

  exporting.value = format;
  errorMessage.value = '';

  try {
    const isPdf = format === 'pdf';

    const endpoint = isPdf
      ? '/reports/maintenance/export/pdf'
      : '/reports/maintenance/export/excel';

    const response = await api.get(endpoint, {
      params: getFilterParams(),
      responseType: 'blob',
    });

    const mimeType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], {
      type: mimeType,
    });

    // Periksa apakah backend mengembalikan pesan error JSON.
    if (
      blob.type.includes('application/json') ||
      blob.type.includes('text/')
    ) {
      const message = await getExportErrorMessage({
        response: { data: blob },
      });

      throw new Error(message);
    }

    const extension = isPdf ? 'pdf' : 'xlsx';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `laporan-maintenance-${date}.${extension}`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error(`Gagal export ${format}:`, error);

    errorMessage.value =
      error.message ||
      await getExportErrorMessage(error);
  } finally {
    exporting.value = '';
  }
}

onMounted(async () => {
  await loadOptions();
  await loadReport(1);
});
</script>

<template>
  <div class="reports-page">
    <!-- Page Header -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Laporan Maintenance</h3>
        <p class="text-muted mb-0">
          Lihat dan pantau riwayat maintenance PC.
        </p>
      </div>

      <!-- Export Buttons -->
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          class="btn btn-outline-danger"
          :disabled="!!exporting"
          @click="exportReport('pdf')"
        >
          <span
            v-if="exporting === 'pdf'"
            class="spinner-border spinner-border-sm me-1"
          ></span>
          <i v-else class="bi bi-file-earmark-pdf me-1"></i>
          {{ exporting === 'pdf' ? 'Mengekspor...' : 'Export PDF' }}
        </button>

        <button
          type="button"
          class="btn btn-outline-success"
          :disabled="!!exporting"
          @click="exportReport('excel')"
        >
          <span
            v-if="exporting === 'excel'"
            class="spinner-border spinner-border-sm me-1"
          ></span>
          <i v-else class="bi bi-file-earmark-excel me-1"></i>
          {{ exporting === 'excel' ? 'Mengekspor...' : 'Export Excel' }}
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="alert alert-danger alert-dismissible fade show"
      role="alert"
    >
      {{ errorMessage }}

      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        @click="errorMessage = ''"
      ></button>
    </div>

    <!-- Summary Cards -->
    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">Total Maintenance</div>
            <div class="summary-value">{{ summary.total }}</div>
            <div class="summary-icon text-primary">
              <i class="bi bi-clipboard-data"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">Completed</div>
            <div class="summary-value text-success">
              {{ summary.completed }}
            </div>
            <div class="summary-icon text-success">
              <i class="bi bi-check-circle"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">Pending</div>
            <div class="summary-value text-warning">
              {{ summary.pending }}
            </div>
            <div class="summary-icon text-warning">
              <i class="bi bi-clock"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">In Progress</div>
            <div class="summary-value text-primary">
              {{ summary.inProgress }}
            </div>
            <div class="summary-icon text-primary">
              <i class="bi bi-arrow-repeat"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">Waiting Parts</div>
            <div class="summary-value text-info">
              {{ summary.waitingParts }}
            </div>
            <div class="summary-icon text-info">
              <i class="bi bi-hourglass-split"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6 col-xl-2">
        <div class="card summary-card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="summary-label">Cancelled</div>
            <div class="summary-value text-secondary">
              {{ summary.cancelled }}
            </div>
            <div class="summary-icon text-secondary">
              <i class="bi bi-x-circle"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-header bg-white py-3">
        <h5 class="fw-bold mb-0">
          <i class="bi bi-funnel me-2"></i>
          Filter Laporan
        </h5>
      </div>

      <div class="card-body">
        <div class="row g-3">
          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">Tanggal Mulai</label>
            <input
              v-model="filters.startDate"
              type="date"
              class="form-control"
            />
          </div>

          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">Tanggal Akhir</label>
            <input
              v-model="filters.endDate"
              type="date"
              class="form-control"
            />
          </div>

          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">PC</label>
            <select
              v-model="filters.assetId"
              class="form-select"
              :disabled="optionsLoading"
            >
              <option value="">Semua PC</option>
              <option
                v-for="asset in assets"
                :key="asset.id"
                :value="String(asset.id)"
              >
                {{ asset.assetCode }} - {{ asset.pcName }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">Teknisi</label>
            <select
              v-model="filters.technicianId"
              class="form-select"
              :disabled="optionsLoading"
            >
              <option value="">Semua Teknisi</option>
              <option
                v-for="technician in technicians"
                :key="technician.id"
                :value="String(technician.id)"
              >
                {{ technician.name }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">Jenis Maintenance</label>
            <select
              v-model="filters.maintenanceType"
              class="form-select"
            >
              <option value="">Semua Jenis</option>
              <option
                v-for="type in maintenanceTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="col-12 col-md-6 col-lg-3">
            <label class="form-label">Status</label>
            <select
              v-model="filters.status"
              class="form-select"
            >
              <option value="">Semua Status</option>
              <option
                v-for="status in statusOptions"
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
          </div>

          <div class="col-12 d-flex align-items-end gap-2 flex-wrap">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="loading"
              @click="applyFilters"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              <i v-else class="bi bi-search me-1"></i>
              Terapkan Filter
            </button>

            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loading"
              @click="resetFilters"
            >
              <i class="bi bi-arrow-counterclockwise me-1"></i>
              Reset Filter
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Table -->
    <div class="card border-0 shadow-sm">
      <div
        class="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <div>
          <h5 class="fw-bold mb-1">Data Maintenance</h5>
          <small class="text-muted">
            Total {{ pagination.total }} data ditemukan
          </small>
        </div>

        <div class="d-flex align-items-center gap-2">
          <label class="small text-muted">Tampilkan</label>

          <select
            v-model.number="pagination.limit"
            class="form-select form-select-sm"
            style="width: 85px"
            @change="loadReport(1)"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>

      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div
            class="spinner-border text-primary mb-2"
            role="status"
          ></div>
          <p class="text-muted mb-0">Memuat laporan...</p>
        </div>

        <div
          v-else-if="records.length === 0"
          class="text-center py-5"
        >
          <i class="bi bi-inbox display-5 text-muted"></i>
          <p class="text-muted mt-2 mb-0">
            Tidak ada data maintenance yang ditemukan.
          </p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">No.</th>
                <th>Kode Maintenance</th>
                <th>Tanggal</th>
                <th>PC</th>
                <th>Lokasi</th>
                <th>Teknisi</th>
                <th>Jenis</th>
                <th>Status</th>
                <th>Hasil</th>
                <th>Tanda Tangan</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(record, index) in records"
                :key="record.id"
              >
                <td class="ps-3">
                  {{
                    (pagination.page - 1) * pagination.limit +
                    index +
                    1
                  }}
                </td>

                <td>
                  <span class="fw-semibold">
                    {{ record.maintenanceCode }}
                  </span>
                </td>

                <td>
                  {{ formatDate(record.maintenanceDate) }}
                </td>

                <td>
                  <div class="fw-semibold">
                    {{ record.asset?.pcName || '-' }}
                  </div>
                  <small class="text-muted">
                    {{ record.asset?.assetCode || '-' }}
                  </small>
                </td>

                <td>
                  {{ record.asset?.location || '-' }}
                </td>

                <td>
                  {{ record.technician?.name || '-' }}
                </td>

                <td>
                  {{ getTypeLabel(record.maintenanceType) }}
                </td>

                <td>
                  <span
                    class="badge"
                    :class="getStatusClass(record.status)"
                  >
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>

                <td>
                  {{ record.result || '-' }}
                </td>

                <td>
                  <div
                    v-if="record.signatures?.length"
                    class="d-flex flex-column gap-1"
                  >
                    <small
                      v-for="signature in record.signatures"
                      :key="signature.id"
                    >
                      <i class="bi bi-pen me-1 text-success"></i>
                      {{ signature.signerName }}
                      <span class="text-muted">
                        ({{ signature.signerRole }})
                      </span>
                    </small>
                  </div>

                  <span v-else class="text-muted small">
                    Belum ada
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && records.length > 0"
        class="card-footer bg-white py-3"
      >
        <div
          class="d-flex justify-content-between align-items-center flex-wrap gap-3"
        >
          <small class="text-muted">
            Halaman {{ pagination.page }} dari {{ totalPages }}
          </small>

          <nav aria-label="Navigasi halaman laporan">
            <ul class="pagination pagination-sm mb-0">
              <li
                class="page-item"
                :class="{ disabled: pagination.page <= 1 }"
              >
                <button
                  class="page-link"
                  type="button"
                  @click="changePage(pagination.page - 1)"
                >
                  Sebelumnya
                </button>
              </li>

              <li
                v-for="page in visiblePages"
                :key="page"
                class="page-item"
                :class="{ active: page === pagination.page }"
              >
                <button
                  class="page-link"
                  type="button"
                  @click="changePage(page)"
                >
                  {{ page }}
                </button>
              </li>

              <li
                class="page-item"
                :class="{ disabled: pagination.page >= totalPages }"
              >
                <button
                  class="page-link"
                  type="button"
                  @click="changePage(pagination.page + 1)"
                >
                  Berikutnya
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-page {
  width: 100%;
}

.summary-card {
  position: relative;
  overflow: hidden;
  min-height: 115px;
}

.summary-label {
  color: #6c757d;
  font-size: 0.82rem;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
}

.summary-icon {
  position: absolute;
  right: 16px;
  bottom: 12px;
  font-size: 2rem;
  opacity: 0.16;
}

.table th {
  white-space: nowrap;
  font-size: 0.82rem;
}

.table td {
  font-size: 0.85rem;
}

.page-link {
  cursor: pointer;
}
</style>
