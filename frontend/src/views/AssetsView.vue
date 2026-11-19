
<template>
  <div class="assets-page">
    <div class="page-header">
      <div>
        <h2>Inventaris Aset</h2>
        <p>Kelola seluruh inventaris dan spesifikasi aset.</p>
      </div>

      <button
        v-if="canManage"
        class="btn btn-primary"
        @click="openCreate"
      >
        <i class="bi bi-plus-lg me-2"></i>
        Tambah Aset
      </button>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-icon blue">
          <i class="bi bi-box-seam"></i>
        </div>
        <div>
          <span>Total Aset</span>
          <h3>{{ pagination.total }}</h3>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-icon green">
          <i class="bi bi-check-circle"></i>
        </div>
        <div>
          <span>Active</span>
          <h3>{{ statusCounts.ACTIVE }}</h3>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-icon orange">
          <i class="bi bi-tools"></i>
        </div>
        <div>
          <span>Maintenance</span>
          <h3>{{ statusCounts.MAINTENANCE }}</h3>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-icon red">
          <i class="bi bi-exclamation-circle"></i>
        </div>
        <div>
          <span>Broken</span>
          <h3>{{ statusCounts.BROKEN }}</h3>
        </div>
      </div>
    </div>

    <div class="content-card">
      <div class="filter-bar">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            v-model="search"
            type="search"
            class="form-control"
            placeholder="Cari kode, nama, merek, model, lokasi..."
            @keyup.enter="applyFilters"
          />
        </div>

        <select
          v-model="categoryFilter"
          class="form-select category-filter"
        >
          <option value="">Semua Kategori</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="String(category.id)"
          >
            {{ category.name }}
            {{ category.isActive === false ? '(Nonaktif)' : '' }}
          </option>
        </select>

        <select
          v-model="statusFilter"
          class="form-select status-filter"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Active</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="BROKEN">Broken</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <button
          class="btn btn-outline-secondary"
          @click="applyFilters"
        >
          <i class="bi bi-search me-1"></i>
          Cari
        </button>
      </div>

      <div v-if="errorMessage" class="alert alert-danger mx-3">
        {{ errorMessage }}
      </div>

      <div class="table-responsive">
        <table class="table align-middle asset-table">
          <thead>
            <tr>
              <th>Asset Code</th>
              <th>Nama Aset</th>
              <th>Kategori</th>
              <th>Merek / Model</th>
              <th>Lokasi</th>
              <th>Pengguna</th>
              <th>Status</th>
              <th class="text-end">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 mb-0 text-muted">
                  Memuat data inventaris...
                </p>
              </td>
            </tr>

            <tr v-else-if="assets.length === 0">
              <td colspan="8" class="text-center py-5">
                <i class="bi bi-box-seam empty-icon"></i>
                <h6 class="mt-3">Belum ada data aset</h6>
                <p class="text-muted small">
                  Tambahkan aset untuk mulai mengelola inventaris.
                </p>
              </td>
            </tr>

            <tr
              v-for="asset in assets"
              v-else
              :key="asset.id"
            >
              <td>
                <strong>{{ asset.assetCode }}</strong>
                <small class="d-block text-muted">
                  {{ asset.serialNumber || '-' }}
                </small>
              </td>

              <td>
                <strong>{{ asset.name }}</strong>
                <small class="d-block text-muted">
                  {{ asset.department || '-' }}
                </small>
              </td>

              <td>
                <span class="category-badge">
                  {{ asset.category?.name || '-' }}
                </span>
              </td>

              <td>
                <span>{{ asset.brand || '-' }}</span>
                <small class="d-block text-muted">
                  {{ asset.model || '-' }}
                </small>
              </td>

              <td>{{ asset.location || '-' }}</td>

              <td>{{ asset.assignedTo || '-' }}</td>

              <td>
                <span
                  class="status-badge"
                  :class="statusClass(asset.status)"
                >
                  {{ statusLabel(asset.status) }}
                </span>
              </td>

              <td class="text-end text-nowrap">
                <button
                  class="btn btn-sm btn-outline-secondary me-1"
                  title="Detail"
                  @click="viewAsset(asset)"
                >
                  <i class="bi bi-eye"></i>
                </button>

                <button
                  v-if="canManage"
                  class="btn btn-sm btn-outline-primary"
                  title="Edit"
                  @click="openEdit(asset)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <span class="text-muted small">
          Menampilkan
          {{ assets.length ? (pagination.page - 1) * pagination.limit + 1 : 0 }}
          sampai
          {{ (pagination.page - 1) * pagination.limit + assets.length }}
          dari {{ pagination.total }} aset
        </span>

        <div class="d-flex align-items-center gap-2">
          <select
            v-model.number="pagination.limit"
            class="form-select form-select-sm page-size"
            @change="changeLimit"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>

          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="pagination.page <= 1 || loading"
            @click="changePage(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <span class="small">
            {{ pagination.page }} /
            {{ Math.max(pagination.totalPages, 1) }}
          </span>

          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="pagination.page >= pagination.totalPages || loading"
            @click="changePage(pagination.page + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <AssetForm
      :visible="showForm"
      :asset="selectedAsset"
      @close="closeForm"
      @saved="handleSaved"
    />

    <!-- Detail aset -->
    <div
      v-if="detailAsset"
      class="modal-backdrop-custom"
      @click.self="detailAsset = null"
    >
      <div class="detail-modal">
        <div class="detail-header">
          <div>
            <h4>{{ detailAsset.name }}</h4>
            <p>{{ detailAsset.assetCode }}</p>
          </div>

          <button
            class="btn-close"
            @click="detailAsset = null"
          ></button>
        </div>

        <div class="detail-body">
          <h6>Informasi Aset</h6>

          <div class="detail-grid">
            <div>
              <span>Kode Aset</span>
              <strong>{{ detailAsset.assetCode }}</strong>
            </div>

            <div>
              <span>Nama Aset</span>
              <strong>{{ detailAsset.name }}</strong>
            </div>

            <div>
              <span>Kategori</span>
              <strong>{{ detailAsset.category?.name || '-' }}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {{ statusLabel(detailAsset.status) }}
              </strong>
            </div>

            <div>
              <span>Merek</span>
              <strong>{{ detailAsset.brand || '-' }}</strong>
            </div>

            <div>
              <span>Model</span>
              <strong>{{ detailAsset.model || '-' }}</strong>
            </div>

            <div>
              <span>Nomor Seri</span>
              <strong>{{ detailAsset.serialNumber || '-' }}</strong>
            </div>

            <div>
              <span>Lokasi</span>
              <strong>{{ detailAsset.location || '-' }}</strong>
            </div>

            <div>
              <span>Departemen</span>
              <strong>{{ detailAsset.department || '-' }}</strong>
            </div>

            <div>
              <span>Pengguna</span>
              <strong>{{ detailAsset.assignedTo || '-' }}</strong>
            </div>

            <div>
              <span>Tanggal Pembelian</span>
              <strong>{{ formatDate(detailAsset.purchaseDate) }}</strong>
            </div>

            <div>
              <span>Garansi Berakhir</span>
              <strong>{{ formatDate(detailAsset.warrantyEnd) }}</strong>
            </div>
          </div>

          <hr />

          <h6>Spesifikasi Aset</h6>

          <div
            v-if="specificationEntries.length"
            class="detail-grid"
          >
            <div
              v-for="[key, value] in specificationEntries"
              :key="key"
            >
              <span>{{ formatSpecificationKey(key) }}</span>
              <strong>{{ formatSpecificationValue(value) }}</strong>
            </div>
          </div>

          <p
            v-else
            class="text-muted small mb-0"
          >
            Belum ada spesifikasi tambahan.
          </p>

          <hr />

          <h6>Catatan</h6>
          <p class="text-muted mb-0">
            {{ detailAsset.notes || 'Tidak ada catatan.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';
import AssetForm from '../components/assets/AssetForm.vue';

const auth = useAuthStore();

const assets = ref([]);
const categories = ref([]);

const loading = ref(false);
const categoryLoading = ref(false);

const errorMessage = ref('');
const categoryError = ref('');

const search = ref('');
const statusFilter = ref('ALL');
const categoryFilter = ref('');

const showForm = ref(false);
const selectedAsset = ref(null);
const detailAsset = ref(null);

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const canManage = computed(() =>
  ['ADMIN', 'TECHNICIAN'].includes(auth.userRole),
);

const statusCounts = computed(() => ({
  ACTIVE: assets.value.filter((item) => item.status === 'ACTIVE').length,
  MAINTENANCE: assets.value.filter((item) => item.status === 'MAINTENANCE').length,
  BROKEN: assets.value.filter((item) => item.status === 'BROKEN').length,
}));

const specificationEntries = computed(() => {
  const specifications = detailAsset.value?.specifications;

  if (
    !specifications ||
    typeof specifications !== 'object' ||
    Array.isArray(specifications)
  ) {
    return [];
  }

  return Object.entries(specifications);
});

const statusLabel = (status) => ({
  ACTIVE: 'Active',
  MAINTENANCE: 'Maintenance',
  BROKEN: 'Broken',
  INACTIVE: 'Inactive',
}[status] || status || '-');

const statusClass = (status) => ({
  ACTIVE: 'status-active',
  MAINTENANCE: 'status-maintenance',
  BROKEN: 'status-broken',
  INACTIVE: 'status-inactive',
}[status] || '');

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatSpecificationKey = (key) => {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatSpecificationValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const loadCategories = async () => {
  categoryLoading.value = true;
  categoryError.value = '';

  try {
    const response = await api.get('/asset-categories', {
      params: {
        status: 'ALL',
      },
    });

    categories.value =
      response.data.data ||
      response.data.categories ||
      [];
  } catch (error) {
    categoryError.value =
      error.response?.data?.message ||
      'Tidak dapat mengambil daftar kategori aset.';
  } finally {
    categoryLoading.value = false;
  }
};

const loadAssets = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/assets', {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        search: search.value.trim(),
        status: statusFilter.value,
        categoryId: categoryFilter.value || undefined,
      },
    });

    assets.value = response.data.data || [];

    pagination.value = {
      ...pagination.value,
      ...response.data.pagination,
    };
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Tidak dapat mengambil data inventaris aset.';
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  pagination.value.page = 1;
  await loadAssets();
};

