<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

const canManage = computed(() => auth.isAdmin || auth.isTechnician);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const assets = ref([]);
const schedules = ref([]);
const selectedYear = ref(new Date().getFullYear());

const showForm = ref(false);
const showMonthDetail = ref(false);
const isEditMode = ref(false);
const selectedAsset = ref(null);
const selectedMonth = ref(null);
const selectedSchedule = ref(null);
const monthSchedules = ref([]);

const form = ref(defaultForm());

const months = [
  { number: 1, label: 'Jan', full: 'Januari' },
  { number: 2, label: 'Feb', full: 'Februari' },
  { number: 3, label: 'Mar', full: 'Maret' },
  { number: 4, label: 'Apr', full: 'April' },
  { number: 5, label: 'Mei', full: 'Mei' },
  { number: 6, label: 'Jun', full: 'Juni' },
  { number: 7, label: 'Jul', full: 'Juli' },
  { number: 8, label: 'Agu', full: 'Agustus' },
  { number: 9, label: 'Sep', full: 'September' },
  { number: 10, label: 'Okt', full: 'Oktober' },
  { number: 11, label: 'Nov', full: 'November' },
  { number: 12, label: 'Des', full: 'Desember' },
];

const years = computed(() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => current - 3 + index);
});

const assetRows = computed(() => {
  return assets.value.map((asset) => ({
    ...asset,
    monthItems: months.map((month) => ({
      ...month,
      schedules: schedules.value.filter((schedule) => {
        const date = dateOnly(schedule.scheduledDate);
        if (!date) return false;
        const [year, monthNumber] = date.split('-').map(Number);
        return (
          Number(schedule.assetId) === Number(asset.id) &&
          year === Number(selectedYear.value) &&
          monthNumber === month.number
        );
      }),
    })),
  }));
});

const yearSummary = computed(() => {
  const all = schedules.value.filter((schedule) => {
    const date = dateOnly(schedule.scheduledDate);
    return date && Number(date.slice(0, 4)) === Number(selectedYear.value);
  });

  return {
    total: all.length,
    scheduled: all.filter((item) => item.status === 'SCHEDULED').length,
    overdue: all.filter((item) => item.status === 'OVERDUE').length,
    completed: all.filter((item) => item.status === 'COMPLETED').length,
  };
});

function defaultForm() {
  return {
    id: null,
    assetId: '',
    title: 'Preventive Maintenance',
    description: '',
    scheduledDate: '',
    repeatMonths: '',
  };
}

function dateOnly(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return [];
}

function errorText(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatDate(value) {
  const raw = dateOnly(value);
  if (!raw) return '-';
  const [year, month, day] = raw.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function statusLabel(status) {
  return ({
    SCHEDULED: 'Terjadwal',
    OVERDUE: 'Terlambat',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  })[status] || status || '-';
}

function statusClass(status) {
  return ({
    SCHEDULED: 'status-scheduled',
    OVERDUE: 'status-overdue',
    COMPLETED: 'status-completed',
    CANCELLED: 'status-cancelled',
  })[status] || 'status-cancelled';
}

function cellClass(items) {
  if (!items.length) return 'month-cell-empty';
  if (items.some((item) => item.status === 'OVERDUE')) return 'month-cell-overdue';
  if (items.every((item) => item.status === 'COMPLETED')) return 'month-cell-completed';
  if (items.every((item) => item.status === 'CANCELLED')) return 'month-cell-cancelled';
  return 'month-cell-scheduled';
}

async function loadAssets() {
  const response = await api.get('/assets', {
    params: { page: 1, limit: 100 },
  });
  assets.value = extractList(response.data, ['assets', 'items']);
}

async function loadAllSchedules() {
  const first = await api.get('/schedules', {
    params: { page: 1, limit: 100 },
  });

  const firstItems = extractList(first.data, ['schedules', 'items']);
  const pagination = first.data?.pagination || first.data?.data?.pagination;
  const totalPages = Number(pagination?.totalPages || 1);

  const all = [...firstItems];
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get('/schedules', {
      params: { page, limit: 100 },
    });
    all.push(...extractList(response.data, ['schedules', 'items']));
  }
  schedules.value = all;
}

async function loadPage() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await Promise.all([loadAssets(), loadAllSchedules()]);
  } catch (error) {
    errorMessage.value = errorText(error, 'Gagal memuat data jadwal tahunan.');
  } finally {
    loading.value = false;
  }
}

