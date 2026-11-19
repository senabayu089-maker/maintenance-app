
<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const detailLoading = ref(false);
const processingId = ref(null);

const errorMessage = ref('');
const successMessage = ref('');

const schedules = ref([]);
const assets = ref([]);

const search = ref('');
const statusFilter = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalRecords = ref(0);

const showForm = ref(false);
const showDetail = ref(false);
const isEditMode = ref(false);
const selectedSchedule = ref(null);

const canManage = computed(() => auth.isAdmin || auth.isTechnician);

const statuses = [
  { value: 'SCHEDULED', label: 'Terjadwal' },
  { value: 'OVERDUE', label: 'Terlambat' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

function defaultForm() {
  return {
    id: null,
    assetId: '',
    title: '',
    description: '',
    scheduledDate: '',
    repeatMonths: '',
  };
}

const form = ref(defaultForm());

function extractList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.items)) return responseData.items;
  return [];
}

function extractMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatDate(value) {
  if (!value) return '-';

  // Hindari pergeseran tanggal akibat konversi UTC ke zona waktu lokal.
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split('-');

  if (parts.length !== 3) return '-';

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function getStatusLabel(status) {
  return statuses.find((item) => item.value === status)?.label || status || '-';
}

function getStatusClass(status) {
  const classes = {
    SCHEDULED: 'bg-primary',
    OVERDUE: 'bg-danger',
    COMPLETED: 'bg-success',
    CANCELLED: 'bg-secondary',
  };

  return classes[status] || 'bg-secondary';
}

function getAssetName(schedule) {
  return schedule.asset?.pcName || '-';
}

function getAssetCode(schedule) {
  return schedule.asset?.assetCode || '-';
}

function getCreatorName(schedule) {
  return schedule.createdBy?.name || '-';
}

async function loadSchedules() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/schedules', {
      params: {
        page: currentPage.value,
        limit: 10,
        search: search.value || undefined,
        status: statusFilter.value || undefined,
      },
    });

    schedules.value = extractList(response.data);

    const pagination =
      response.data.pagination ||
      response.data.data?.pagination;

    if (pagination) {
      currentPage.value = Number(pagination.page || currentPage.value);
      totalPages.value = Number(pagination.totalPages || 1);
      totalRecords.value = Number(
        pagination.total || schedules.value.length,
      );
    } else {
      totalPages.value = 1;
      totalRecords.value = schedules.value.length;
    }
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil data jadwal maintenance.',
    );
  } finally {
    loading.value = false;
  }
}

async function loadAssets() {
  try {
    const response = await api.get('/assets', {
      params: {
        limit: 100,
        status: 'ACTIVE',
      },
    });

    assets.value = extractList(response.data);
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil daftar inventaris PC.',
    );
  }
}

function openCreateForm() {
  form.value = defaultForm();
  isEditMode.value = false;
  errorMessage.value = '';
  showForm.value = true;
}

async function openEditForm(schedule) {
  errorMessage.value = '';
  detailLoading.value = true;

  try {
    const response = await api.get(`/schedules/${schedule.id}`);
    const data = response.data.data;

    if (!data) {
      throw new Error('Data jadwal tidak ditemukan.');
    }
    selectedSchedule.value = data;
    form.value = {
      id: data.id,
      assetId: String(data.assetId),
      title: data.title || '',
      description: data.description || '',
      scheduledDate: toDateInput(data.scheduledDate),
      repeatMonths:
        data.repeatMonths === null || data.repeatMonths === undefined
          ? ''
          : String(data.repeatMonths),
    };

    isEditMode.value = true;
    showForm.value = true;
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil data jadwal untuk diedit.',
    );
  } finally {
    detailLoading.value = false;
  }
}

function closeForm() {
  if (saving.value) return;

  showForm.value = false;
  form.value = defaultForm();
}

