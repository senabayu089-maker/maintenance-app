
<template>
  <div>
    <!-- PAGE HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
      <div>
        <h3 class="fw-bold mb-1">Kategori Aset</h3>
        <p class="text-muted mb-0">
          Kelola kategori perangkat dan inventaris.
        </p>
      </div>

      <button
        v-if="canManage"
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <i class="bi bi-plus-lg me-2"></i>
        Tambah Kategori
      </button>
    </div>

    <!-- ALERT -->
    <div
      v-if="successMessage"
      class="alert alert-success alert-dismissible"
    >
      {{ successMessage }}
      <button
        type="button"
        class="btn-close"
        @click="successMessage = ''"
      ></button>
    </div>

    <div
      v-if="errorMessage"
      class="alert alert-danger alert-dismissible"
    >
      {{ errorMessage }}
      <button
        type="button"
        class="btn-close"
        @click="errorMessage = ''"
      ></button>
    </div>

    <!-- SUMMARY -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Total Kategori</div>
            <h3 class="fw-bold mb-0">{{ categories.length }}</h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Kategori Aktif</div>
            <h3 class="fw-bold text-success mb-0">
              {{ activeCount }}
            </h3>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Kategori Nonaktif</div>
            <h3 class="fw-bold text-secondary mb-0">
              {{ inactiveCount }}
            </h3>
          </div>
        </div>
      </div>
    </div>

    <!-- FILTER -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-7">
            <label class="form-label">Cari Kategori</label>
            <input
              v-model="search"
              type="text"
              class="form-control"
              placeholder="Nama atau deskripsi kategori..."
            />
          </div>

          <div class="col-md-5">
            <label class="form-label">Status</label>
            <select
              v-model="statusFilter"
              class="form-select"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h6 class="fw-bold mb-0">Daftar Kategori</h6>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th width="60">No.</th>
              <th>Nama Kategori</th>
              <th>Deskripsi</th>
              <th class="text-center">Jumlah Aset</th>
              <th class="text-center">Status</th>
              <th
                v-if="canManage"
                class="text-center"
                width="190"
              >
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td
                :colspan="canManage ? 6 : 5"
                class="text-center py-4"
              >
                <div class="spinner-border spinner-border-sm me-2"></div>
                Memuat kategori...
              </td>
            </tr>

            <tr
              v-else-if="filteredCategories.length === 0"
            >
              <td
                :colspan="canManage ? 6 : 5"
                class="text-center text-muted py-4"
              >
                Tidak ada kategori ditemukan.
              </td>
            </tr>

            <tr
              v-for="(category, index) in filteredCategories"
              :key="category.id"
            >
              <td>{{ index + 1 }}</td>

              <td>
                <div class="fw-semibold">
                  {{ category.name }}
                </div>
              </td>

              <td>
                {{ category.description || '-' }}
              </td>

              <td class="text-center">
                <span class="badge bg-info text-dark">
                  {{ category._count?.assets ?? 0 }}
                </span>
              </td>

              <td class="text-center">
                <span
                  class="badge"
                  :class="category.isActive
                    ? 'bg-success'
                    : 'bg-secondary'"
                >
                  {{ category.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>

              <td
                v-if="canManage"
                class="text-center"
              >
                <div class="d-flex justify-content-center gap-1">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    title="Edit"
                    @click="openEditModal(category)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    class="btn btn-sm"
                    :class="category.isActive
                      ? 'btn-outline-secondary'
                      : 'btn-outline-success'"
                    :title="category.isActive
                      ? 'Nonaktifkan'
                      : 'Aktifkan'"
                    @click="toggleStatus(category)"
                  >
                    <i
                      class="bi"
                      :class="category.isActive
                        ? 'bi-toggle-on'
                        : 'bi-toggle-off'"
                    ></i>
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    title="Hapus"
                    @click="deleteCategory(category)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer bg-white text-muted small">
        Menampilkan {{ filteredCategories.length }} kategori.
      </div>
    </div>

    <!-- MODAL FORM -->
    <div
      v-if="showModal"
      class="modal-backdrop-custom"
      @click.self="closeModal"
    >
      <div class="modal-dialog-custom">
        <div class="card border-0 shadow">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold mb-0">
              {{ isEdit ? 'Edit Kategori' : 'Tambah Kategori' }}
            </h5>

            <button
              class="btn-close"
              :disabled="saving"
              @click="closeModal"
            ></button>
          </div>

          <form @submit.prevent="saveCategory">
            <div class="card-body">
              <div
                v-if="modalError"
                class="alert alert-danger"
              >
                {{ modalError }}
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Nama Kategori <span class="text-danger">*</span>
                </label>

                <input
                  v-model="form.name"
                  type="text"
                  class="form-control"
                  maxlength="100"
                  placeholder="Contoh: PC, Printer, Scanner"
                  required
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Deskripsi</label>

                <textarea
                  v-model="form.description"
                  class="form-control"
                  rows="3"
                  placeholder="Deskripsi kategori (opsional)"
                ></textarea>
              </div>
            </div>

            <div class="card-footer bg-white d-flex justify-content-end gap-2">
              <button
                type="button"
                class="btn btn-light"
                :disabled="saving"
                @click="closeModal"
              >
                Batal
              </button>

              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving"
              >
                <span
                  v-if="saving"
                  class="spinner-border spinner-border-sm me-2"
                ></span>

                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const categories = ref([]);

const loading = ref(false);
const saving = ref(false);

const search = ref('');
const statusFilter = ref('ALL');

const showModal = ref(false);
const isEdit = ref(false);
const editingId = ref(null);

const successMessage = ref('');
const errorMessage = ref('');
const modalError = ref('');

const form = ref({
  name: '',
  description: '',
});

const canManage = computed(() => {
  return auth.isAdmin || auth.isTechnician;
});

const activeCount = computed(() => {
  return categories.value.filter(item => item.isActive).length;
});

const inactiveCount = computed(() => {
  return categories.value.filter(item => !item.isActive).length;
});

const filteredCategories = computed(() => {
  return categories.value.filter(category => {
    const keyword = search.value.toLowerCase();

    const matchesSearch =
      !keyword ||
      category.name?.toLowerCase().includes(keyword) ||
      category.description?.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter.value === 'ALL' ||
      (statusFilter.value === 'ACTIVE' && category.isActive) ||
      (statusFilter.value === 'INACTIVE' && !category.isActive);

    return matchesSearch && matchesStatus;
  });
});

const getErrorMessage = (error, fallback) => {
  return error.response?.data?.message || fallback;
};

const fetchCategories = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/asset-categories');

    categories.value = response.data.data || [];
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      'Gagal mengambil data kategori.',
    );
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
  };

  editingId.value = null;
  isEdit.value = false;
  modalError.value = '';
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openEditModal = (category) => {
  resetForm();

  isEdit.value = true;
  editingId.value = category.id;

  form.value = {
    name: category.name || '',
    description: category.description || '',
  };

  showModal.value = true;
};

