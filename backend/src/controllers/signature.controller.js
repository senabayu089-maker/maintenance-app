import { prisma } from '../config/database.js';

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // Maksimal 2 MB

/**
 * POST /api/maintenance/:id/signatures
 *
 * Menyimpan tanda tangan teknisi atau pengguna.
 */
export const createSignature = async (req, res, next) => {
  try {
    const maintenanceId = Number(req.params.id);
    const { signerRole, signatureImage } = req.body;

    // Validasi ID maintenance
    if (!Number.isInteger(maintenanceId) || maintenanceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID maintenance tidak valid.',
      });
    }

    // Validasi jenis penanda tangan
    const allowedRoles = ['TECHNICIAN', 'USER'];

    if (!allowedRoles.includes(signerRole)) {
      return res.status(400).json({
        success: false,
        message: 'signerRole harus TECHNICIAN atau USER.',
      });
    }

    // Validasi hak akses
    if (
      signerRole === 'TECHNICIAN' &&
      !['ADMIN', 'TECHNICIAN'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Hanya Admin atau Teknisi yang dapat memberikan tanda tangan teknisi.',
      });
    }

    if (signerRole === 'USER' && req.user.role !== 'USER') {
      return res.status(403).json({
        success: false,
        message: 'Hanya pengguna dengan role USER yang dapat memberikan tanda tangan pengguna.',
      });
    }

    // Validasi gambar tanda tangan
    if (
      typeof signatureImage !== 'string' ||
      !signatureImage.startsWith('data:image/png;base64,')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tanda tangan harus berupa gambar PNG Base64.',
      });
    }

    const base64Data = signatureImage.replace(
      /^data:image\/png;base64,/,
      ''
    );

    if (
      !base64Data ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Format gambar tanda tangan tidak valid.',
      });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Periksa ukuran gambar
    if (imageBuffer.length === 0 || imageBuffer.length > MAX_SIGNATURE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran gambar tanda tangan maksimal 2 MB.',
      });
    }

    // Periksa signature file PNG
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    if (
      imageBuffer.length < 8 ||
      !imageBuffer.subarray(0, 8).equals(pngHeader)
    ) {
      return res.status(400).json({
        success: false,
        message: 'File yang dikirim bukan gambar PNG yang valid.',
      });
    }

    // Periksa apakah catatan maintenance tersedia
    const maintenance = await prisma.maintenanceRecord.findUnique({
      where: {
        id: maintenanceId,
      },
      select: {
        id: true,
        maintenanceCode: true,
        status: true,
      },
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Data maintenance tidak ditemukan.',
      });
    }

    // Tanda tangan hanya dapat diberikan setelah maintenance selesai
    if (maintenance.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Maintenance harus berstatus COMPLETED sebelum tanda tangan diberikan.',
      });
    }

    // Periksa apakah pihak tersebut sudah menandatangani
    const existingSignature = await prisma.maintenanceSignature.findUnique({
      where: {
        maintenanceId_signerRole: {
          maintenanceId,
          signerRole,
        },
      },
    });

    if (existingSignature) {
      return res.status(409).json({
        success: false,
        message: `Tanda tangan ${signerRole} sudah tersimpan.`,
      });
    }

    // Simpan tanda tangan
    const signature = await prisma.maintenanceSignature.create({
      data: {
        maintenanceId,
        signerId: req.user.id,
        signerName: req.user.name,
        signerRole,
        signatureImage,
      },
      select: {
        id: true,
        maintenanceId: true,
        signerId: true,
        signerName: true,
        signerRole: true,
        signedAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Tanda tangan berhasil disimpan.',
      data: signature,
    });
  } catch (error) {
    // Menangani kemungkinan dua request masuk bersamaan
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Tanda tangan untuk pihak tersebut sudah tersimpan.',
      });
    }

    next(error);
  }
};