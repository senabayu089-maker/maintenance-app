
<template>
  <div
    v-if="visible"
    class="modal-backdrop-custom"
    @click.self="close"
  >
    <div class="asset-modal">
      <!-- HEADER -->
      <div class="modal-header-custom">
        <div>
          <h4>{{ isEdit ? 'Edit Aset' : 'Tambah Aset Baru' }}</h4>
          <p>Masukkan informasi dan spesifikasi perangkat.</p>
        </div>

        <button
          class="btn-close"
          :disabled="saving"
          @click="close"
        ></button>
      </div>

      <form @submit.prevent="submitForm">
        <div class="modal-body-custom">
          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>

          <!-- IDENTITAS ASET -->
          <h6 class="section-title">Identitas Aset</h6>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">
                Asset Code <span class="text-danger">*</span>
              </label>

              <input
                v-model.trim="form.assetCode"
                class="form-control"
                maxlength="50"
                placeholder="AST-001"
                required
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">
                Nama Aset <span class="text-danger">*</span>
              </label>

              <input
                v-model.trim="form.name"
                class="form-control"
                maxlength="150"
                placeholder="Contoh: PC Accounting 01"
                required
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">
                Kategori <span class="text-danger">*</span>
              </label>

              <select
                v-model="form.categoryId"
                class="form-select"
                required
                :disabled="loadingCategories"
              >
                <option value="">
                  {{ loadingCategories
                    ? 'Memuat kategori...'
                    : 'Pilih kategori aset' }}
                </option>

                <option
                  v-for="category in availableCategories"
                  :key="category.id"
                  :value="String(category.id)"
                  :disabled="!category.isActive"
                >
                  {{ category.name }}
                  {{ category.isActive ? '' : '(Nonaktif)' }}
                </option>
              </select>

              <small
                v-if="categoryError"
                class="text-danger"
              >
                {{ categoryError }}
              </small>
            </div>

            <div class="col-md-6">
              <label class="form-label">Nomor Seri</label>

              <input
                v-model.trim="form.serialNumber"
                class="form-control"
                placeholder="Serial number perangkat"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Merek / Brand</label>

              <input
                v-model.trim="form.brand"
                class="form-control"
                placeholder="Contoh: HP, Dell, Epson"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Model</label>

              <input
                v-model.trim="form.model"
                class="form-control"
                placeholder="Model perangkat"
              />
            </div>
          </div>

          <hr class="my-4" />

          <!-- INFORMASI PENEMPATAN -->
          <h6 class="section-title">Informasi Penempatan</h6>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Lokasi</label>

              <input
                v-model.trim="form.location"
                class="form-control"
                placeholder="Contoh: Ruang Accounting"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Departemen</label>

              <input
                v-model.trim="form.department"
                class="form-control"
                placeholder="Contoh: Accounting"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Pengguna / Penanggung Jawab</label>

              <input
                v-model.trim="form.assignedTo"
                class="form-control"
                placeholder="Nama pengguna"
              />
            </div>
          </div>

          <hr class="my-4" />

          <!-- SPESIFIKASI -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 class="section-title mb-1">Spesifikasi Perangkat</h6>
              <small class="text-muted">
                Tambahkan spesifikasi sesuai jenis perangkat.
              </small>
            </div>

            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="addSpecification"
            >
              <i class="bi bi-plus-lg me-1"></i>
              Tambah Spesifikasi
            </button>
          </div>

          <div
            v-if="specificationRows.length === 0"
            class="empty-specification"
          >
            Belum ada spesifikasi tambahan.
          </div>

          <div
            v-for="(item, index) in specificationRows"
            :key="item.id"
            class="specification-row"
          >
            <div class="row g-2 align-items-center">
              <div class="col-5">
                <input
                  v-model.trim="item.key"
                  class="form-control"
                  placeholder="Nama spesifikasi"
                />
              </div>

              <div class="col">
                <input
                  v-model.trim="item.value"
                  class="form-control"
                  placeholder="Nilai spesifikasi"
                />
              </div>

              <div class="col-auto">
                <button
                  type="button"
                  class="btn btn-outline-danger"
                  title="Hapus spesifikasi"
                  @click="removeSpecification(index)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <hr class="my-4" />

          <!-- INFORMASI TAMBAHAN -->
          <h6 class="section-title">Informasi Tambahan</h6>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Tanggal Pembelian</label>

              <input
                v-model="form.purchaseDate"
                type="date"
                class="form-control"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Garansi Berakhir</label>

              <input
                v-model="form.warrantyEnd"
                type="date"
                class="form-control"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">Status Aset</label>

              <select
                v-model="form.status"
                class="form-select"
              >
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="BROKEN">Broken</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div class="col-12">
              <label class="form-label">Catatan</label>

              <textarea
                v-model.trim="form.notes"
                class="form-control"
                rows="3"
                placeholder="Catatan tambahan mengenai aset"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="modal-footer-custom">
          <button
            type="button"
            class="btn btn-light"
            @click="close"
            :disabled="saving"
          >
            Batal
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            :disabled="saving || loadingCategories"
          >
            <span
              v-if="saving"
              class="spinner-border spinner-border-sm me-2"
            ></span>

            {{ saving
              ? 'Menyimpan...'
              : (isEdit ? 'Simpan Perubahan' : 'Tambah Aset') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '../../services/api.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  asset: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const saving = ref(false);
const loadingCategories = ref(false);

const errorMessage = ref('');
const categoryError = ref('');

const categories = ref([]);
const specificationRows = ref([]);

let specificationCounter = 0;

const isEdit = computed(() => Boolean(props.asset?.id));

const form = reactive({
  assetCode: '',
  name: '',
  categoryId: '',
  brand: '',
  model: '',
  serialNumber: '',
  location: '',
  department: '',
  assignedTo: '',
  purchaseDate: '',
  warrantyEnd: '',
  status: 'ACTIVE',
  notes: '',
});

const availableCategories = computed(() => {
  return categories.value;
});

const resetForm = () => {
  Object.assign(form, {
    assetCode: '',
    name: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    location: '',
    department: '',
    assignedTo: '',
    purchaseDate: '',
    warrantyEnd: '',
    status: 'ACTIVE',
    notes: '',
  });

  specificationRows.value = [];
  specificationCounter = 0;

  errorMessage.value = '';
};

const formatDate = (value) => {
  if (!value) return '';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const loadCategories = async () => {
  loadingCategories.value = true;
  categoryError.value = '';

  try {
    const response = await api.get('/asset-categories', {
      params: {
        status: 'ALL',
      },
    });

    categories.value = response.data.data || [];
  } catch (error) {
    categoryError.value =
      error.response?.data?.message ||
      'Gagal mengambil daftar kategori aset.';
  } finally {
    loadingCategories.value = false;
  }
};

const addSpecification = (key = '', value = '') => {
  specificationCounter += 1;

  specificationRows.value.push({
    id: specificationCounter,
    key,
    value,
  });
};

const removeSpecification = (index) => {
  specificationRows.value.splice(index, 1);
};

const loadSpecifications = (specifications) => {
  specificationRows.value = [];
  specificationCounter = 0;

  if (
    !specifications ||
    typeof specifications !== 'object' ||
    Array.isArray(specifications)
  ) {
    return;
  }

  Object.entries(specifications).forEach(([key, value]) => {
    addSpecification(
      key,
      typeof value === 'string'
        ? value
        : JSON.stringify(value),
    );
  });
};

const buildSpecifications = () => {
  const result = {};

  for (const item of specificationRows.value) {
    const key = item.key.trim();
    const value = item.value.trim();

    if (!key && !value) continue;

    if (!key || !value) {
      throw new Error(
        'Nama dan nilai spesifikasi harus diisi bersamaan.',
      );
    }

    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new Error(`Spesifikasi "${key}" ditulis lebih dari sekali.`);
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
};

const populateForm = (asset) => {
  if (!asset) return;

  Object.assign(form, {
    assetCode: asset.assetCode || '',
    name: asset.name || '',
    categoryId: asset.categoryId
      ? String(asset.categoryId)
      : asset.category?.id
        ? String(asset.category.id)
        : '',
    brand: asset.brand || '',
    model: asset.model || '',
    serialNumber: asset.serialNumber || '',
    location: asset.location || '',
    department: asset.department || '',
    assignedTo: asset.assignedTo || '',
    purchaseDate: formatDate(asset.purchaseDate),
    warrantyEnd: formatDate(asset.warrantyEnd),
    status: asset.status || 'ACTIVE',
    notes: asset.notes || '',
  });

  loadSpecifications(asset.specifications);
};

watch(
  () => [props.visible, props.asset],
  async ([visible, asset]) => {
    if (!visible) return;

    resetForm();

    await loadCategories();

    if (asset) {
      populateForm(asset);
    }
  },
  {
    immediate: true,
  },
);

const close = () => {
  if (saving.value) return;

  emit('close');
};

const submitForm = async () => {
  errorMessage.value = '';

  if (!form.assetCode.trim()) {
    errorMessage.value = 'Asset Code wajib diisi.';
    return;
  }

  if (!form.name.trim()) {
    errorMessage.value = 'Nama aset wajib diisi.';
    return;
  }

  if (!form.categoryId) {
    errorMessage.value = 'Kategori aset wajib dipilih.';
    return;
  }

  if (
    form.purchaseDate &&
    form.warrantyEnd &&
    form.warrantyEnd < form.purchaseDate
  ) {
    errorMessage.value =
      'Tanggal garansi tidak boleh lebih awal dari tanggal pembelian.';
    return;
  }

  let specifications;

  try {
    specifications = buildSpecifications();
  } catch (error) {
    errorMessage.value = error.message;
    return;
  }

  saving.value = true;

  try {
    const payload = {
      assetCode: form.assetCode.trim(),
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      location: form.location.trim() || null,
      department: form.department.trim() || null,
      assignedTo: form.assignedTo.trim() || null,
      purchaseDate: form.purchaseDate || null,
      warrantyEnd: form.warrantyEnd || null,
      status: form.status,
      specifications,
      notes: form.notes.trim() || null,
    };

    if (isEdit.value) {
      await api.patch(`/assets/${props.asset.id}`, payload);
    } else {
      await api.post('/assets', payload);
    }

    emit('saved');
    emit('close');
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      'Gagal menyimpan data aset. Periksa koneksi backend.';
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
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

.asset-modal {
  width: 100%;
  max-width: 850px;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header-custom,
.modal-footer-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 25px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header-custom h4 {
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 5px;
}

.modal-header-custom p {
  color: #64748b;
  font-size: 13px;
  margin: 0;
}

.modal-body-custom {
  padding: 25px;
}

.modal-footer-custom {
  border-top: 1px solid #e5e7eb;
  border-bottom: 0;
  justify-content: flex-end;
  gap: 10px;
}

.section-title {
  font-weight: 700;
  color: #334155;
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.specification-row {
  margin-bottom: 10px;
}

.empty-specification {
  padding: 20px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  text-align: center;
  font-size: 13px;
}

@media (max-width: 576px) {
  .modal-backdrop-custom {
    padding: 10px;
    align-items: flex-start;
  }

  .modal-body-custom {
    padding: 18px;
  }

  .modal-header-custom,
  .modal-footer-custom {
    padding: 16px 18px;
  }
}
</style>
