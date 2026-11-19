
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import SignaturePad from '../components/signatures/SignaturePad.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const detailLoading = ref(false);
const scheduleLoading = ref(false);
const cancelingId = ref(null);
const completing = ref(false);
const completionRecord = ref(null);
const showCompletionForm = ref(false);

const errorMessage = ref('');
const successMessage = ref('');

const maintenanceRecords = ref([]);
const assets = ref([]);

const selectedSchedule = ref(null);
const selectedMaintenance = ref(null);

const search = ref('');
const statusFilter = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalRecords = ref(0);

const showForm = ref(false);
const showDetail = ref(false);
const isEditMode = ref(false);

const defaultCompletionForm = () => ({
  findings: '',
  actionTaken: '',
  result: '',
  userSignerName: '',
  userSignatureImage: '',
  technicianSignatureImage: '',
});

const completionForm = ref(defaultCompletionForm());

const defaultForm = () => ({
  id: null,
  scheduleId: null,
  assetId: '',
  maintenanceDate: new Date().toLocaleDateString('en-CA'),
  maintenanceType: 'PREVENTIVE',
  description: '',
  findings: '',
  actionTaken: '',
  result: '',
  status: 'PENDING',
  nextMaintenanceDate: '',
});

const form = ref(defaultForm());

const maintenanceTypes = [
  { value: 'PREVENTIVE', label: 'Preventive Maintenance' },
  { value: 'CORRECTIVE', label: 'Corrective Maintenance' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
  { value: 'HARDWARE_UPGRADE', label: 'Hardware Upgrade' },
  { value: 'SOFTWARE_MAINTENANCE', label: 'Software Maintenance' },
];

const statuses = [
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'IN_PROGRESS', label: 'Sedang Dikerjakan' },
  { value: 'WAITING_PARTS', label: 'Menunggu Komponen' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const editableStatuses = statuses.filter((item) => item.value !== 'COMPLETED');

const results = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'NEEDS_REPAIR', label: 'Perlu Perbaikan' },
  { value: 'WAITING_PARTS', label: 'Menunggu Komponen' },
  { value: 'NOT_OPERATIONAL', label: 'Tidak Beroperasi' },
];

const filteredRecords = computed(() => maintenanceRecords.value);

function extractList(responseData, possibleKeys = []) {
  if (Array.isArray(responseData)) return responseData;

  if (responseData && typeof responseData === 'object') {
    if (Array.isArray(responseData.data)) {
      return responseData.data;
    }

    for (const key of possibleKeys) {
      if (Array.isArray(responseData[key])) {
        return responseData[key];
      }

      if (
        responseData.data &&
        Array.isArray(responseData.data[key])
      ) {
        return responseData.data[key];
      }
    }
  }

  return [];
}

function extractMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function toDateInput(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) return match[1];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getStatusLabel(status) {
  return statuses.find((item) => item.value === status)?.label || status || '-';
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

function getTypeLabel(type) {
  return maintenanceTypes.find((item) => item.value === type)?.label || type || '-';
}

function getResultLabel(result) {
  const item = results.find((option) => option.value === result);
  return item?.label || result || '-';
}

function getAssetName(record) {
  return record.asset?.pcName || record.pcAsset?.pcName || '-';
}

function getAssetCode(record) {
  return record.asset?.assetCode || record.pcAsset?.assetCode || '-';
}

function getTechnicianName(record) {
  return record.technician?.name || '-';
}

function getHistoryStatusLabel(status) {
  return status ? getStatusLabel(status) : 'Data baru';
}

function getScheduleTitle(schedule) {
  return schedule?.title || schedule?.name || `Jadwal #${schedule?.id || '-'}`;
}

function getScheduleAssetName(schedule) {
  return schedule?.asset?.pcName || '-';
}

function getScheduleAssetCode(schedule) {
  return schedule?.asset?.assetCode || '-';
}

async function clearScheduleQuery() {
  if (!route.query.scheduleId) return;

  const query = { ...route.query };
  delete query.scheduleId;

  try {
    await router.replace({
      path: route.path,
      query,
    });
  } catch (error) {
    console.error('Gagal membersihkan parameter jadwal:', error);
  }
}

async function loadMaintenance() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/maintenance', {
      params: {
        page: currentPage.value,
        limit: 10,
        search: search.value || undefined,
        status: statusFilter.value || undefined,
      },
    });

    const result = response.data;

    maintenanceRecords.value = extractList(result, [
      'records',
      'maintenanceRecords',
      'items',
    ]);

    const pagination = result.pagination || result.data?.pagination;

    if (pagination) {
      currentPage.value = Number(pagination.page || currentPage.value);
      totalPages.value = Number(pagination.totalPages || 1);
      totalRecords.value = Number(
        pagination.total ||
        pagination.totalRecords ||
        maintenanceRecords.value.length,
      );
    } else {
      totalPages.value = 1;
      totalRecords.value = maintenanceRecords.value.length;
    }
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil data maintenance.',
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

    assets.value = extractList(response.data, ['assets', 'items']);
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil daftar inventaris PC.',
    );
  }
}

