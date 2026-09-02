/**
 * ClientR6 — new-student bulk import engine.
 * Reads an uploaded .xlsx/.csv (SheetJS), maps the Arabic columns to fields,
 * validates (duplicate code/national-id, email/phone format, required), and
 * commits: creates Student + Guardian + FeeAccount (from the level's FeeStructure)
 * + a Draft Registration for the chosen term. Cohort context (year/faculty/
 * program/level/semester) is chosen on-screen; the sheet may additionally override the
 * PROGRAMME (and therefore the academic system) row by row.
 *
 * The academic system is never a default here. A student's system is a property of their
 * programme (Program.academicSystem), so a student imported with no programme silently becomes a
 * credit-hours student and the misclassification only surfaces months later, at grading. Hence the
 * cohort programme is REQUIRED (ImportOpts.programId is non-optional) and every single row must
 * resolve to a real programme — the cohort one, or the one named in the
 * «النظام الأكاديمي أو البرنامج» column.
 */
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { ACADEMIC_SYSTEM_LABELS, normalizeSystem, type AcademicSystem } from '@/lib/academic-system';

export type ImportColumn = { field: string; header: string; aliases?: string[]; required?: boolean };
// Single source of truth for the downloadable template AND the parser.
export const IMPORT_COLUMNS: ImportColumn[] = [
  { field: 'studentCode', header: 'كود الطالب', aliases: ['رقم الطالب', 'الرقم الجامعي'], required: true },
  { field: 'nationalId', header: 'الرقم القومي', aliases: ['الرقم القومى'], required: true },
  { field: 'nameAr', header: 'الاسم عربي', aliases: ['الاسم', 'الاسم بالعربي'], required: true },
  { field: 'nameEn', header: 'الاسم إنجليزي', aliases: ['الاسم بالانجليزي', 'الاسم انجليزي'] },
  // Per-row programme override. Optional: blank means "use the programme chosen on screen".
  // Only a programme NAME can move a row to another system; a bare system word is a confirmation
  // that must agree with the batch programme — precedence lives in resolveSheetSystemValues().
  // Header uses the platform-wide «النظام الأكاديمي»; the older spelling stays an alias so sheets
  // built from an earlier template still parse.
  // The aliases are deliberately NARROW. A generic header like «البرنامج» or «النظام» is common in
  // hand-built registrar exports as free text («انتظام», «تعليم مفتوح»), and claiming it here would
  // route that text into the authoritative programme resolver: every unresolvable value becomes a row
  // error, validCount drops to 0, and a file that imported cleanly before would import nothing.
  { field: 'academicSystem', header: 'النظام الأكاديمي أو البرنامج', aliases: ['النظام الدراسي أو البرنامج', 'النظام الأكاديمي أو البرنامج', 'النظام الأكاديمي', 'النظام الاكاديمي', 'النظام الدراسي', 'النظام الدراسى', 'academicSystem'] },
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

// ───────────────────────── Academic system, per row ─────────────────────────

/** Fold Arabic spelling variants (diacritics, tatweel, أ/إ/آ, ى, ة) so «سنوى» and «السنوي» match. */
const foldAr = (v: string) =>
  v
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, ' ') // punctuation/underscores/spaces → one space (no \p{L}: tsconfig targets ES2017)
    .trim()
    .toLowerCase();

/** Bare system words a registrar plausibly writes in that column (folded once, at module load). */
const SYSTEM_WORDS = new Map<string, AcademicSystem>([
  ...['ساعات معتمدة', 'ساعات', 'الساعات المعتمدة', 'نظام ساعات معتمدة', 'نظام الساعات المعتمدة', 'معتمدة', 'credit', 'credit hours', 'CREDIT_HOURS']
    .map((w) => [foldAr(w), 'CREDIT_HOURS'] as [string, AcademicSystem]),
  ...['سنوي', 'نظام سنوي', 'النظام السنوي', 'السنوي', 'عام', 'نظام عام', 'دراسي عام', 'نظام دراسي عام', 'النظام الدراسي العام', 'عادي', 'النظام العادي', 'annual', 'yearly', 'ANNUAL']
    .map((w) => [foldAr(w), 'ANNUAL'] as [string, AcademicSystem]),
]);