async function submitForm() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!form.value.assetId) {
    errorMessage.value = 'Silakan pilih PC terlebih dahulu.';
    return;
  }

  if (!form.value.title.trim()) {
    errorMessage.value = 'Judul jadwal wajib diisi.';
    return;
  }

  if (!form.value.scheduledDate) {
    errorMessage.value = 'Tanggal jadwal wajib diisi.';
    return;
  }

  const repeatMonths =
    form.value.repeatMonths === ''
      ? null
      : Number(form.value.repeatMonths);

  if (
    repeatMonths !== null &&
    (!Number.isInteger(repeatMonths) ||
      repeatMonths < 1 ||
      repeatMonths > 60)
  ) {
    errorMessage.value = 'Pengulangan harus antara 1 sampai 60 bulan.';
    return;
  }

  const payload = {
    assetId: Number(form.value.assetId),
    title: form.value.title.trim(),
    description: form.value.description.trim() || null,
    scheduledDate: form.value.scheduledDate,
    repeatMonths,
  };

  saving.value = true;

  try {
    if (isEditMode.value) {
      await api.patch(`/schedules/${form.value.id}`, {
        title: payload.title,
        description: payload.description,
        scheduledDate: payload.scheduledDate,
        repeatMonths: payload.repeatMonths,
      });

      successMessage.value = 'Jadwal maintenance berhasil diperbarui.';
    } else {
      await api.post('/schedules', payload);

      successMessage.value = 'Jadwal maintenance berhasil ditambahkan.';
      currentPage.value = 1;
    }

    showForm.value = false;
    form.value = defaultForm();

    await loadSchedules();
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal menyimpan jadwal maintenance.',
    );
  } finally {
    saving.value = false;
  }
}

async function openDetail(schedule) {
  showDetail.value = true;
  detailLoading.value = true;
  selectedSchedule.value = null;
  errorMessage.value = '';

  try {
    const response = await api.get(`/schedules/${schedule.id}`);
    selectedSchedule.value = response.data.data;
  } catch (error) {
    showDetail.value = false;
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil detail jadwal.',
    );
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  if (detailLoading.value) return;

  showDetail.value = false;
  selectedSchedule.value = null;
}

function inputMaintenance(schedule) {
  if (!schedule?.id) return;

  router.push({
    name: 'maintenance',
    query: {
      scheduleId: String(schedule.id),
    },
  });
}

async function updateScheduleStatus(schedule, status) {
  if (!schedule?.id || processingId.value !== null) return;

  if (status !== 'CANCELLED') return;

  if (schedule.maintenanceRecord) {
    errorMessage.value =
      'Jadwal tidak dapat dibatalkan karena sudah memiliki catatan maintenance.';
    return;
  }

  const confirmed = window.confirm(
    `Apakah Anda yakin ingin membatalkan jadwal "${schedule.title}"?`,
  );

  if (!confirmed) return;

  errorMessage.value = '';
  successMessage.value = '';
  processingId.value = schedule.id;

  try {
    await api.patch(`/schedules/${schedule.id}`, {
      status: 'CANCELLED',
    });

    successMessage.value = 'Jadwal maintenance berhasil dibatalkan.';

    await loadSchedules();

    if (selectedSchedule.value?.id === schedule.id) {
      const response = await api.get(`/schedules/${schedule.id}`);
      selectedSchedule.value = response.data.data;
    }
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal membatalkan jadwal.',
    );
  } finally {
    processingId.value = null;
  }
}

async function applyFilters() {
  currentPage.value = 1;
  await loadSchedules();
}

async function changePage(page) {
  if (page < 1 || page > totalPages.value) return;

  currentPage.value = page;
  await loadSchedules();
}

