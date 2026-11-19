
import prisma from '../config/database.js';
import ExcelJS from 'exceljs';
import PdfPrinter from 'pdfmake';
import fs from 'fs';

const MAINTENANCE_TYPES = [
  'PREVENTIVE',
  'CORRECTIVE',
  'TROUBLESHOOTING',
  'HARDWARE_UPGRADE',
  'SOFTWARE_MAINTENANCE',
];

const MAINTENANCE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'COMPLETED',
  'CANCELLED',
];

function parseDate(value, endOfDay = false) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Format tanggal harus YYYY-MM-DD.');
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Tanggal tidak valid.');
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function buildWhere(query) {
  const {
    startDate,
    endDate,
    assetId,
    technicianId,
    maintenanceType,
    status,
  } = query;

  const where = {};

  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  if (start && end && start > end) {
    throw new Error('Tanggal mulai tidak boleh melebihi tanggal akhir.');
  }

  if (start || end) {
    where.maintenanceDate = {};

    if (start) where.maintenanceDate.gte = start;
    if (end) where.maintenanceDate.lte = end;
  }

  if (assetId) {
    const id = Number(assetId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Filter aset tidak valid.');
    }

    where.assetId = id;
  }

  if (technicianId) {
    const id = Number(technicianId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Filter teknisi tidak valid.');
    }

    where.technicianId = id;
  }

  if (maintenanceType) {
    if (!MAINTENANCE_TYPES.includes(maintenanceType)) {
      throw new Error('Jenis maintenance tidak valid.');
    }

    where.maintenanceType = maintenanceType;
  }

  if (status) {
    if (!MAINTENANCE_STATUSES.includes(status)) {
      throw new Error('Status maintenance tidak valid.');
    }

    where.status = status;
  }

  return where;
}