export type RowSystemSource = 'sheet-program' | 'sheet-system' | 'cohort';
/** The programme fields this module needs: identity, both names (matching), system, department. */
type ProgramLite = { id: string; nameAr: string; nameEn: string | null; academicSystem: string; departmentId: string | null };
type SheetResolution = { program: ProgramLite; system: AcademicSystem; source: RowSystemSource } | { error: string };

const PROGRAM_SELECT = { id: true, nameAr: true, nameEn: true, academicSystem: true, departmentId: true } as const;

/**
 * Tenant fragment for Program lookups. /api/institute/programs creates programmes WITHOUT a
 * universityId, so a strict `universityId: ctx.universityId` filter would hide every programme from
 * a tenanted user (and lock the importer out again). Accept the tenant's own rows plus the
 * untenanted (legacy/global) ones — and nothing belonging to another institution.
 */
/** @deprecated name kept for existing callers — the definition now lives in lib/tenant.ts */
export const programTenantWhere = tenantOrGlobalWhere;

/**
 * Match one free-text programme name against a pre-fetched programme list.
 *
 * The precedence MUST stay identical to resolveApplicationProgramId (lib/admission-program.ts):
 * an exact (trimmed) name wins; otherwise a containment match — in either direction — is accepted
 * ONLY when exactly one programme matches, because a student filed under a programme nobody chose
 * is worse than a row the registrar fixes by hand.
 *
 * It matches in memory instead of calling that helper per value on purpose: the DB version runs up
 * to three queries per value, the last an unbounded full scan of Program, so a legacy sheet whose
 * «البرنامج» column holds free text (one distinct value per student) fired hundreds of them and
 * timed the preview out — and again on commit, which re-validates. One query per sheet now,
 * whatever the number of distinct values. If the admissions matcher changes, change this with it.
 */
function matchProgramByName(name: string, programs: ProgramLite[]): ProgramLite | null {
  const n = name.trim();
  if (!n) return null;
  const lower = n.toLowerCase();
  const exact = programs.filter((p) => p.nameAr === n || p.nameEn === n);
  if (exact.length) return exact.length === 1 ? exact[0] : null; // two programmes share the name — refuse to pick
  const contains = programs.filter((p) => p.nameAr.toLowerCase().includes(lower) || (p.nameEn ? p.nameEn.toLowerCase().includes(lower) : false));
  if (contains.length) return contains.length === 1 ? contains[0] : null;
  const reverse = programs.filter((p) => n.includes(p.nameAr) || (p.nameEn ? lower.includes(p.nameEn.toLowerCase()) : false));
  return reverse.length === 1 ? reverse[0] : null;
}

/**
 * Resolve the DISTINCT values of the «النظام الأكاديمي أو البرنامج» column once (a sheet has
 * hundreds of rows but a handful of values), against the cohort programme chosen on screen.
 *
 * Precedence, deliberately unambiguous and surfaced per row in the preview:
 *   · a resolvable PROGRAMME name in the sheet wins — the row lands in that programme's system, and
 *     the preview NAMES that programme and marks the row as an override (it also moves the row's
 *     fee structure and department, so it must never be silent);
 *   · a bare SYSTEM word must AGREE with the cohort programme. A contradiction is a row ERROR, not
 *     a silent winner: we cannot invent a programme for it, and the registrar has to see the clash;
 *   · blank falls back to the cohort programme (always present — it is required);
 *   · anything else is a row error naming the offending value.
 */