const closeModal = () => {
  if (saving.value) return;

  showModal.value = false;
  resetForm();
};

const saveCategory = async () => {
  if (!form.value.name.trim()) {
    modalError.value = 'Nama kategori wajib diisi.';
    return;
  }

  saving.value = true;
  modalError.value = '';

  const payload = {
    name: form.value.name.trim(),
    description: form.value.description.trim() || null,
  };

  try {
    if (isEdit.value) {
      await api.patch(
        `/asset-categories/${editingId.value}`,
        payload,
      );

      successMessage.value = 'Kategori berhasil diperbarui.';
    } else {
      await api.post('/asset-categories', payload);

      successMessage.value = 'Kategori berhasil ditambahkan.';
    }

    showModal.value = false;
    resetForm();

    await fetchCategories();
  } catch (error) {
    modalError.value = getErrorMessage(
      error,
      'Gagal menyimpan kategori.',
    );
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (category) => {
  const action = category.isActive ? 'menonaktifkan' : 'mengaktifkan';

  if (!window.confirm(`Yakin ingin ${action} kategori "${category.name}"?`)) {
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';

  try {
    await api.patch(
      `/asset-categories/${category.id}/status`,
      {
        isActive: !category.isActive,
      },
    );

    successMessage.value = 'Status kategori berhasil diperbarui.';

    await fetchCategories();
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      'Gagal mengubah status kategori.',
    );
  }
};

const deleteCategory = async (category) => {
  if (!window.confirm(
    `Yakin ingin menghapus kategori "${category.name}"?`,
  )) {
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';

  try {
    await api.delete(`/asset-categories/${category.id}`);

    successMessage.value = 'Kategori berhasil dihapus.';

    await fetchCategories();
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      'Gagal menghapus kategori.',
    );
  }
};

onMounted(() => {
  fetchCategories();
});
</script>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.modal-dialog-custom {
  width: 100%;
  max-width: 500px;
  margin: auto;
}

.table th {
  white-space: nowrap;
  font-size: 13px;
}

.table td {
  font-size: 14px;
}

.card {
  border-radius: 10px;
}

@media (max-width: 576px) {
  .modal-backdrop-custom {
    align-items: flex-start;
  }
}
</style>