const openCreate = () => {
  selectedAsset.value = null;
  showForm.value = true;
};

const openEdit = (asset) => {
  selectedAsset.value = { ...asset };
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  selectedAsset.value = null;
};

const handleSaved = async () => {
  closeForm();
  await loadAssets();
};

const viewAsset = async (asset) => {
  errorMessage.value = '';

  try {
    const response = await api.get(`/assets/${asset.id}`);
    detailAsset.value = response.data.data;
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Gagal mengambil detail aset.';
  }
};

const changePage = async (page) => {
  pagination.value.page = page;
  await loadAssets();
};

const changeLimit = async () => {
  pagination.value.page = 1;
  await loadAssets();
};

watch([statusFilter, categoryFilter], async () => {
  pagination.value.page = 1;
  await loadAssets();
});

onMounted(async () => {
  await Promise.all([
    loadCategories(),
    loadAssets(),
  ]);
});
</script>

<style scoped>
.assets-page {
  padding: 25px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 25px;
}

.page-header h2 {
  font-size: 23px;
  font-weight: 750;
  margin: 0 0 6px;
  color: #1e293b;
}

.page-header p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.summary-card {
  background: white;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.summary-card span {
  font-size: 13px;
  color: #64748b;
}

.summary-card h3 {
  font-size: 24px;
  font-weight: 750;
  margin: 3px 0 0;
}

.summary-icon {
  width: 45px;
  height: 45px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}

.blue {
  background: #dbeafe;
  color: #2563eb;
}

.green {
  background: #dcfce7;
  color: #15803d;
}

.orange {
  background: #ffedd5;
  color: #c2410c;
}

.red {
  background: #fee2e2;
  color: #dc2626;
}

.content-card {
  background: white;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  overflow: hidden;
}

.filter-bar {
  padding: 18px;
  display: flex;
  gap: 10px;
  border-bottom: 1px solid #edf0f4;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.search-box i {
  position: absolute;
  left: 13px;
  top: 11px;
  color: #94a3b8;
}

.search-box input {
  padding-left: 38px;
}

.category-filter {
  max-width: 210px;
}

.status-filter {
  max-width: 170px;
}

.asset-table {
  margin: 0;
  font-size: 13px;
}

.asset-table th {
  padding: 15px;
  color: #64748b;
  font-weight: 650;
  background: #f8fafc;
  white-space: nowrap;
}

.asset-table td {
  padding: 15px;
  color: #334155;
}

.asset-table small {
  font-size: 11px;
  margin-top: 4px;
}

.category-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 7px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-maintenance {
  background: #ffedd5;
  color: #c2410c;
}

.status-broken {
  background: #fee2e2;
  color: #b91c1c;
}

.status-inactive {
  background: #e2e8f0;
  color: #475569;
}

.empty-icon {
  font-size: 38px;
  color: #cbd5e1;
}

.pagination-bar {
  padding: 15px 18px;
  border-top: 1px solid #edf0f4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-size {
  width: 70px;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1055;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-modal {
  width: 100%;
  max-width: 750px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 14px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  padding: 22px 25px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-header h4 {
  font-size: 19px;
  font-weight: 700;
  margin: 0;
}

.detail-header p {
  color: #64748b;
  margin: 5px 0 0;
}

.detail-body {
  padding: 25px;
}

.detail-body h6 {
  font-weight: 700;
  margin-bottom: 15px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.detail-grid div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-grid span {
  color: #64748b;
  font-size: 12px;
}

.detail-grid strong {
  color: #334155;
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 1100px) {
  .filter-bar {
    flex-wrap: wrap;
  }

  .search-box {
    flex-basis: 100%;
  }
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .assets-page {
    padding: 15px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-bar {
    flex-direction: column;
  }

  .category-filter,
  .status-filter {
    max-width: none;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