async function resolveSheetSystemValues(
  values: string[],
  cohort: ProgramLite | null,
  universityId?: string | null,
): Promise<Map<string, SheetResolution>> {
  const out = new Map<string, SheetResolution>();
  const distinct = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  if (!distinct.length) return out;

  const names = distinct.filter((v) => !SYSTEM_WORDS.has(foldAr(v)));
  // ONE query for the whole sheet, tenant-scoped: a name in the file must never resolve to another
  // institution's programme.
  const programs: ProgramLite[] = names.length
    ? await prisma.program.findMany({ where: programTenantWhere(universityId), select: PROGRAM_SELECT })
    : [];

  for (const name of names) {
    const p = matchProgramByName(name, programs);
    out.set(name, p
      ? { program: p, system: normalizeSystem(p.academicSystem), source: 'sheet-program' }
      : { error: `قيمة غير معروفة في عمود «النظام الأكاديمي أو البرنامج»: «${name}» — اكتب اسم برنامج مسجَّل، أو «ساعات معتمدة» أو «سنوي»` });
  }

  const cohortSystem = cohort ? normalizeSystem(cohort.academicSystem) : null;
  for (const v of distinct) {
    const word = SYSTEM_WORDS.get(foldAr(v));
    if (!word) continue;
    if (!cohort || !cohortSystem) {
      out.set(v, { error: `«${v}» في الملف يحتاج اختيار برنامج للدفعة — النظام الأكاديمي يُشتق من البرنامج` });
    } else if (word !== cohortSystem) {
      out.set(v, { error: `تعارض في النظام الأكاديمي: الملف يحدد «${ACADEMIC_SYSTEM_LABELS[word]}» بينما برنامج الدفعة «${ACADEMIC_SYSTEM_LABELS[cohortSystem]}» — صحّح الملف أو اختر برنامجًا مطابقًا` });
    } else {
      out.set(v, { program: cohort, system: word, source: 'sheet-system' });
    }
  }
  return out;
}

export type ImportRow = {
  row: number;
  data: Record<string, string>;
  errors: string[];
  /** The programme this row will actually be created under (sheet override → cohort programme). */
  programId: string | null;
  /** Its NAME — an override silently changes programme, fees and department unless the preview says so. */
  programName: string | null;
  /** True when the sheet moved this row OFF the cohort programme. Flagged per row and counted per batch. */
  programOverride: boolean;
  /** The row programme's department — an overridden student must not stay in the cohort's department. */
  programDepartmentId: string | null;
  /** The system that programme resolves to — shown in the preview BEFORE anything is committed. */
  academicSystem: AcademicSystem | null;
  /** Where it came from, so the preview can say «من الملف» vs «من الدفعة». */
  systemSource: RowSystemSource | null;
};
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

/**
 * Validate mapped rows (dup within file + against DB, formats, required fields) and resolve the
 * academic system of every row. `opts.programId` is the cohort programme chosen on screen; it is
 * what a row falls back to and what a bare system word in the sheet is reconciled against.
 */