function openCell(asset, monthItem) {
  selectedAsset.value = asset;
  selectedMonth.value = monthItem;
  monthSchedules.value = monthItem.schedules;

  if (monthItem.schedules.length) {
    showMonthDetail.value = true;
    return;
  }

  if (canManage.value) openCreateForm(asset, monthItem);
}

function openCreateForm(asset, monthItem) {
  const year = Number(selectedYear.value);
  const month = String(monthItem.number).padStart(2, '0');
  form.value = {
    ...defaultForm(),
    assetId: String(asset.id),
    scheduledDate: `${year}-${month}-01`,
  };
  selectedAsset.value = asset;
  selectedMonth.value = monthItem;
  selectedSchedule.value = null;
  isEditMode.value = false;
  showMonthDetail.value = false;
  errorMessage.value = '';
  showForm.value = true;
}

async function openEditForm(schedule) {
  errorMessage.value = '';
  try {
    const response = await api.get(`/schedules/${schedule.id}`);
    const data = response.data?.data;
    if (!data) throw new Error('Data jadwal tidak ditemukan.');

    selectedSchedule.value = data;
    selectedAsset.value = data.asset || selectedAsset.value;
    form.value = {
      id: data.id,
      assetId: String(data.assetId),
      title: data.title || '',
      description: data.description || '',
      scheduledDate: dateOnly(data.scheduledDate),
      repeatMonths: data.repeatMonths == null ? '' : String(data.repeatMonths),
    };
    isEditMode.value = true;
    showMonthDetail.value = false;
    showForm.value = true;
  } catch (error) {
    errorMessage.value = errorText(error, 'Gagal mengambil detail jadwal.');
  }
}

function closeForm() {
  if (saving.value) return;
  showForm.value = false;
  form.value = defaultForm();
}

function closeMonthDetail() {
  showMonthDetail.value = false;
  selectedAsset.value = null;
  selectedMonth.value = null;
  monthSchedules.value = [];
}

async function submitForm() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!form.value.title.trim()) {
    errorMessage.value = 'Judul jadwal wajib diisi.';
    return;
  }
  if (!form.value.scheduledDate) {
    errorMessage.value = 'Tanggal jadwal wajib diisi.';
    return;
  }

  const chosenDate = dateOnly(form.value.scheduledDate);
  const [year, month] = chosenDate.split('-').map(Number);
  if (
    year !== Number(selectedYear.value) ||
    month !== Number(selectedMonth.value?.number)
  ) {
    errorMessage.value = 'Tanggal harus berada pada bulan dan tahun yang dipilih.';
    return;
  }

  const repeatMonths = form.value.repeatMonths === ''
    ? null
    : Number(form.value.repeatMonths);

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
      successMessage.value = 'Jadwal berhasil diperbarui.';
    } else {
      await api.post('/schedules', payload);
      successMessage.value = 'Jadwal berhasil ditambahkan.';
    }

    showForm.value = false;
    await loadPage();
  } catch (error) {
    errorMessage.value = errorText(error, 'Gagal menyimpan jadwal.');
  } finally {
    saving.value = false;
  }
}

function startMaintenance(schedule) {
  if (!schedule?.id) return;
  if (schedule.maintenanceRecord) {
    successMessage.value = `Jadwal ini sudah terhubung dengan catatan ${schedule.maintenanceRecord.maintenanceCode || `#${schedule.maintenanceRecord.id}`}. Buka menu Maintenance untuk melihat catatannya.`;
    return;
  }
  if (['COMPLETED', 'CANCELLED'].includes(schedule.status)) {
    errorMessage.value = 'Jadwal selesai atau dibatalkan tidak dapat dimulai lagi.';
    return;
  }

  router.push({
    name: 'maintenance',
    query: { scheduleId: String(schedule.id) },
  });
}

function canEdit(schedule) {
  return canManage.value &&
    !['COMPLETED', 'CANCELLED'].includes(schedule.status) &&
    !schedule.maintenanceRecord;
}

onMounted(loadPage);
</script>

