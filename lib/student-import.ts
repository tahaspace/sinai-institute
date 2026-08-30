/**
 * ClientR6 — new-student bulk import engine.
 * Reads an uploaded .xlsx/.csv (SheetJS), maps the Arabic columns to fields,
 * validates (duplicate code/national-id, email/phone format, required), and
 * commits: creates Student + Guardian + FeeAccount (from the level's FeeStructure)
 * + a Draft Registration for the chosen term. Cohort context (year/faculty/
 * program/level/semester) is chosen on-screen, not in the file.
 */
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';

export type ImportColumn = { field: string; header: string; aliases?: string[]; required?: boolean };
// Single source of truth for the downloadable template AND the parser.
export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: 'studentCode', header: 'كود الطالب', aliases: ['رقم الطالب', 'الرقم الجامعي'], required: true },
  { field: 'nationalId', header: 'الرقم القومي', aliases: ['الرقم القومى'], required: true },
  { field: 'nameAr', header: 'الاسم عربي', aliases: ['الاسم', 'الاسم بالعربي'], required: true },
  { field: 'nameEn', header: 'الاسم إنجليزي', aliases: ['الاسم بالانجليزي', 'الاسم انجليزي'] },
  { field: 'gender', header: 'النوع', aliases: ['الجنس'] },
  { field: 'birthDate', header: 'تاريخ الميلاد' },
  { field: 'nationality', header: 'الجنسية' },
  { field: 'religion', header: 'الديانة' },
  { field: 'maritalStatus', header: 'الحالة الاجتماعية' },
  { field: 'address', header: 'العنوان' },
  { field: 'governorate', header: 'المحافظة' },
  { field: 'city', header: 'المدينة' },
  { field: 'email', header: 'البريد الإلكتروني', aliases: ['الايميل', 'البريد الالكتروني', 'البريد'] },
  { field: 'phone', header: 'الهاتف', aliases: ['المحمول', 'رقم الهاتف', 'التليفون', 'الموبايل'] },
  { field: 'guardianName', header: 'اسم ولي الأمر' },
  { field: 'guardianRelation', header: 'صلة القرابة' },
  { field: 'guardianJob', header: 'وظيفة ولي الأمر', aliases: ['الوظيفة'] },
  { field: 'guardianPhone', header: 'هاتف ولي الأمر' },
  { field: 'guardianEmail', header: 'بريد ولي الأمر' },
  { field: 'guardianAddress', header: 'عنوان ولي الأمر' },
  { field: 'paymentSystem', header: 'نظام السداد' },
  { field: 'feesAmount', header: 'قيمة المصروفات' },
  { field: 'scholarship', header: 'المنحة' },
  { field: 'discountPercent', header: 'نسبة الخصم' },
  { field: 'paymentMethod', header: 'طريقة الدفع' },
  { field: 'enrollmentRef', header: 'إحالة القيد', aliases: ['احالة القيد'] },
  { field: 'admissionType', header: 'نوع القبول' },
  { field: 'admissionDate', header: 'تاريخ القبول' },
];

// Normalize a cell to a clean string. CRITICAL: Excel stores national IDs / phones /
// fees as NUMBERS; formatting them (raw:false) turns a 14-digit ID into "3.0001E+13"
// (scientific notation), which then collapses distinct IDs to the same value → false
// "duplicate" errors. So we read raw and render integers in full, dates as ISO.
const norm = (s: unknown) => {
  if (s == null) return '';
  if (s instanceof Date) return s.toISOString().slice(0, 10);
  if (typeof s === 'number') return Number.isInteger(s) ? s.toFixed(0) : String(s);
  return String(s).replace(/\s+/g, ' ').trim();
};

function mapRow(raw: Record<string, unknown>): Record<string, string> {
  const keys = Object.keys(raw);
  const rec: Record<string, string> = {};
  for (const col of IMPORT_COLUMNS) {
    const wanted = [col.header, ...(col.aliases ?? [])].map(norm);
    const k = keys.find((kk) => wanted.includes(norm(kk)));
    rec[col.field] = k != null ? norm(raw[k]) : '';
  }
  return rec;
}

export type ImportRow = { row: number; data: Record<string, string>; errors: string[] };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

/** Parse an uploaded .xlsx/.csv buffer into mapped rows. */
export function parseImportBuffer(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  // raw:true keeps numbers as numbers (norm() renders them in full, no scientific notation);
  // date cells arrive as Date objects (via cellDates on read) → norm() renders ISO.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true });
  return raw.map(mapRow).filter((r) => r.studentCode || r.nameAr || r.nationalId);
}