export async function validateImportRows(
  rows: Record<string, string>[],
  opts?: { programId?: string | null; universityId?: string | null },
): Promise<{ rows: ImportRow[]; validCount: number; errorCount: number; systemCounts: Record<AcademicSystem, number>; overrideCount: number }> {
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

  const cohortProgramId = opts?.programId || null;
  // Read the cohort programme itself rather than getProgramSystem(): an id that does not exist — or
  // belongs to another institution — must NOT quietly resolve to the CREDIT_HOURS default; it has to
  // fail loudly, on every row.
  const cohortProgram = cohortProgramId
    ? await prisma.program.findFirst({ where: { id: cohortProgramId, ...programTenantWhere(opts?.universityId) }, select: PROGRAM_SELECT })
    : null;
  const cohortSystem = cohortProgram ? normalizeSystem(cohortProgram.academicSystem) : null;
  const cohortError = cohortProgramId
    ? 'البرنامج المحدد للدفعة غير موجود — أعد اختيار البرنامج'
    : 'لم يتم تحديد البرنامج — اختر برنامج الدفعة أو حدّده في عمود «النظام الأكاديمي أو البرنامج»';
  const sheetSystems = await resolveSheetSystemValues(rows.map((r) => r.academicSystem ?? ''), cohortProgram, opts?.universityId ?? null);

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

    // The academic system must be EXPLICIT for every row: from the sheet column, else from the
    // cohort programme. A row that resolves to no programme is an error — never a silent default.
    const rawSystem = (data.academicSystem ?? '').trim();
    const hit = rawSystem ? sheetSystems.get(rawSystem) : undefined;
    let program: ProgramLite | null = null;
    let academicSystem: AcademicSystem | null = null;
    let systemSource: RowSystemSource | null = null;
    if (hit && 'error' in hit) {
      errors.push(hit.error);
    } else if (hit) {
      program = hit.program; academicSystem = hit.system; systemSource = hit.source;
    } else if (cohortProgram && cohortSystem) {
      program = cohortProgram; academicSystem = cohortSystem; systemSource = 'cohort';
    } else {
      errors.push(cohortError);
    }

    return {
      row: i + 2, data, errors,
      programId: program?.id ?? null,
      programName: program?.nameAr ?? null,
      // An override is legal (that is how one file mixes two programmes) but never invisible.
      programOverride: !!program && program.id !== (cohortProgram?.id ?? null),
      programDepartmentId: program?.departmentId ?? null,
      academicSystem, systemSource,
    };
  });
  const validCount = out.filter((r) => r.errors.length === 0).length;
  // Split of what will ACTUALLY be created — error rows are not imported, so they are not counted.
  const systemCounts: Record<AcademicSystem, number> = { CREDIT_HOURS: 0, ANNUAL: 0 };
  for (const r of out) if (r.academicSystem && r.errors.length === 0) systemCounts[r.academicSystem]++;
  // How many rows the FILE moved off the batch programme — a batch-level number, because the preview
  // table is capped at 500 rows and the client must not have to infer it.
  const overrideCount = out.filter((r) => r.programOverride && r.errors.length === 0).length;
  return { rows: out, validCount, errorCount: out.length - validCount, systemCounts, overrideCount };
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

/** `programId` is REQUIRED (not nullable): the academic system is derived from it, so an import
 *  without a programme would create students silently classified as credit-hours. */
export type ImportOpts = { academicYear: string; semester: string; programId: string; facultyId?: string | null; departmentId?: string | null; level: number; universityId?: string | null; fileName?: string | null };