async function getExportRecords(query) {
  const where = buildWhere(query);

  return prisma.maintenanceRecord.findMany({
    where,
    orderBy: [
      { maintenanceDate: 'desc' },
      { id: 'desc' },
    ],
    include: {
      asset: {
        select: {
          id: true,
          assetCode: true,
          name: true,
          categoryId: true,
          brand: true,
          model: true,
          serialNumber: true,
          location: true,
          department: true,
          assignedTo: true,
          specifications: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      technician: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },

      signatures: {
        orderBy: {
          signedAt: 'asc',
        },
        select: {
          id: true,
          signerName: true,
          signerRole: true,
          signatureImage: true,
          signedAt: true,
        },
      },
    },
  });
}

function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSignatureName(record, role) {
  const signature = record.signatures.find(
    (item) => item.signerRole === role,
  );

  return signature?.signerName || '-';
}

function formatSpecifications(specifications) {
  if (!specifications || typeof specifications !== 'object') {
    return '-';
  }

  const entries = Object.entries(specifications);

  if (entries.length === 0) {
    return '-';
  }

  return entries
    .map(([key, value]) => {
      const formattedValue =
        value === null || value === undefined || value === ''
          ? '-'
          : String(value);

      return `${key}: ${formattedValue}`;
    })
    .join('\n');
}

function getFontConfiguration() {
  const candidates = [
    {
      regular: 'C:/Windows/Fonts/arial.ttf',
      bold: 'C:/Windows/Fonts/arialbd.ttf',
      italics: 'C:/Windows/Fonts/ariali.ttf',
      bolditalics: 'C:/Windows/Fonts/arialbi.ttf',
    },
    {
      regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      italics: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
      bolditalics: '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
    },
  ];

  for (const font of candidates) {
    if (
      fs.existsSync(font.regular) &&
      fs.existsSync(font.bold) &&
      fs.existsSync(font.italics) &&
      fs.existsSync(font.bolditalics)
    ) {
      return {
        ReportFont: {
          normal: font.regular,
          bold: font.bold,
          italics: font.italics,
          bolditalics: font.bolditalics,
        },
      };
    }
  }

  throw new Error(
    'Font PDF tidak ditemukan. Pastikan Arial tersedia di Windows.',
  );
}

function getSignatureImage(signature) {
  if (!signature?.signatureImage) return null;

  const image = signature.signatureImage;

  if (image.startsWith('data:image/')) {
    return image;
  }

  return `data:image/png;base64,${image}`;
}

// ==========================================
// EXPORT EXCEL
// ==========================================

export async function exportMaintenanceExcel(req, res, next) {
  try {
    const records = await getExportRecords(req.query);

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'PC Maintenance Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Laporan Maintenance');

    worksheet.columns = [
      { header: 'No.', key: 'number', width: 8 },
      { header: 'Kode Maintenance', key: 'code', width: 22 },
      { header: 'Tanggal', key: 'date', width: 18 },
      { header: 'Kode Aset', key: 'assetCode', width: 18 },
      { header: 'Nama Aset', key: 'assetName', width: 25 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Merek', key: 'brand', width: 18 },
      { header: 'Model', key: 'model', width: 18 },
      { header: 'Nomor Seri', key: 'serialNumber', width: 20 },
      { header: 'Lokasi', key: 'location', width: 22 },
      { header: 'Departemen', key: 'department', width: 20 },
      { header: 'Pengguna', key: 'assignedTo', width: 22 },
      { header: 'Teknisi', key: 'technician', width: 22 },
      { header: 'Jenis Maintenance', key: 'type', width: 25 },
      { header: 'Deskripsi', key: 'description', width: 40 },
      { header: 'Temuan', key: 'findings', width: 40 },
      { header: 'Tindakan', key: 'actionTaken', width: 40 },
      { header: 'Hasil', key: 'result', width: 22 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Maintenance Berikutnya', key: 'nextDate', width: 22 },
      { header: 'Waktu Selesai', key: 'completedAt', width: 22 },
      { header: 'Tanda Tangan Teknisi', key: 'technicianSigner', width: 25 },
      { header: 'Tanda Tangan Pengguna', key: 'userSigner', width: 25 },
    ];

    records.forEach((record, index) => {
      const asset = record.asset || {};

      worksheet.addRow({
        number: index + 1,
        code: record.maintenanceCode,
        date: formatDate(record.maintenanceDate),
        assetCode: asset.assetCode || '-',
        assetName: asset.name || '-',
        category: asset.category?.name || '-',
        brand: asset.brand || '-',
        model: asset.model || '-',
        serialNumber: asset.serialNumber || '-',
        location: asset.location || '-',
        department: asset.department || '-',
        assignedTo: asset.assignedTo || '-',
        technician: record.technician?.name || '-',
        type: record.maintenanceType,
        description: record.description || '-',
        findings: record.findings || '-',
        actionTaken: record.actionTaken || '-',
        result: record.result || '-',
        status: record.status,
        nextDate: formatDate(record.nextMaintenanceDate),
        completedAt: formatDateTime(record.completedAt),
        technicianSigner: getSignatureName(record, 'TECHNICIAN'),
        userSigner: getSignatureName(record, 'USER'),
      });
    });

    const header = worksheet.getRow(1);

    header.height = 30;
    header.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF172337' },
    };
    header.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: 'top',
          wrapText: true,
        };

        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
          };
        }
      }
    });

    worksheet.autoFilter = {
      from: 'A1',
      to: 'W1',
    };

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `laporan-maintenance-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    res.send(Buffer.from(buffer));
  } catch (error) {
    if (
      error.message.includes('Filter') ||
      error.message.includes('Tanggal') ||
      error.message.includes('Jenis') ||
      error.message.includes('Status')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

// ==========================================
// EXPORT PDF
// ==========================================

export async function exportMaintenancePdf(req, res, next) {
  try {
    const records = await getExportRecords(req.query);

    const printer = new PdfPrinter(getFontConfiguration());

    const content = [
      {
        text: 'LAPORAN MAINTENANCE ASET',
        style: 'header',
        alignment: 'center',
      },
      {
        text: 'PC Maintenance Monitoring System',
        alignment: 'center',
        margin: [0, 0, 0, 15],
      },
      {
        text: `Tanggal Cetak: ${formatDateTime(new Date())}`,
        alignment: 'right',
        fontSize: 8,
        margin: [0, 0, 0, 10],
      },
      {
        text: `Jumlah Data: ${records.length} maintenance`,
        bold: true,
        margin: [0, 0, 0, 12],
      },
    ];

    if (records.length === 0) {
      content.push({
        text: 'Tidak ada data maintenance untuk filter yang dipilih.',
        alignment: 'center',
        margin: [0, 30, 0, 0],
      });
    } else {
      content.push({
        table: {
          headerRows: 1,
          widths: [25, 75, 55, 100, 65, 65, 55, 55],
          body: [
            [
              'No.',
              'Kode',
              'Tanggal',
              'Aset',
              'Teknisi',
              'Jenis',
              'Status',
              'Hasil',
            ],
            ...records.map((record, index) => [
              String(index + 1),
              record.maintenanceCode || '-',
              formatDate(record.maintenanceDate),
              `${record.asset?.assetCode || '-'}\n${record.asset?.name || '-'}`,
              record.technician?.name || '-',
              record.maintenanceType || '-',
              record.status || '-',
              record.result || '-',
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        fontSize: 7,
        margin: [0, 0, 0, 20],
      });

      content.push({
        text: 'DETAIL MAINTENANCE',
        style: 'sectionHeader',
        margin: [0, 5, 0, 10],
      });

      records.forEach((record, index) => {
        const asset = record.asset || {};

        const specifications = formatSpecifications(
          asset.specifications,
        );

        content.push({
          text: `${index + 1}. ${record.maintenanceCode || '-'}`,
          style: 'recordHeader',
          margin: [0, 10, 0, 6],
        });

        content.push({
          table: {
            widths: ['25%', '75%'],
            body: [
              ['Tanggal', formatDate(record.maintenanceDate)],
              ['Kode Aset', asset.assetCode || '-'],
              ['Nama Aset', asset.name || '-'],
              ['Kategori', asset.category?.name || '-'],
              ['Merek', asset.brand || '-'],
              ['Model', asset.model || '-'],
              ['Nomor Seri', asset.serialNumber || '-'],
              ['Lokasi', asset.location || '-'],
              ['Departemen', asset.department || '-'],
              ['Pengguna / Penanggung Jawab', asset.assignedTo || '-'],
              ['Spesifikasi', specifications],
              ['Teknisi', record.technician?.name || '-'],
              ['Jenis Maintenance', record.maintenanceType || '-'],
              ['Status', record.status || '-'],
              ['Hasil', record.result || '-'],
              ['Deskripsi', record.description || '-'],
              ['Temuan', record.findings || '-'],
              ['Tindakan', record.actionTaken || '-'],
              ['Maintenance Berikutnya', formatDate(record.nextMaintenanceDate)],
              ['Selesai Pada', formatDateTime(record.completedAt)],
            ],
          },
          layout: 'lightHorizontalLines',
          fontSize: 8,
          margin: [0, 0, 0, 10],
        });

        content.push({
          text: 'TANDA TANGAN',
          bold: true,
          fontSize: 9,
          margin: [0, 5, 0, 8],
        });

        const technicianSignature = record.signatures.find(
          (signature) => signature.signerRole === 'TECHNICIAN',
        );

        const userSignature = record.signatures.find(
          (signature) => signature.signerRole === 'USER',
        );

        const signatureCell = (signature) => {
          if (!signature) {
            return {
              stack: [
                { text: 'Belum ditandatangani', italics: true },
                { text: ' ' },
              ],
            };
          }

          const image = getSignatureImage(signature);

          return {
            stack: [
              {
                text: signature.signerName,
                bold: true,
                margin: [0, 0, 0, 5],
              },
              ...(image
                ? [
                    {
                      image,
                      fit: [140, 55],
                      alignment: 'left',
                      margin: [0, 0, 0, 5],
                    },
                  ]
                : [
                    {
                      text: 'Gambar tanda tangan tidak tersedia',
                      italics: true,
                    },
                  ]),
              {
                text: formatDateTime(signature.signedAt),
                fontSize: 7,
              },
            ],
          };
        };

        content.push({
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                {
                  text: 'Teknisi',
                  bold: true,
                  alignment: 'center',
                },
                {
                  text: 'Pengguna / Penanggung Jawab',
                  bold: true,
                  alignment: 'center',
                },
              ],
              [
                signatureCell(technicianSignature),
                signatureCell(userSignature),
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15],
        });

        content.push({
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 760,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#CCCCCC',
            },
          ],
          margin: [0, 5, 0, 10],
        });
      });
    }

    const documentDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [25, 35, 25, 45],

      content,

      defaultStyle: {
        font: 'ReportFont',
        fontSize: 9,
      },

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#172337',
        },
        sectionHeader: {
          fontSize: 13,
          bold: true,
          color: '#172337',
        },
        recordHeader: {
          fontSize: 11,
          bold: true,
          color: '#2563EB',
        },
      },

      footer: (currentPage, pageCount) => ({
        columns: [
          {
            text: 'PC Maintenance Monitoring System',
            alignment: 'left',
          },
          {
            text: `Halaman ${currentPage} dari ${pageCount}`,
            alignment: 'right',
          },
        ],
        fontSize: 8,
        margin: [25, 15, 25, 0],
      }),
    };

    const pdfDocument = printer.createPdfKitDocument(
      documentDefinition,
    );

    const filename = `laporan-maintenance-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    pdfDocument.pipe(res);
    pdfDocument.end();
  } catch (error) {
    if (
      error.message.includes('Filter') ||
      error.message.includes('Tanggal') ||
      error.message.includes('Jenis') ||
      error.message.includes('Status')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}