<template>
  <div class="annual-page">
    <div class="page-heading">
      <div>
        <h3 class="fw-bold mb-1">Jadwal Tahunan Maintenance</h3>
        <p class="text-muted mb-0">Pantau dan kelola jadwal maintenance seluruh aset dalam satu tahun.</p>
      </div>
      <div class="year-picker">
        <label for="yearSelect" class="form-label small fw-semibold mb-1">Tahun</label>
        <select id="yearSelect" v-model.number="selectedYear" class="form-select" @change="loadPage">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      {{ successMessage }}
      <button class="btn-close" type="button" @click="successMessage = ''"></button>
    </div>
    <div v-if="errorMessage && !showForm" class="alert alert-danger alert-dismissible">
      {{ errorMessage }}
      <button class="btn-close" type="button" @click="errorMessage = ''"></button>
    </div>

    <div class="summary-grid">
      <div class="summary-card"><span>Total Jadwal Tahun {{ selectedYear }}</span><strong>{{ yearSummary.total }}</strong></div>
      <div class="summary-card"><span>Terjadwal</span><strong class="text-primary">{{ yearSummary.scheduled }}</strong></div>
      <div class="summary-card"><span>Terlambat</span><strong class="text-danger">{{ yearSummary.overdue }}</strong></div>
      <div class="summary-card"><span>Selesai</span><strong class="text-success">{{ yearSummary.completed }}</strong></div>
    </div>

    <div class="legend-row">
      <span><i class="legend-dot dot-scheduled"></i> Terjadwal</span>
      <span><i class="legend-dot dot-overdue"></i> Terlambat</span>
      <span><i class="legend-dot dot-completed"></i> Selesai</span>
      <span><i class="legend-dot dot-cancelled"></i> Dibatalkan</span>
      <span><i class="legend-dot dot-empty"></i> Belum ada jadwal</span>
    </div>

    <div class="card border-0 shadow-sm">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="text-muted mt-2 mb-0">Memuat jadwal tahunan...</p>
      </div>

      <div v-else-if="assets.length === 0" class="text-center py-5 text-muted">
        <i class="bi bi-pc-display display-5"></i>
        <p class="mt-3 mb-0">Belum ada data aset yang dapat ditampilkan.</p>
      </div>

      <div v-else class="table-responsive annual-table-wrap">
        <table class="table table-bordered align-middle annual-table mb-0">
          <thead>
            <tr>
              <th class="number-col">No</th>
              <th class="asset-col">Nama PC / Alat</th>
              <th class="location-col">Lokasi</th>
              <th v-for="month in months" :key="month.number" class="month-heading">{{ month.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(asset, index) in assetRows" :key="asset.id">
              <td class="text-center text-muted">{{ index + 1 }}</td>
              <td>
                <div class="fw-semibold">{{ asset.pcName || asset.assetName || '-' }}</div>
                <small class="text-muted">{{ asset.assetCode || '-' }}</small>
              </td>
              <td>{{ asset.location || '-' }}</td>
              <td v-for="month in asset.monthItems" :key="month.number" class="month-td">
                <button
                  type="button"
                  class="month-cell"
                  :class="cellClass(month.schedules)"
                  :title="month.schedules.length ? `${month.schedules.length} jadwal pada ${month.full}` : `Tambah jadwal ${month.full}`"
                  @click="openCell(asset, month)"
                >
                  <template v-if="month.schedules.length">
                    <strong>{{ month.schedules.length }}</strong>
                    <small>{{ month.schedules.length === 1 ? 'Jadwal' : 'Jadwal' }}</small>
                  </template>
                  <template v-else>
                    <i class="bi bi-plus-lg"></i>
                  </template>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-white small text-muted">
        Pilih sel bulan untuk melihat jadwal atau membuat jadwal baru. Aset tanpa jadwal tetap ditampilkan.
      </div>
    </div>

    <!-- Modal tambah / edit -->
    <div v-if="showForm" class="modal-backdrop-custom" @click.self="closeForm">
      <div class="modal-dialog-custom">
        <div class="modal-content-custom">
          <div class="modal-header">
            <div>
              <h5 class="fw-bold mb-1">{{ isEditMode ? 'Edit Jadwal Maintenance' : 'Tambah Jadwal Maintenance' }}</h5>
              <small class="text-muted">{{ selectedAsset?.pcName || selectedAsset?.assetName }} · {{ selectedMonth?.full }} {{ selectedYear }}</small>
            </div>
            <button type="button" class="btn-close" :disabled="saving" @click="closeForm"></button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="modal-body">
              <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

              <div class="mb-3">
                <label class="form-label fw-semibold">PC / Alat</label>
                <input class="form-control" :value="`${selectedAsset?.assetCode || ''} - ${selectedAsset?.pcName || selectedAsset?.assetName || ''}`" disabled>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Judul Jadwal <span class="text-danger">*</span></label>
                <input v-model="form.title" class="form-control" maxlength="150" required placeholder="Contoh: Preventive Maintenance">
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Deskripsi</label>
                <textarea v-model="form.description" class="form-control" rows="3" placeholder="Keterangan pekerjaan yang direncanakan"></textarea>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">Tanggal Pelaksanaan <span class="text-danger">*</span></label>
                  <input v-model="form.scheduledDate" type="date" class="form-control" :min="`${selectedYear}-${String(selectedMonth?.number).padStart(2, '0')}-01`" :max="`${selectedYear}-${String(selectedMonth?.number).padStart(2, '0')}-${new Date(selectedYear, selectedMonth?.number || 1, 0).getDate()}`" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label fw-semibold">Pengulangan</label>
                  <select v-model="form.repeatMonths" class="form-select">
                    <option value="">Tidak berulang</option>
                    <option value="1">Setiap 1 bulan</option>
                    <option value="2">Setiap 2 bulan</option>
                    <option value="3">Setiap 3 bulan</option>
                    <option value="6">Setiap 6 bulan</option>
                    <option value="12">Setiap 12 bulan</option>
                  </select>
                </div>
              </div>
              <div class="alert alert-info mb-0 small">
                Jadwal dibuat untuk aset dan bulan yang dipilih. Jika menggunakan pengulangan, sistem mengikuti mekanisme jadwal berkala yang sudah tersedia.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" :disabled="saving" @click="closeForm">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ saving ? 'Menyimpan...' : 'Simpan Jadwal' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal daftar jadwal pada satu bulan -->
    <div v-if="showMonthDetail" class="modal-backdrop-custom" @click.self="closeMonthDetail">
      <div class="modal-dialog-custom modal-dialog-wide">
        <div class="modal-content-custom">
          <div class="modal-header">
            <div>
              <h5 class="fw-bold mb-1">Jadwal {{ selectedMonth?.full }} {{ selectedYear }}</h5>
              <small class="text-muted">{{ selectedAsset?.assetCode }} · {{ selectedAsset?.pcName || selectedAsset?.assetName }}</small>
            </div>
            <button type="button" class="btn-close" @click="closeMonthDetail"></button>
          </div>
          <div class="modal-body">
            <div v-for="schedule in monthSchedules" :key="schedule.id" class="schedule-item">
              <div class="schedule-main">
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <strong>{{ schedule.title }}</strong>
                  <span class="status-pill" :class="statusClass(schedule.status)">{{ statusLabel(schedule.status) }}</span>
                </div>
                <div class="small text-muted mb-1">{{ formatDate(schedule.scheduledDate) }} · Jadwal #{{ schedule.id }}</div>
                <p class="small mb-1">{{ schedule.description || 'Tidak ada deskripsi.' }}</p>
                <div v-if="schedule.maintenanceRecord" class="small text-info-emphasis">
                  Terhubung: {{ schedule.maintenanceRecord.maintenanceCode || `Maintenance #${schedule.maintenanceRecord.id}` }}
                </div>
              </div>
              <div class="schedule-actions">
                <button v-if="canEdit(schedule)" class="btn btn-sm btn-outline-warning" type="button" @click="openEditForm(schedule)">
                  <i class="bi bi-pencil-square me-1"></i>Edit
                </button>
                <button
                  v-if="canManage && !schedule.maintenanceRecord && !['COMPLETED', 'CANCELLED'].includes(schedule.status)"
                  class="btn btn-sm btn-success"
                  type="button"
                  @click="startMaintenance(schedule)"
                >
                  <i class="bi bi-play-fill me-1"></i>Mulai Maintenance
                </button>
                <button
                  v-else-if="schedule.maintenanceRecord"
                  class="btn btn-sm btn-outline-secondary"
                  type="button"
                  disabled
                  :title="`Sudah terhubung ke ${schedule.maintenanceRecord.maintenanceCode || 'catatan maintenance'}`"
                >
                  <i class="bi bi-check2-circle me-1"></i>Sudah Diproses
                </button>
              </div>
            </div>
            <div v-if="canManage" class="pt-3">
              <button type="button" class="btn btn-outline-primary btn-sm" @click="openCreateForm(selectedAsset, selectedMonth)">
                <i class="bi bi-plus-lg me-1"></i>Tambah Jadwal di Bulan Ini
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" @click="closeMonthDetail">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annual-page { min-width: 0; }
.page-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 1.5rem; }
.year-picker { width: 150px; flex: 0 0 150px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
.summary-card { background: #fff; border: 1px solid #e8edf3; border-radius: 12px; padding: 1rem 1.15rem; box-shadow: 0 2px 8px rgba(15, 23, 42, .04); }
.summary-card span { display: block; color: #64748b; font-size: .82rem; margin-bottom: .35rem; }
.summary-card strong { display: block; font-size: 1.6rem; line-height: 1.2; }
.legend-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; color: #64748b; font-size: .8rem; }
.legend-row span { display: inline-flex; align-items: center; gap: .4rem; }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot-scheduled { background: #2563eb; } .dot-overdue { background: #dc3545; } .dot-completed { background: #198754; } .dot-cancelled { background: #94a3b8; } .dot-empty { background: #e2e8f0; }
.annual-table-wrap { overflow-x: auto; }
.annual-table { min-width: 1120px; font-size: .82rem; }
.annual-table thead th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: center; white-space: nowrap; padding: .85rem .5rem; }
.annual-table tbody td { padding: .45rem; }
.number-col { width: 48px; } .asset-col { min-width: 190px; text-align: left !important; } .location-col { min-width: 130px; text-align: left !important; } .month-heading { min-width: 62px; }
.month-td { min-width: 62px; text-align: center; }
.month-cell { border: 1px solid transparent; border-radius: 7px; width: 100%; min-width: 48px; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transition: .15s ease; }
.month-cell strong { font-size: 1rem; line-height: 1.1; } .month-cell small { font-size: .62rem; }
.month-cell-empty { color: #94a3b8; background: #f8fafc; border-color: #e2e8f0; }
.month-cell-empty:hover { color: #2563eb; background: #eff6ff; border-color: #93c5fd; }
.month-cell-scheduled { color: #1d4ed8; background: #dbeafe; border-color: #bfdbfe; }
.month-cell-overdue { color: #b91c1c; background: #fee2e2; border-color: #fecaca; }
.month-cell-completed { color: #166534; background: #dcfce7; border-color: #bbf7d0; }
.month-cell-cancelled { color: #475569; background: #e2e8f0; border-color: #cbd5e1; }
.month-cell:hover { filter: brightness(.97); transform: translateY(-1px); }
.modal-backdrop-custom { position: fixed; inset: 0; z-index: 1055; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 1rem; background: rgba(15, 23, 42, .65); backdrop-filter: blur(3px); }
.modal-dialog-custom { width: 100%; max-width: 680px; max-height: calc(100dvh - 2rem); margin: auto; }
.modal-dialog-wide { max-width: 850px; }
.modal-content-custom { display: flex; flex-direction: column; max-height: calc(100dvh - 2rem); min-height: 0; overflow: hidden; background: #fff; border-radius: 14px; box-shadow: 0 1.25rem 3rem rgba(0,0,0,.2); }
.modal-content-custom form { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.modal-header, .modal-footer { flex: 0 0 auto; padding: 1.1rem 1.4rem; border-color: #edf0f2; }
.modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 1.4rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: .5rem; background: #fff; }
.schedule-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #edf0f2; }
.schedule-item:first-child { padding-top: 0; }
.schedule-main { min-width: 0; }
.schedule-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .4rem; flex: 0 0 auto; }
.status-pill { display: inline-block; border-radius: 20px; padding: .2rem .55rem; font-size: .7rem; font-weight: 700; }
.status-scheduled { color: #1d4ed8; background: #dbeafe; }
.status-overdue { color: #b91c1c; background: #fee2e2; }
.status-completed { color: #166534; background: #dcfce7; }
.status-cancelled { color: #475569; background: #e2e8f0; }
@media (max-width: 768px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .page-heading { align-items: stretch; flex-direction: column; }
  .year-picker { width: 100%; }
}
@media (max-width: 576px) {
  .modal-backdrop-custom { align-items: flex-start; padding: .65rem; }
  .modal-dialog-custom, .modal-content-custom { max-height: calc(100dvh - 1.3rem); }
  .modal-header, .modal-body { padding: 1rem; }
  .schedule-item { align-items: flex-start; flex-direction: column; }
  .schedule-actions { justify-content: flex-start; }
}
</style>