/**
 * Mengambil jadwal dari parameter URL.
 * Contoh URL:
 * /maintenance?scheduleId=1
 */
async function loadScheduleForMaintenance() {
  const scheduleId = route.query.scheduleId;

  if (!scheduleId) return;

  scheduleLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await api.get(`/schedules/${scheduleId}`);

    const schedule = response.data.data;

    if (!schedule) {
      throw new Error('Data jadwal maintenance tidak ditemukan.');
    }

    if (
      schedule.status === 'COMPLETED' ||
      schedule.status === 'CANCELLED'
    ) {
      throw new Error(
        'Jadwal ini sudah selesai atau dibatalkan sehingga tidak dapat digunakan.',
      );
    }

    if (schedule.maintenanceRecord) {
      throw new Error(
        'Jadwal ini sudah memiliki catatan maintenance.',
      );
    }

    if (!schedule.assetId) {
      throw new Error(
        'Jadwal ini belum memiliki data PC yang valid.',
      );
    }

    selectedSchedule.value = schedule;

    isEditMode.value = false;

    form.value = {
      ...defaultForm(),
      scheduleId: Number(schedule.id),
      assetId: String(schedule.assetId),
      maintenanceDate: new Date().toLocaleDateString('en-CA'),
      maintenanceType: 'PREVENTIVE',
      description: schedule.description || schedule.title || '',
    };

    showForm.value = true;
  } catch (error) {
    selectedSchedule.value = null;

    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil data jadwal maintenance.',
    );

    await clearScheduleQuery();
  } finally {
    scheduleLoading.value = false;
  }
}

function openCreateForm() {
  isEditMode.value = false;
  selectedSchedule.value = null;
  form.value = defaultForm();

  errorMessage.value = '';
  successMessage.value = '';

  showForm.value = true;

  clearScheduleQuery();
}

async function openEditForm(record) {
  errorMessage.value = '';
  successMessage.value = '';
  detailLoading.value = true;

  selectedSchedule.value = null;

  try {
    const response = await api.get(`/maintenance/${record.id}`);
    const data = response.data.data;

    if (!data) {
      throw new Error('Data maintenance tidak ditemukan.');
    }

    form.value = {
      id: data.id,
      scheduleId: data.scheduleId || data.schedule?.id || null,
      assetId: String(data.assetId || ''),
      maintenanceDate: toDateInput(data.maintenanceDate),
      maintenanceType: data.maintenanceType || 'PREVENTIVE',
      description: data.description || '',
      findings: data.findings || '',
      actionTaken: data.actionTaken || '',
      result: data.result || '',
      status: data.status || 'PENDING',
      nextMaintenanceDate: toDateInput(data.nextMaintenanceDate),
    };

    selectedMaintenance.value = data;

    isEditMode.value = true;
    showForm.value = true;
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil data untuk diedit.',
    );
  } finally {
    detailLoading.value = false;
  }
}

function closeForm() {
  if (saving.value) return;

  showForm.value = false;
  form.value = defaultForm();

  selectedSchedule.value = null;

  isEditMode.value = false;

  clearScheduleQuery();
}

async function submitForm() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!form.value.maintenanceDate) {
    errorMessage.value = 'Tanggal maintenance wajib diisi.';
    return;
  }

  if (!form.value.description.trim()) {
    errorMessage.value = 'Deskripsi maintenance wajib diisi.';
    return;
  }

  if (!form.value.maintenanceType) {
    errorMessage.value = 'Jenis maintenance wajib dipilih.';
    return;
  }

  saving.value = true;

  try {
    if (isEditMode.value) {
      const payload = {
        maintenanceDate: form.value.maintenanceDate,
        maintenanceType: form.value.maintenanceType,
        description: form.value.description.trim(),
        findings: form.value.findings.trim(),
        actionTaken: form.value.actionTaken.trim(),
        result: form.value.result || null,
        status: form.value.status,
        nextMaintenanceDate: form.value.nextMaintenanceDate || null,
      };

      await api.patch(`/maintenance/${form.value.id}`, payload);

      successMessage.value = 'Catatan maintenance berhasil diperbarui.';
    } else {
      if (!form.value.assetId) {
        errorMessage.value = 'Silakan pilih PC terlebih dahulu.';
        return;
      }

      const payload = {
        assetId: Number(form.value.assetId),
        scheduleId: form.value.scheduleId
          ? Number(form.value.scheduleId)
          : null,
        maintenanceDate: form.value.maintenanceDate,
        maintenanceType: form.value.maintenanceType,
        description: form.value.description.trim(),
        nextMaintenanceDate: form.value.nextMaintenanceDate || null,
      };

      await api.post('/maintenance', payload);

      successMessage.value = 'Catatan maintenance berhasil ditambahkan.';
      currentPage.value = 1;
    }

    showForm.value = false;
    form.value = defaultForm();

    selectedSchedule.value = null;
    isEditMode.value = false;

    await clearScheduleQuery();

    await loadMaintenance();

    if (selectedMaintenance.value?.id) {
      try {
        const response = await api.get(
          `/maintenance/${selectedMaintenance.value.id}`,
        );

        selectedMaintenance.value = response.data.data;
      } catch (error) {
        console.error('Gagal memperbarui detail maintenance:', error);
      }
    }
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal menyimpan catatan maintenance.',
    );
  } finally {
    saving.value = false;
  }
}