/** Validate mapped rows (dup within file + against DB, formats, required fields). */
export async function validateImportRows(rows: Record<string, string>[]): Promise<{ rows: ImportRow[]; validCount: number; errorCount: number }> {
  const codes = rows.map((r) => r.studentCode).filter(Boolean);
  const nids = rows.map((r) => r.nationalId).filter(Boolean);
  const emails = rows.map((r) => r.email).filter(Boolean);
  const [dbCodes, dbNids, dbEmails] = await Promise.all([
    prisma.student.findMany({ where: { studentCode: { in: codes } }, select: { studentCode: true } }),
    prisma.student.findMany({ where: { nationalId: { in: nids } }, select: { nationalId: true } }),
    prisma.student.findMany({ where: { email: { in: emails } }, select: { email: true } }),
  ]);
  const dbCode = new Set(dbCodes.map((s) => s.studentCode));
  const dbNid = new Set(dbNids.map((s) => s.nationalId));
  const dbEmail = new Set(dbEmails.map((s) => s.email));
  const seenCode = new Map<string, number>();
  const seenNid = new Map<string, number>();

  const out: ImportRow[] = rows.map((data, i) => {
    const errors: string[] = [];
    if (!data.studentCode) errors.push('كود الطالب مطلوب');
    if (!data.nationalId) errors.push('الرقم القومي مطلوب');
    if (!data.nameAr) errors.push('الاسم بالعربي مطلوب');
    if (data.studentCode) {
      if (dbCode.has(data.studentCode)) errors.push('كود الطالب مسجّل بالفعل');
      if (seenCode.has(data.studentCode)) errors.push(`كود مكرر في الملف (صف ${seenCode.get(data.studentCode)! + 2})`);
      else seenCode.set(data.studentCode, i);
    }
    if (data.nationalId) {
      if (dbNid.has(data.nationalId)) errors.push('الرقم القومي مسجّل بالفعل');
      if (seenNid.has(data.nationalId)) errors.push(`رقم قومي مكرر في الملف (صف ${seenNid.get(data.nationalId)! + 2})`);
      else seenNid.set(data.nationalId, i);
    }
    if (data.email && !EMAIL_RE.test(data.email)) errors.push('بريد إلكتروني غير صحيح');
    if (data.email && dbEmail.has(data.email)) errors.push('البريد الإلكتروني مسجّل بالفعل');
    if (data.phone && !PHONE_RE.test(data.phone)) errors.push('رقم هاتف غير صحيح');
    return { row: i + 2, data, errors };
  });
  const validCount = out.filter((r) => r.errors.length === 0).length;
  return { rows: out, validCount, errorCount: out.length - validCount };
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const dt = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}
const num = (s: string) => { const n = parseFloat(String(s).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };

export type ImportOpts = { academicYear: string; semester: string; programId?: string | null; facultyId?: string | null; departmentId?: string | null; level: number; universityId?: string | null; fileName?: string | null };

/** Commit valid rows: Student + Guardian + FeeAccount + Draft Registration; log the batch + audit. */
export async function commitImport(rows: Record<string, string>[], opts: ImportOpts, actorId?: string | null) {
  const { rows: validated } = await validateImportRows(rows);
  const good = validated.filter((r) => r.errors.length === 0);

  // Default fees from the level's active FeeStructure (unless the row gives an explicit amount).
  let structureFee = 0;
  const fs = await prisma.feeStructure.findFirst({
    where: { isActive: true, level: opts.level, ...(opts.programId ? { programId: opts.programId } : {}) },
    include: { items: true },
  });
  if (fs) structureFee = fs.items.reduce((s, it) => s + Number(it.amount), 0);

  const enrollYear = parseInt(opts.academicYear.match(/\d{4}/)?.[0] ?? `${new Date().getFullYear()}`, 10);
  const errors: { row: number; error: string }[] = [];
  let imported = 0;

  for (const r of good) {
    const d = r.data;
    try {
      const base = d.feesAmount ? num(d.feesAmount) : structureFee;
      const totalFees = Math.max(0, Math.round((base - num(d.scholarship) - base * (num(d.discountPercent) / 100)) * 100) / 100);
      await prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            studentCode: d.studentCode, nationalId: d.nationalId || null,
            nameAr: d.nameAr, nameEn: d.nameEn || null, gender: d.gender || null, birthDate: parseDate(d.birthDate),
            nationality: d.nationality || null, religion: d.religion || null, maritalStatus: d.maritalStatus || null,
            address: d.address || null, governorate: d.governorate || null, city: d.city || null,
            email: d.email || null, phone: d.phone || null,
            programId: opts.programId ?? null, departmentId: opts.departmentId ?? null, facultyId: opts.facultyId ?? null,
            level: opts.level, enrollYear, status: 'ACTIVE',
            admissionType: d.admissionType || null, admissionDate: parseDate(d.admissionDate) ?? new Date(),
            enrollmentRef: d.enrollmentRef || null, universityId: opts.universityId ?? null,
          },
        });
        if (d.guardianName) {
          await tx.guardian.create({ data: { studentId: student.id, name: d.guardianName, relation: d.guardianRelation || 'ولي أمر', phone: d.guardianPhone || null, job: d.guardianJob || null, email: d.guardianEmail || null, address: d.guardianAddress || null } });
        }
        await tx.feeAccount.create({ data: { studentId: student.id, academicYear: opts.academicYear, totalFees, installments: 1, universityId: opts.universityId ?? null } });
        await tx.registrationRequest.create({ data: { studentId: student.id, academicYear: opts.academicYear, semester: opts.semester, status: 'Draft' } });
      });
      imported++;
    } catch (e) {
      errors.push({ row: r.row, error: (e as Error).message });
    }
  }

  const batch = await prisma.studentImportBatch.create({
    data: { universityId: opts.universityId ?? null, fileName: opts.fileName ?? null, academicYear: opts.academicYear, semester: opts.semester, programId: opts.programId ?? null, facultyId: opts.facultyId ?? null, level: opts.level, total: rows.length, imported, failed: rows.length - imported, createdById: actorId ?? null },
  });
  await writeAudit('student.import', { targetType: 'StudentImportBatch', targetId: batch.id, universityId: opts.universityId ?? null, metadata: { total: rows.length, imported, failed: rows.length - imported } });
  return { batchId: batch.id, imported, failed: rows.length - imported, errors };
}

/** A downloadable .xlsx template (header row + one sample row). */
export function buildTemplateBuffer(): Buffer {
  const headers = IMPORT_COLUMNS.map((c) => c.header);
  const sample = IMPORT_COLUMNS.map((c) => (c.field === 'studentCode' ? '2026-0001' : c.field === 'nameAr' ? 'اسم الطالب' : c.field === 'nationalId' ? '30001010100000' : ''));
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