/** Commit valid rows: Student + Guardian + FeeAccount + Draft Registration; log the batch + audit. */
export async function commitImport(rows: Record<string, string>[], opts: ImportOpts, actorId?: string | null) {
  // Defence in depth — the route rejects this first. Without a programme every student created here
  // would silently be a credit-hours student, which is precisely the bug this module must not have.
  if (!opts.programId) throw new Error('يجب اختيار البرنامج للدفعة قبل الاستيراد — النظام الأكاديمي يُشتق من البرنامج');
  const { rows: validated } = await validateImportRows(rows, { programId: opts.programId, universityId: opts.universityId });
  const good = validated.filter((r) => r.errors.length === 0);

  // Default fees from the active FeeStructure of (level, programme), unless the row states an
  // amount. Cached per programme because a row may override the cohort programme; with no override
  // this resolves the very same structure it always did.
  const feeCache = new Map<string, number>();
  const structureFeeFor = async (programId: string) => {
    const cached = feeCache.get(programId);
    if (cached !== undefined) return cached;
    // A programme-specific structure wins when one exists, else the level-wide one — which is the
    // only kind that exists today: nothing in the app ever writes FeeStructure.programId, so a
    // programme-only lookup matches nothing and would price EVERY imported student at zero.
    // (Not one OR + orderBy programId desc: Postgres sorts NULLs first on DESC, i.e. backwards.)
    // Tenant-scoped the same way programmes are: seeded structures carry a universityId, so an
    // unscoped lookup could price a student off another institute's fees.
    const tenant = opts.universityId ? { OR: [{ universityId: opts.universityId }, { universityId: null }] } : {};
    const fs =
      (await prisma.feeStructure.findFirst({ where: { isActive: true, level: opts.level, programId, ...tenant }, include: { items: true } }))
      ?? (await prisma.feeStructure.findFirst({ where: { isActive: true, level: opts.level, programId: null, ...tenant }, include: { items: true } }));
    const total = fs ? fs.items.reduce((s, it) => s + Number(it.amount), 0) : 0;
    feeCache.set(programId, total);
    return total;
  };

  const enrollYear = parseInt(opts.academicYear.match(/\d{4}/)?.[0] ?? `${new Date().getFullYear()}`, 10);
  // Seed the error list with the rows validation rejected: they are counted in `failed`, so a commit
  // that imports nothing must say WHY instead of returning an empty list next to «فشل N».
  // Capped like the preview — the UI lists the first few and `failed` carries the real total.
  const errors: { row: number; error: string }[] = validated
    .filter((r) => r.errors.length > 0)
    .slice(0, 500)
    .map((r) => ({ row: r.row, error: r.errors.join('، ') }));
  let imported = 0;

  for (const r of good) {
    const d = r.data;
    try {
      // Validated rows always carry a programme; `?? opts.programId` is only a type narrowing.
      const rowProgramId = r.programId ?? opts.programId;
      // One rule for every row: a student belongs to their OWN programme's department. Applying it
      // only to file-overridden rows would leave two students of the same programme in different
      // departments purely because of how their row was written.
      const rowDepartmentId = r.programDepartmentId ?? opts.departmentId ?? null;
      const base = d.feesAmount ? num(d.feesAmount) : await structureFeeFor(rowProgramId);
      const totalFees = Math.max(0, Math.round((base - num(d.scholarship) - base * (num(d.discountPercent) / 100)) * 100) / 100);
      await prisma.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            studentCode: d.studentCode, nationalId: d.nationalId || null,
            nameAr: d.nameAr, nameEn: d.nameEn || null, gender: d.gender || null, birthDate: parseDate(d.birthDate),
            nationality: d.nationality || null, religion: d.religion || null, maritalStatus: d.maritalStatus || null,
            address: d.address || null, governorate: d.governorate || null, city: d.city || null,
            email: d.email || null, phone: d.phone || null,
            programId: rowProgramId, departmentId: rowDepartmentId, facultyId: opts.facultyId ?? null,
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

  // Audit the system split too — a wrongly-classified batch is otherwise invisible after the fact.
  const systems: Record<string, number> = { CREDIT_HOURS: 0, ANNUAL: 0 };
  for (const r of good) if (r.academicSystem) systems[r.academicSystem]++;

  const batch = await prisma.studentImportBatch.create({
    data: { universityId: opts.universityId ?? null, fileName: opts.fileName ?? null, academicYear: opts.academicYear, semester: opts.semester, programId: opts.programId, facultyId: opts.facultyId ?? null, level: opts.level, total: rows.length, imported, failed: rows.length - imported, createdById: actorId ?? null },
  });
  await writeAudit('student.import', { targetType: 'StudentImportBatch', targetId: batch.id, universityId: opts.universityId ?? null, metadata: { total: rows.length, imported, failed: rows.length - imported, programId: opts.programId, systems } });
  return { batchId: batch.id, imported, failed: rows.length - imported, errors };
}

/** A downloadable .xlsx template (header row + one sample row). */
export function buildTemplateBuffer(): Buffer {
  const headers = IMPORT_COLUMNS.map((c) => c.header);
  // The sample row is NOT inert — it carries a code and a name, so parseImportBuffer keeps it as a
  // real data row. The optional programme column therefore stays BLANK: blank means "use the
  // programme picked on screen", and pre-filling «ساعات معتمدة» made the template itself fail an
  // annual-programme import with «تعارض في النظام الأكاديمي». Guidance lives in the page copy.
  const sample = IMPORT_COLUMNS.map((c) =>
    c.field === 'studentCode' ? '2026-0001'
      : c.field === 'nameAr' ? 'اسم الطالب'
        : c.field === 'nationalId' ? '30001010100000'
          : '');
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