async function openCompletionForm(record) {
  if (!record?.id || ['COMPLETED', 'CANCELLED'].includes(record.status)) return;

  errorMessage.value = '';
  successMessage.value = '';
  detailLoading.value = true;

  try {
    const response = await api.get(`/maintenance/${record.id}`);
    const data = response.data.data;

    if (!data) throw new Error('Data maintenance tidak ditemukan.');
    if (['COMPLETED', 'CANCELLED'].includes(data.status)) {
      throw new Error('Maintenance ini sudah selesai atau dibatalkan.');
    }

    completionRecord.value = data;
    completionForm.value = {
      ...defaultCompletionForm(),
      findings: data.findings || '',
      actionTaken: data.actionTaken || '',
      result: data.result || '',
    };
    showCompletionForm.value = true;
  } catch (error) {
    errorMessage.value = extractMessage(error, 'Gagal membuka form penyelesaian maintenance.');
  } finally {
    detailLoading.value = false;
  }
}

function closeCompletionForm() {
  if (completing.value) return;
  showCompletionForm.value = false;
  completionRecord.value = null;
  completionForm.value = defaultCompletionForm();
}

async function submitCompletion() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!completionRecord.value?.id) {
    errorMessage.value = 'Data maintenance tidak valid.';
    return;
  }

  if (!completionForm.value.findings.trim()) {
    errorMessage.value = 'Hasil pemeriksaan wajib diisi sebelum menyelesaikan maintenance.';
    return;
  }

  if (!completionForm.value.actionTaken.trim()) {
    errorMessage.value = 'Tindakan yang dilakukan wajib diisi sebelum menyelesaikan maintenance.';
    return;
  }

  if (!completionForm.value.result) {
    errorMessage.value = 'Hasil maintenance wajib dipilih.';
    return;
  }

  if (!completionForm.value.userSignerName.trim()) {
    errorMessage.value = 'Nama penanggung jawab PC wajib diisi.';
    return;
  }

  if (!completionForm.value.userSignatureImage) {
    errorMessage.value = 'Tanda tangan penanggung jawab PC wajib dibubuhkan.';
    return;
  }

  completing.value = true;

  try {
    const id = completionRecord.value.id;
    await api.patch(`/maintenance/${id}/complete`, {
      findings: completionForm.value.findings.trim(),
      actionTaken: completionForm.value.actionTaken.trim(),
      result: completionForm.value.result,
      userSignerName: completionForm.value.userSignerName.trim(),
      userSignatureImage: completionForm.value.userSignatureImage,
      technicianSignatureImage: completionForm.value.technicianSignatureImage || null,
    });

    showCompletionForm.value = false;
    completionRecord.value = null;
    completionForm.value = defaultCompletionForm();
    successMessage.value = 'Maintenance berhasil diselesaikan dan tanda tangan berhasil disimpan.';

    await loadMaintenance();

    if (selectedMaintenance.value?.id === id) {
      const response = await api.get(`/maintenance/${id}`);
      selectedMaintenance.value = response.data.data;
    }
  } catch (error) {
    errorMessage.value = extractMessage(error, 'Gagal menyelesaikan maintenance.');
  } finally {
    completing.value = false;
  }
}

async function cancelMaintenance(record) {
  if (!record?.id) return;

  if (record.status === 'CANCELLED') return;

  if (record.status === 'COMPLETED') {
    errorMessage.value = 'Maintenance yang sudah selesai tidak dapat dibatalkan.';
    return;
  }

  if (record.scheduleId || record.schedule?.id) {
    errorMessage.value =
      'Maintenance yang terhubung dengan jadwal tidak dapat dibatalkan melalui tindakan ini.';
    return;
  }

  const maintenanceCode =
    record.maintenanceCode || `MT-${record.id}`;

  const confirmed = window.confirm(
    `Apakah Anda yakin ingin membatalkan maintenance ${maintenanceCode}?\n\n` +
    'Catatan tidak akan dihapus permanen. Status akan diubah menjadi Dibatalkan dan perubahan dicatat dalam riwayat.',
  );

  if (!confirmed) return;

  errorMessage.value = '';
  successMessage.value = '';
  cancelingId.value = record.id;

  try {
    await api.patch(`/maintenance/${record.id}`, {
      status: 'CANCELLED',
    });

    successMessage.value =
      `Maintenance ${maintenanceCode} berhasil dibatalkan.`;

    await loadMaintenance();

    if (selectedMaintenance.value?.id === record.id) {
      const response = await api.get(`/maintenance/${record.id}`);
      selectedMaintenance.value = response.data.data;
    }
  } catch (error) {
    errorMessage.value = extractMessage(
      error,
      'Gagal membatalkan maintenance.',
    );
  } finally {
    cancelingId.value = null;
  }
}

