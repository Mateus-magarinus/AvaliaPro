import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { EvaluationsRepository } from '../evaluations.repository';
import { PropertyRepository } from '../../property/property.repository';

const BRAND_DARK = '062650';
const BRAND_LIGHT = 'dff0f5';

const COLUMNS = [
  { header: 'ID', key: 'id', width: 8 },
  { header: 'Município', key: 'city', width: 22 },
  { header: 'Bairro', key: 'neighborhood', width: 22 },
  { header: 'Endereço', key: 'address', width: 35 },
  { header: 'Quartos', key: 'bedrooms', width: 10 },
  { header: 'Banheiros', key: 'bathrooms', width: 11 },
  { header: 'Garagem', key: 'garageSpots', width: 10 },
  { header: 'Área (m²)', key: 'totalArea', width: 12 },
  { header: 'Valor total (R$)', key: 'totalValue', width: 18 },
  { header: 'Valor/m² (R$)', key: 'unitValue', width: 16 },
  { header: 'Renda município (R$)', key: 'ibgeIncome', width: 20 },
  { header: 'Renda setor (R$)', key: 'sectorIncome', width: 18 },
  { header: 'Latitude', key: 'latitude', width: 14 },
  { header: 'Longitude', key: 'longitude', width: 14 },
  { header: 'Link', key: 'contactLink', width: 40 },
] as const;

@Injectable()
export class EvaluationExportService {
  constructor(
    private readonly evaluationsRepo: EvaluationsRepository,
    private readonly propertiesRepo: PropertyRepository,
  ) {}

  async buildXlsx(userId: number, evaluationId: number): Promise<Buffer> {
    const evaluation = await this.evaluationsRepo.findOne(
      { id: evaluationId, user: { id: userId } } as any,
    ).catch(() => null);

    if (!evaluation) throw new NotFoundException('Evaluation not found');

    const [properties] = await this.propertiesRepo.findAndCount({
      where: { evaluation: { id: evaluationId, user: { id: userId } } } as any,
      order: { createdAt: 'ASC' } as any,
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AvaliaPro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Imóveis', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    // Linha 1: título da avaliação
    sheet.mergeCells(1, 1, 1, COLUMNS.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = evaluation.name;
    titleCell.font = { bold: true, size: 13, color: { argb: `FF${BRAND_DARK}` } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_LIGHT}` } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 28;

    // Linha 2: cabeçalhos
    sheet.columns = COLUMNS.map((col) => ({ ...col }));
    const headerRow = sheet.getRow(2);
    COLUMNS.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_DARK}` } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFB0C4CE' } },
      };
    });
    headerRow.height = 22;

    // Dados
    properties.forEach((prop, rowIndex) => {
      const row = sheet.addRow({
        id: prop.id,
        city: prop.city ?? '',
        neighborhood: prop.neighborhood ?? '',
        address: prop.address ?? '',
        bedrooms: prop.bedrooms ?? null,
        bathrooms: prop.bathrooms ?? null,
        garageSpots: prop.garageSpots ?? null,
        totalArea: prop.totalArea ? Number(prop.totalArea) : null,
        totalValue: prop.totalValue ? Number(prop.totalValue) : null,
        unitValue: prop.unitValue ? Number(prop.unitValue) : null,
        ibgeIncome: prop.ibgeIncome ? Number(prop.ibgeIncome) : null,
        sectorIncome: prop.sectorIncome ? Number(prop.sectorIncome) : null,
        latitude: prop.latitude ? Number(prop.latitude) : null,
        longitude: prop.longitude ? Number(prop.longitude) : null,
        contactLink: prop.contactLink ?? '',
      });

      // Zebra striping
      const fillColor = rowIndex % 2 === 0 ? 'FFFFFFFF' : `FFF3F9FB`;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.alignment = { vertical: 'middle' };
      });

      // Formatos numéricos
      const currency = '#,##0.00';
      (['totalArea', 'totalValue', 'unitValue', 'ibgeIncome', 'sectorIncome'] as const).forEach((key) => {
        const colIndex = COLUMNS.findIndex((c) => c.key === key) + 1;
        if (colIndex > 0) row.getCell(colIndex).numFmt = currency;
      });

      // Link clicável
      if (prop.contactLink) {
        const linkColIndex = COLUMNS.findIndex((c) => c.key === 'contactLink') + 1;
        const linkCell = row.getCell(linkColIndex);
        linkCell.value = { text: prop.contactLink, hyperlink: prop.contactLink };
        linkCell.font = { color: { argb: `FF${BRAND_DARK}` }, underline: true };
      }
    });

    // Autofilter na linha de cabeçalhos
    sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