onMounted(async () => {
  await Promise.all([
    loadSchedules(),
    loadAssets(),
  ]);
});
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Jadwal Maintenance</h3>
        <p class="text-muted mb-0">
          Kelola jadwal pemeliharaan komputer secara berkala.
        </p>
      </div>

      <button
        v-if="canManage"
        type="button"
        class="btn btn-primary"
        @click="openCreateForm"
      >
        <i class="bi bi-plus-lg me-2"></i>
        Tambah Jadwal
      </button>
    </div>

    <div
      v-if="successMessage"
      class="alert alert-success alert-dismissible fade show"
      role="alert"
    >
      {{ successMessage }}
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        @click="successMessage = ''"
      ></button>
    </div>

    <div
      v-if="errorMessage && !showForm && !showDetail"
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

    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Total Jadwal</div>
            <h3 class="fw-bold mb-0">{{ totalRecords }}</h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Terjadwal</div>
            <h3 class="fw-bold mb-0">
              {{ schedules.filter(item => item.status === 'SCHEDULED').length }}
            </h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Terlambat</div>
            <h3 class="fw-bold mb-0">
              {{ schedules.filter(item => item.status === 'OVERDUE').length }}
            </h3>
          </div>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-7">
            <label class="form-label small fw-semibold">Cari Jadwal</label>
            <input
              v-model="search"
              type="search"
              class="form-control"
              placeholder="Cari judul, kode inventaris, atau nama PC..."
              @keyup.enter="applyFilters"
            />
          </div>

          <div class="col-md-3">
            <label class="form-label small fw-semibold">Filter Status</label>
            <select v-model="statusFilter" class="form-select">
              <option value="">Semua Status</option>
              <option
                v-for="status in statuses"
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </option>
            </select>
          </div>

          <div class="col-md-2 d-flex align-items-end">
            <button
              type="button"
              class="btn btn-outline-primary w-100"
              @click="applyFilters"
            >
              <i class="bi bi-search me-1"></i>
              Cari
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h6 class="fw-bold mb-0">Daftar Jadwal Maintenance</h6>
      </div>

      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
          <p class="text-muted mt-2 mb-0">Memuat jadwal...</p>
        </div>

        <div v-else-if="schedules.length === 0" class="text-center py-5">
          <i class="bi bi-calendar-x display-5 text-muted"></i>
          <p class="text-muted mt-3 mb-0">Belum ada jadwal maintenance.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Judul Jadwal</th>
                <th>PC</th>
                <th>Tanggal</th>
                <th>Pengulangan</th>
                <th>Dibuat Oleh</th>
                <th>Status</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="schedule in schedules" :key="schedule.id">
                <td class="ps-3">
                  <div class="fw-semibold">{{ schedule.title }}</div>
                  <small class="text-muted">
                    {{ schedule.description || 'Tanpa deskripsi' }}
                  </small>
                </td>

                <td>
                  <div class="fw-semibold">{{ getAssetName(schedule) }}</div>
                  <small class="text-muted">{{ getAssetCode(schedule) }}</small>
                </td>

                <td>{{ formatDate(schedule.scheduledDate) }}</td>

                <td>
                  <span v-if="schedule.repeatMonths">
                    Setiap {{ schedule.repeatMonths }} bulan
                  </span>
                  <span v-else class="text-muted">Tidak berulang</span>
                </td>

                <td>{{ getCreatorName(schedule) }}</td>

                <td>
                  <span
                    class="badge"
                    :class="getStatusClass(schedule.status)"
                  >
                    {{ getStatusLabel(schedule.status) }}
                  </span>
                </td>

                <td class="text-center">
                  <div class="d-flex justify-content-center gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      title="Detail"
                      @click="openDetail(schedule)"
                    >
                      <i class="bi bi-eye"></i>
                    </button>

                    <template v-if="canManage">
                      <!-- Input maintenance dari jadwal -->
                      <button
                        v-if="
                          !['COMPLETED', 'CANCELLED'].includes(schedule.status) &&
                          !schedule.maintenanceRecord
                        "
                        type="button"
                        class="btn btn-sm btn-outline-success"
                        title="Input Maintenance"
                        :disabled="processingId !== null || detailLoading"
                        @click="inputMaintenance(schedule)"
                      >
                        <i class="bi bi-clipboard-plus"></i>
                      </button>

                      <!-- Tampilkan kode catatan jika sudah terhubung -->
                      <span
                        v-if="schedule.maintenanceRecord"
                        class="badge bg-info text-dark"
                        title="Jadwal sudah memiliki catatan maintenance"
                      >
                        {{ schedule.maintenanceRecord.maintenanceCode }}
                      </span>

                      <!-- Edit jadwal -->
                      <button
                        v-if="
                          !['COMPLETED', 'CANCELLED'].includes(schedule.status) &&
                          !schedule.maintenanceRecord
                        "
                        type="button"
                        class="btn btn-sm btn-outline-warning"
                        title="Edit"
                        :disabled="processingId !== null || detailLoading"
                        @click="openEditForm(schedule)"
                      >
                        <i class="bi bi-pencil-square"></i>
                      </button>

                      <!-- Batalkan jadwal yang belum memiliki catatan -->
                      <button
                        v-if="
                          !['COMPLETED', 'CANCELLED'].includes(schedule.status) &&
                          !schedule.maintenanceRecord
                        "
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        title="Batalkan"
                        :disabled="processingId !== null"
                        @click="updateScheduleStatus(schedule, 'CANCELLED')"
                      >
                        <i class="bi bi-x-circle"></i>
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="totalPages > 1"
        class="card-footer bg-white d-flex justify-content-between align-items-center"
      >
        <small class="text-muted">
          Halaman {{ currentPage }} dari {{ totalPages }}
        </small>

        <div class="btn-group">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            Sebelumnya
          </button>

          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>

    <!-- Form modal -->
    <div
      v-if="showForm"
      class="modal-backdrop-custom"
      @click.self="closeForm"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">
                {{ isEditMode ? 'Edit Jadwal Maintenance' : 'Tambah Jadwal Maintenance' }}
              </h5>
              <small class="text-muted">
                Atur jadwal pemeliharaan PC.
              </small>
            </div>

            <button
              type="button"
              class="btn-close"
              :disabled="saving"
              @click="closeForm"
            ></button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="modal-body">
              <div v-if="errorMessage" class="alert alert-danger">
                {{ errorMessage }}
              </div>

              <div class="mb-3" v-if="!isEditMode">
                <label class="form-label fw-semibold">
                  Pilih PC <span class="text-danger">*</span>
                </label>

                <select v-model="form.assetId" class="form-select" required>
                  <option value="">-- Pilih PC --</option>
                  <option
                    v-for="asset in assets"
                    :key="asset.id"
                    :value="String(asset.id)"
                  >
                    {{ asset.assetCode }} - {{ asset.pcName }}
                    {{ asset.location ? `(${asset.location})` : '' }}
                  </option>
                </select>

                <small v-if="assets.length === 0" class="text-danger">
                  Belum ada PC aktif atau inventaris gagal dimuat.
                </small>
              </div>

              <div v-else class="mb-3">
                <label class="form-label fw-semibold">PC</label>
                <input
                  type="text"
                  class="form-control"
                  :value="`${selectedSchedule?.asset?.assetCode || ''} - ${selectedSchedule?.asset?.pcName || ''}`"
                  disabled
                />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">
                  Judul Jadwal <span class="text-danger">*</span>
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-control"
                  maxlength="150"
                  placeholder="Contoh: Maintenance Berkala PC"
                  required
                />
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Deskripsi</label>
                <textarea
                  v-model="form.description"
                  class="form-control"
                  rows="3"
                  placeholder="Keterangan pekerjaan yang direncanakan..."
                ></textarea>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">
                    Tanggal Pelaksanaan <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="form.scheduledDate"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">
                    Pengulangan
                  </label>
                  <select
                    v-model="form.repeatMonths"
                    class="form-select"
                  >
                    <option value="">Tidak berulang</option>
                    <option value="1">Setiap 1 bulan</option>
                    <option value="2">Setiap 2 bulan</option>
                    <option value="3">Setiap 3 bulan</option>
                    <option value="6">Setiap 6 bulan</option>
                    <option value="12">Setiap 12 bulan</option>
                  </select>
                </div>
              </div>

              <div class="alert alert-info mb-0">
                <i class="bi bi-info-circle me-2"></i>
                Jika jadwal berkala ditandai selesai, sistem akan membuat jadwal berikutnya secara otomatis.
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-light"
                :disabled="saving"
                @click="closeForm"
              >
                Batal
              </button>

              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving || (!isEditMode && assets.length === 0)"
              >
                <span
                  v-if="saving"
                  class="spinner-border spinner-border-sm me-2"
                ></span>
                {{ saving ? 'Menyimpan...' : 'Simpan Jadwal' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Detail modal -->
    <div
      v-if="showDetail"
      class="modal-backdrop-custom"
      @click.self="closeDetail"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">Detail Jadwal Maintenance</h5>
              <small class="text-muted">Informasi lengkap jadwal.</small>
            </div>

            <button
              type="button"
              class="btn-close"
              :disabled="detailLoading"
              @click="closeDetail"
            ></button>
          </div>

          <div class="modal-body">
            <div v-if="detailLoading" class="text-center py-5">
              <div class="spinner-border text-primary"></div>
              <p class="text-muted mt-2">Memuat detail jadwal...</p>
            </div>

            <div v-else-if="selectedSchedule">
              <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <h5 class="fw-bold mb-1">{{ selectedSchedule.title }}</h5>
                  <div class="text-muted small">
                    Jadwal #{{ selectedSchedule.id }}
                  </div>
                </div>

                <span
                  class="badge"
                  :class="getStatusClass(selectedSchedule.status)"
                >
                  {{ getStatusLabel(selectedSchedule.status) }}
                </span>
              </div>

              <div class="detail-section mb-3">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-pc-display me-2 text-primary"></i>
                  Informasi PC
                </h6>

                <div class="detail-row">
                  <span>Nama PC</span>
                  <strong>{{ getAssetName(selectedSchedule) }}</strong>
                </div>

                <div class="detail-row">
                  <span>Kode Inventaris</span>
                  <strong>{{ getAssetCode(selectedSchedule) }}</strong>
                </div>

                <div class="detail-row">
                  <span>Lokasi</span>
                  <strong>{{ selectedSchedule.asset?.location || '-' }}</strong>
                </div>

                <div class="detail-row">
                  <span>Departemen</span>
                  <strong>{{ selectedSchedule.asset?.department || '-' }}</strong>
                </div>
              </div>

              <div class="detail-section mb-3">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-calendar-check me-2 text-primary"></i>
                  Informasi Jadwal
                </h6>

                <div class="detail-row">
                  <span>Tanggal Pelaksanaan</span>
                  <strong>{{ formatDate(selectedSchedule.scheduledDate) }}</strong>
                </div>

                <div class="detail-row">
                  <span>Pengulangan</span>
                  <strong>
                    {{ selectedSchedule.repeatMonths
                      ? `Setiap ${selectedSchedule.repeatMonths} bulan`
                      : 'Tidak berulang' }}
                  </strong>
                </div>

                <div class="detail-row">
                  <span>Dibuat Oleh</span>
                  <strong>{{ getCreatorName(selectedSchedule) }}</strong>
                </div>

                <div class="detail-row">
                  <span>Dibuat Pada</span>
                  <strong>{{ formatDate(selectedSchedule.createdAt) }}</strong>
                </div>
              </div>

              <div class="detail-section">
                <h6 class="fw-bold mb-2">
                  <i class="bi bi-card-text me-2 text-primary"></i>
                  Deskripsi
                </h6>
                <p class="mb-0 text-content">
                  {{ selectedSchedule.description || 'Tidak ada deskripsi.' }}
                </p>
              </div>
            </div>

            <div v-else class="text-center text-muted py-4">
              Data jadwal tidak tersedia.
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-light"
              :disabled="detailLoading"
              @click="closeDetail"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>


.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  box-sizing: border-box;
}

.modal-dialog {
  position: relative;
  z-index: 1056;
  width: 100%;
  max-width: 760px;
  max-height: calc(100dvh - 2rem);
  margin: auto;
  min-width: 0;
}

.modal-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 2rem);
  min-height: 0;
  overflow: hidden;
  background: #fff;
  color: #212529;
  border: none;
  border-radius: 1rem;
  box-shadow: 0 1.25rem 3rem rgba(0, 0, 0, 0.2);
}

/* PENTING: form harus menjadi flex container */
.modal-content > form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.modal-header {
  flex: 0 0 auto;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #edf0f2;
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.modal-content > form > .modal-body {
  flex: 1 1 auto;
  min-height: 0;
}

.modal-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #edf0f2;
  background: #fff;
}

.modal-footer .btn {
  min-width: 100px;
}

@media (max-width: 576px) {
  .modal-backdrop-custom {
    align-items: flex-start;
    padding: 0.75rem;
  }

  .modal-dialog {
    max-width: 100%;
    max-height: calc(100dvh - 1.5rem);
  }

  .modal-content {
    max-height: calc(100dvh - 1.5rem);
  }

  .modal-header,
  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 0.85rem 1rem;
  }

  .modal-footer .btn {
    flex: 1 1 auto;
  }
}

</style>