async function openDetail(record) {
  showDetail.value = true;
  detailLoading.value = true;
  selectedMaintenance.value = null;
  errorMessage.value = '';

  try {
    const response = await api.get(`/maintenance/${record.id}`);
    selectedMaintenance.value = response.data.data;
  } catch (error) {
    showDetail.value = false;

    errorMessage.value = extractMessage(
      error,
      'Gagal mengambil detail maintenance.',
    );
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  if (detailLoading.value) return;

  showDetail.value = false;
  selectedMaintenance.value = null;
}

async function applyFilters() {
  currentPage.value = 1;
  await loadMaintenance();
}

async function changePage(page) {
  if (page < 1 || page > totalPages.value) return;

  currentPage.value = page;
  await loadMaintenance();
}

onMounted(async () => {
  await Promise.all([
    loadMaintenance(),
    loadAssets(),
  ]);

  if (route.query.scheduleId) {
    await loadScheduleForMaintenance();
  }
});
</script>

<template>
  <div class="container-fluid py-3">

    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h3 class="fw-bold mb-1">Maintenance PC</h3>
        <p class="text-muted mb-0">
          Kelola catatan pemeliharaan dan perbaikan komputer.
        </p>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        @click="openCreateForm"
      >
        <i class="bi bi-plus-lg me-2"></i>
        Tambah Maintenance
      </button>
    </div>

    <!-- Notifications -->
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

    <!-- Schedule Loading -->
    <div
      v-if="scheduleLoading"
      class="alert alert-info"
    >
      <span class="spinner-border spinner-border-sm me-2"></span>
      Mengambil informasi jadwal maintenance...
    </div>

    <!-- Statistics -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Total Data Ditampilkan</div>
            <h3 class="fw-bold mb-0">{{ totalRecords }}</h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Sedang Dikerjakan</div>
            <h3 class="fw-bold mb-0">
              {{ maintenanceRecords.filter(item => item.status === 'IN_PROGRESS').length }}
            </h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="text-muted small mb-1">Selesai</div>
            <h3 class="fw-bold mb-0">
              {{ maintenanceRecords.filter(item => item.status === 'COMPLETED').length }}
            </h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-7">
            <label class="form-label small fw-semibold">
              Cari Maintenance
            </label>

            <input
              v-model="search"
              type="search"
              class="form-control"
              placeholder="Cari kode maintenance atau deskripsi..."
              @keyup.enter="applyFilters"
            />
          </div>

          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Filter Status
            </label>

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

    <!-- Maintenance Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h6 class="fw-bold mb-0">Daftar Catatan Maintenance</h6>
      </div>

      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted mt-2 mb-0">
            Memuat data maintenance...
          </p>
        </div>

        <div
          v-else-if="maintenanceRecords.length === 0"
          class="text-center py-5"
        >
          <i class="bi bi-clipboard-x display-5 text-muted"></i>
          <p class="text-muted mt-3 mb-0">
            Belum ada data maintenance.
          </p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Kode Maintenance</th>
                <th>PC</th>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Teknisi</th>
                <th>Status</th>
                <th>Hasil</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="record in filteredRecords"
                :key="record.id"
              >
                <td class="ps-3">
                  <span class="fw-semibold">
                    {{ record.maintenanceCode || `MT-${record.id}` }}
                  </span>

                  <div v-if="record.scheduleId || record.schedule?.id">
                    <small class="text-primary">
                      <i class="bi bi-calendar-check me-1"></i>
                      Dari jadwal
                    </small>
                  </div>
                </td>

                <td>
                  <div class="fw-semibold">
                    {{ getAssetName(record) }}
                  </div>

                  <small class="text-muted">
                    {{ getAssetCode(record) }}
                  </small>
                </td>

                <td>{{ formatDate(record.maintenanceDate) }}</td>

                <td>{{ getTypeLabel(record.maintenanceType) }}</td>

                <td>{{ getTechnicianName(record) }}</td>

                <td>
                  <span
                    class="badge"
                    :class="getStatusClass(record.status)"
                  >
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>

                <td>{{ getResultLabel(record.result) }}</td>

                <td class="text-center">
                  <div class="d-flex justify-content-center gap-1">

                    <!-- Detail -->
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      title="Lihat detail"
                      @click="openDetail(record)"
                    >
                      <i class="bi bi-eye"></i>
                    </button>

                    <!-- Selesaikan maintenance -->
                    <button
                      v-if="!['COMPLETED', 'CANCELLED'].includes(record.status)"
                      type="button"
                      class="btn btn-sm btn-outline-success"
                      title="Selesaikan maintenance dan isi tanda tangan"
                      :disabled="completing || detailLoading || saving || cancelingId !== null"
                      @click="openCompletionForm(record)"
                    >
                      <i class="bi bi-check2-circle"></i>
                    </button>

                    <!-- Edit -->
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-warning"
                      title="Edit maintenance"
                      :disabled="
                        detailLoading ||
                        saving ||
                        cancelingId !== null ||
                        ['COMPLETED', 'CANCELLED'].includes(record.status)
                      "
                      @click="openEditForm(record)"
                    >
                      <i class="bi bi-pencil-square"></i>
                    </button>

                    <!-- Batalkan -->
                    <button
                      v-if="
                        !['COMPLETED', 'CANCELLED'].includes(record.status) &&
                        !record.scheduleId &&
                        !record.schedule?.id
                      "
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      title="Batalkan maintenance"
                      :disabled="
                        cancelingId !== null ||
                        saving ||
                        detailLoading
                      "
                      @click="cancelMaintenance(record)"
                    >
                      <span
                        v-if="cancelingId === record.id"
                        class="spinner-border spinner-border-sm"
                      ></span>

                      <i
                        v-else
                        class="bi bi-x-circle"
                      ></i>
                    </button>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
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

    <!-- Create / Edit Modal -->
    <div
      v-if="showForm"
      class="modal-backdrop-custom"
      @click.self="closeForm"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenanceFormTitle"
      >
        <div class="modal-content border-0 shadow">

          <div class="modal-header">
            <div>
              <h5 id="maintenanceFormTitle" class="modal-title fw-bold">
                {{ isEditMode ? 'Edit Maintenance' : 'Tambah Maintenance' }}
              </h5>

              <small class="text-muted">
                {{ isEditMode ? 'Perbarui informasi catatan maintenance.' : 'Masukkan informasi pemeliharaan PC.' }}
              </small>
            </div>

            <button
              type="button"
              class="btn-close"
              :disabled="saving"
              aria-label="Tutup"
              @click="closeForm"
            ></button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="modal-body">

              <div v-if="errorMessage" class="alert alert-danger">
                {{ errorMessage }}
              </div>

              <!-- Informasi jadwal yang dipilih -->
              <div
                v-if="!isEditMode && selectedSchedule"
                class="alert alert-info mb-3"
              >
                <div class="d-flex align-items-start gap-2">
                  <i class="bi bi-calendar-check fs-4"></i>

                  <div>
                    <strong>Maintenance dari Jadwal Berkala</strong>

                    <div class="mt-2">
                      <div>
                        <strong>Jadwal:</strong>
                        {{ getScheduleTitle(selectedSchedule) }}
                      </div>

                      <div>
                        <strong>Tanggal jadwal:</strong>
                        {{ formatDate(selectedSchedule.scheduledDate) }}
                      </div>

                      <div>
                        <strong>PC:</strong>
                        {{ getScheduleAssetName(selectedSchedule) }}
                        ({{ getScheduleAssetCode(selectedSchedule) }})
                      </div>
                    </div>

                    <small class="d-block mt-2">
                      Tanggal maintenance di bawah ini adalah tanggal
                      pelaksanaan sebenarnya dan dapat berbeda dari tanggal jadwal.
                    </small>
                  </div>
                </div>
              </div>

              <!-- PC selection for normal maintenance -->
              <div
                v-if="!isEditMode && !form.scheduleId"
                class="mb-3"
              >
                <label class="form-label fw-semibold">
                  Pilih PC <span class="text-danger">*</span>
                </label>

                <select
                  v-model="form.assetId"
                  class="form-select"
                  required
                >
                  <option value="">-- Pilih PC --</option>

                  <option
                    v-for="asset in assets"
                    :key="asset.id"
                    :value="String(asset.id)"
                  >
                    {{ asset.assetCode }} - {{ asset.pcName }}
                    <template v-if="asset.location">
                      ({{ asset.location }})
                    </template>
                  </option>
                </select>

                <small v-if="assets.length === 0" class="text-danger">
                  Belum ada PC aktif atau data inventaris gagal dimuat.
                </small>
              </div>

              <!-- PC selected from schedule -->
              <div
                v-else-if="!isEditMode && form.scheduleId"
                class="mb-3"
              >
                <label class="form-label fw-semibold">PC</label>

                <input
                  type="text"
                  class="form-control"
                  :value="`${getScheduleAssetCode(selectedSchedule)} - ${getScheduleAssetName(selectedSchedule)}`"
                  disabled
                />

                <small class="text-muted">
                  PC diambil otomatis dari jadwal maintenance.
                </small>
              </div>

              <!-- PC for edit -->
              <div v-else class="mb-3">
                <label class="form-label fw-semibold">PC</label>

                <input
                  type="text"
                  class="form-control"
                  :value="`${selectedMaintenance?.asset?.assetCode || ''} - ${selectedMaintenance?.asset?.pcName || ''}`"
                  disabled
                />

                <small class="text-muted">
                  PC yang terkait dengan catatan ini tidak dapat diganti.
                </small>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">
                    Tanggal Maintenance <span class="text-danger">*</span>
                  </label>

                  <input
                    v-model="form.maintenanceDate"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">
                    Jenis Maintenance <span class="text-danger">*</span>
                  </label>

                  <select
                    v-model="form.maintenanceType"
                    class="form-select"
                    required
                  >
                    <option
                      v-for="type in maintenanceTypes"
                      :key="type.value"
                      :value="type.value"
                    >
                      {{ type.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">
                  Deskripsi Maintenance <span class="text-danger">*</span>
                </label>

                <textarea
                  v-model="form.description"
                  class="form-control"
                  rows="3"
                  placeholder="Jelaskan kondisi PC atau pekerjaan yang dilakukan..."
                  required
                ></textarea>
              </div>

              <div v-if="isEditMode">
                <div class="mb-3">
                  <label class="form-label fw-semibold">
                    Hasil Pemeriksaan
                  </label>

                  <textarea
                    v-model="form.findings"
                    class="form-control"
                    rows="3"
                    placeholder="Tuliskan hasil pemeriksaan PC..."
                  ></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">
                    Tindakan yang Dilakukan
                  </label>

                  <textarea
                    v-model="form.actionTaken"
                    class="form-control"
                    rows="3"
                    placeholder="Tuliskan tindakan perbaikan atau pemeliharaan..."
                  ></textarea>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label fw-semibold">
                      Status Maintenance
                    </label>

                    <select
                      v-model="form.status"
                      class="form-select"
                    >
                      <option
                        v-for="status in editableStatuses"
                        :key="status.value"
                        :value="status.value"
                      >
                        {{ status.label }}
                      </option>
                    </select>
                  </div>

                  <div class="col-md-6 mb-3">
                    <label class="form-label fw-semibold">
                      Hasil Maintenance
                    </label>

                    <select
                      v-model="form.result"
                      class="form-select"
                    >
                      <option value="">Belum ditentukan</option>

                      <option
                        v-for="result in results"
                        :key="result.value"
                        :value="result.value"
                      >
                        {{ result.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">
                  Rencana Maintenance Berikutnya
                </label>

                <input
                  v-model="form.nextMaintenanceDate"
                  type="date"
                  class="form-control"
                />

                <small class="text-muted">
                  Boleh dikosongkan jika belum ditentukan.
                </small>
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
                :disabled="saving || (!isEditMode && !form.scheduleId && assets.length === 0)"
              >
                <span
                  v-if="saving"
                  class="spinner-border spinner-border-sm me-2"
                ></span>

                {{ saving ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Simpan Maintenance') }}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

    <!-- Maintenance Detail Modal -->
    <div
      v-if="showDetail"
      class="modal-backdrop-custom"
      @click.self="closeDetail"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenanceDetailTitle"
      >
        <div class="modal-content border-0 shadow">

          <div class="modal-header">
            <div>
              <h5 id="maintenanceDetailTitle" class="modal-title fw-bold">
                Detail Maintenance
              </h5>

              <small class="text-muted">
                Informasi lengkap catatan pemeliharaan PC.
              </small>
            </div>

            <button
              type="button"
              class="btn-close"
              :disabled="detailLoading"
              aria-label="Tutup"
              @click="closeDetail"
            ></button>
          </div>

          <div class="modal-body">

            <div v-if="detailLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>

              <p class="text-muted mt-3 mb-0">
                Memuat detail maintenance...
              </p>
            </div>

            <div v-else-if="selectedMaintenance">

              <div class="detail-heading mb-4">
                <div>
                  <div class="text-muted small mb-1">
                    Kode Maintenance
                  </div>

                  <h5 class="fw-bold mb-0">
                    {{ selectedMaintenance.maintenanceCode || `MT-${selectedMaintenance.id}` }}
                  </h5>
                </div>

                <span
                  class="badge fs-6"
                  :class="getStatusClass(selectedMaintenance.status)"
                >
                  {{ getStatusLabel(selectedMaintenance.status) }}
                </span>
              </div>

              <!-- Linked Schedule -->
              <div
                v-if="selectedMaintenance.schedule"
                class="alert alert-info mb-4"
              >
                <div class="d-flex gap-2">
                  <i class="bi bi-calendar-check fs-4"></i>

                  <div>
                    <strong>Maintenance Terhubung dengan Jadwal</strong>

                    <div class="mt-2">
                      <div>
                        <strong>Jadwal:</strong>
                        {{ getScheduleTitle(selectedMaintenance.schedule) }}
                      </div>

                      <div>
                        <strong>Tanggal jadwal:</strong>
                        {{ formatDate(selectedMaintenance.schedule.scheduledDate) }}
                      </div>

                      <div>
                        <strong>Status jadwal:</strong>
                        {{ getStatusLabel(selectedMaintenance.schedule.status) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row g-3 mb-4">

                <!-- PC Information -->
                <div class="col-lg-6">
                  <div class="detail-section h-100">
                    <h6 class="fw-bold mb-3">
                      <i class="bi bi-pc-display me-2 text-primary"></i>
                      Informasi PC
                    </h6>

                    <div class="detail-row">
                      <span>Nama PC</span>
                      <strong>{{ getAssetName(selectedMaintenance) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Kode Inventaris</span>
                      <strong>{{ getAssetCode(selectedMaintenance) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Hostname</span>
                      <strong>{{ selectedMaintenance.asset?.hostname || '-' }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Lokasi</span>
                      <strong>{{ selectedMaintenance.asset?.location || '-' }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Departemen</span>
                      <strong>{{ selectedMaintenance.asset?.department || '-' }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Pengguna PC</span>
                      <strong>{{ selectedMaintenance.asset?.assignedTo || '-' }}</strong>
                    </div>
                  </div>
                </div>

                <!-- Maintenance Information -->
                <div class="col-lg-6">
                  <div class="detail-section h-100">
                    <h6 class="fw-bold mb-3">
                      <i class="bi bi-clipboard-check me-2 text-primary"></i>
                      Informasi Maintenance
                    </h6>

                    <div class="detail-row">
                      <span>Tanggal</span>
                      <strong>{{ formatDate(selectedMaintenance.maintenanceDate) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Jenis</span>
                      <strong>{{ getTypeLabel(selectedMaintenance.maintenanceType) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Teknisi</span>
                      <strong>{{ selectedMaintenance.technician?.name || '-' }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Hasil</span>
                      <strong>{{ getResultLabel(selectedMaintenance.result) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Selesai pada</span>
                      <strong>{{ formatDateTime(selectedMaintenance.completedAt) }}</strong>
                    </div>

                    <div class="detail-row">
                      <span>Maintenance berikutnya</span>
                      <strong>{{ formatDate(selectedMaintenance.nextMaintenanceDate) }}</strong>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Description -->
              <div class="detail-section mb-3">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-card-text me-2 text-primary"></i>
                  Deskripsi Pekerjaan
                </h6>

                <p class="mb-0 text-content">
                  {{ selectedMaintenance.description || '-' }}
                </p>
              </div>

              <!-- Findings -->
              <div class="detail-section mb-3">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-search me-2 text-primary"></i>
                  Hasil Pemeriksaan
                </h6>

                <p class="mb-0 text-content">
                  {{ selectedMaintenance.findings || 'Belum ada hasil pemeriksaan.' }}
                </p>
              </div>

              <!-- Action Taken -->
              <div class="detail-section mb-4">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-tools me-2 text-primary"></i>
                  Tindakan yang Dilakukan
                </h6>

                <p class="mb-0 text-content">
                  {{ selectedMaintenance.actionTaken || 'Belum ada tindakan yang dicatat.' }}
                </p>
              </div>

              <!-- Digital signatures -->
              <div class="detail-section mb-4">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-pen me-2 text-primary"></i>
                  Tanda Tangan Digital
                </h6>

                <div v-if="selectedMaintenance.signatures?.length" class="row g-3">
                  <div
                    v-for="signature in selectedMaintenance.signatures"
                    :key="signature.id"
                    class="col-md-6"
                  >
                    <div class="border rounded p-3 h-100">
                      <div class="fw-semibold mb-1">
                        {{ signature.signerRole === 'USER' ? 'Penanggung Jawab PC' : 'Teknisi' }}
                      </div>
                      <div class="small text-muted mb-2">{{ signature.signerName }}</div>
                      <div class="signature-preview mb-2">
                        <img :src="signature.signatureImage" :alt="`Tanda tangan ${signature.signerName}`" />
                      </div>
                      <small class="text-muted">Ditandatangani: {{ formatDateTime(signature.signedAt) }}</small>
                    </div>
                  </div>
                </div>
                <p v-else class="text-muted mb-0">Belum ada tanda tangan yang tersimpan.</p>
              </div>

              <!-- History -->
              <div class="detail-section">
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-clock-history me-2 text-primary"></i>
                  Riwayat Perubahan
                </h6>

                <div
                  v-if="selectedMaintenance.history?.length"
                  class="history-list"
                >
                  <div
                    v-for="history in selectedMaintenance.history"
                    :key="history.id"
                    class="history-item"
                  >
                    <div class="history-dot"></div>

                    <div class="history-content">
                      <div class="d-flex flex-wrap justify-content-between gap-2">
                        <strong>
                          {{ getHistoryStatusLabel(history.newStatus) }}
                        </strong>

                        <small class="text-muted">
                          {{ formatDateTime(history.createdAt) }}
                        </small>
                      </div>

                      <div class="small text-muted mt-1">
                        <template v-if="history.oldStatus">
                          Status sebelumnya:
                          {{ getHistoryStatusLabel(history.oldStatus) }}
                          <span class="mx-1">→</span>
                        </template>

                        Status baru:
                        {{ getHistoryStatusLabel(history.newStatus) }}
                      </div>

                      <p
                        v-if="history.remarks"
                        class="mb-0 mt-2 small"
                      >
                        {{ history.remarks }}
                      </p>
                    </div>
                  </div>
                </div>

                <p v-else class="text-muted mb-0">
                  Belum ada riwayat perubahan.
                </p>
              </div>

            </div>

            <div v-else class="text-center py-4 text-muted">
              Data detail tidak tersedia.
            </div>

          </div>

          <div class="modal-footer">
            <button
              v-if="selectedMaintenance && !['COMPLETED', 'CANCELLED'].includes(selectedMaintenance.status)"
              type="button"
              class="btn btn-success me-auto"
              :disabled="detailLoading || completing"
              @click="openCompletionForm(selectedMaintenance)"
            >
              <i class="bi bi-check2-circle me-1"></i>
              Selesaikan Maintenance
            </button>
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

    <!-- Completion and signature modal -->
    <div
      v-if="showCompletionForm"
      class="modal-backdrop-custom"
      @click.self="closeCompletionForm"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl" role="dialog" aria-modal="true" aria-labelledby="completionTitle">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <div>
              <h5 id="completionTitle" class="modal-title fw-bold">Penyelesaian Maintenance</h5>
              <small class="text-muted">
                {{ completionRecord?.maintenanceCode || `MT-${completionRecord?.id || '-'}` }}
              </small>
            </div>
            <button type="button" class="btn-close" :disabled="completing" aria-label="Tutup" @click="closeCompletionForm"></button>
          </div>

          <form @submit.prevent="submitCompletion">
            <div class="modal-body">
              <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
              <div class="alert alert-info">
                Pastikan pekerjaan maintenance telah diperiksa bersama penanggung jawab PC. Tanda tangan penanggung jawab wajib diisi; tanda tangan teknisi bersifat opsional.
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Hasil Pemeriksaan <span class="text-danger">*</span></label>
                <textarea v-model="completionForm.findings" class="form-control" rows="3" required placeholder="Tuliskan kondisi PC setelah pemeriksaan..."></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold">Tindakan yang Dilakukan <span class="text-danger">*</span></label>
                <textarea v-model="completionForm.actionTaken" class="form-control" rows="3" required placeholder="Tuliskan tindakan pemeliharaan atau perbaikan..."></textarea>
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold">Hasil Maintenance <span class="text-danger">*</span></label>
                <select v-model="completionForm.result" class="form-select" required>
                  <option value="">-- Pilih hasil --</option>
                  <option v-for="result in results" :key="result.value" :value="result.value">{{ result.label }}</option>
                </select>
              </div>

              <hr />
              <h6 class="fw-bold mb-3">Persetujuan Penanggung Jawab PC</h6>
              <div class="mb-3">
                <label class="form-label fw-semibold">Nama Penanggung Jawab <span class="text-danger">*</span></label>
                <input v-model="completionForm.userSignerName" type="text" class="form-control" maxlength="150" required placeholder="Masukkan nama lengkap penanggung jawab PC" />
              </div>
              <SignaturePad v-model="completionForm.userSignatureImage" label="Tanda tangan penanggung jawab PC (wajib)" />

              <hr class="my-4" />
              <h6 class="fw-bold mb-2">Tanda Tangan Teknisi</h6>
              <p class="small text-muted">Opsional. Teknisi dapat membubuhkan tanda tangan sebagai pihak yang melaksanakan pekerjaan.</p>
              <SignaturePad v-model="completionForm.technicianSignatureImage" label="Tanda tangan teknisi (opsional)" />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-light" :disabled="completing" @click="closeCompletionForm">Batal</button>
              <button type="submit" class="btn btn-success" :disabled="completing || !completionForm.userSignatureImage || !completionForm.userSignerName.trim()">
                <span v-if="completing" class="spinner-border spinner-border-sm me-2"></span>
                {{ completing ? 'Menyimpan...' : 'Simpan Tanda Tangan & Selesaikan' }}
              </button>
            </div>
          </form>
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

.modal-dialog.modal-xl {
  max-width: 1100px;
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

/* PENTING: mengatur form agar body bisa di-scroll */
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
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #edf0f2;
  background: #fff;
}

.modal-footer .btn {
  min-width: 100px;
}

@media (max-width: 767px) {
  .modal-dialog.modal-xl {
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  .modal-backdrop-custom {
    align-items: flex-start;
    padding: 0.75rem;
  }

  .modal-dialog,
  .modal-dialog.modal-xl {
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
