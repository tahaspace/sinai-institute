/**
 * The bylaw screen's SCHEMA — the one description of "what is in an institute's regulation".
 *
 * WHY this exists (owner requirement): «كل معهد او جامعة بتبقي ليها لائحة خاصة بيها ولازم هما
 * يدخلوها بايديهم» — a new institute with a different bylaw must be able to type its whole
 * regulation in from the settings UI, with no developer and no seed script.
 *
 * Two properties this file is built to guarantee:
 *
 *  1. NO KEY IS EVER SILENTLY ABSENT. The field list is DERIVED at runtime from
 *     Object.keys(DEFAULT_REGULATIONS) (union the keys already stored for this institute), never
 *     hand-listed. A key added to lib/regulations.ts appears on the screen on the next request —
 *     with hand-written Arabic metadata if META has an entry for it, otherwise auto-derived from
 *     its default value and parked in the «بنود إضافية» group so a human can see it needs a label.
 *     META is therefore Partial<…>: a missing entry degrades the LABEL, never the EDITABILITY.
 *
 *  2. ONE SOURCE OF TRUTH FOR DEFAULTS. The screen is a "use client" file and may not import
 *     lib/regulations.ts (it pulls Prisma into the browser bundle). It used to keep a hand-copied
 *     mirror of DEFAULT_REGULATIONS, which drifted: the mirror said requireApprovedResult=true
 *     while the engine read false, so the screen showed the box ticked, wrote nothing (its own
 *     default), and the engine behaved the opposite way. Defaults now travel to the browser over
 *     the wire from THIS file, so there is nothing left to keep in sync.
 *
 * Validation lives here too (kind ranges + cross-field rules) and is enforced server-side on
 * PATCH. The same rule DATA is shipped to the form so the admin sees the error before saving;
 * the browser copy is a convenience, this one is the authority.
 */
import { DEFAULT_REGULATIONS, type Regulations } from '@/lib/regulations';
import { COMPONENT_KEYS, COMPONENT_LABELS_AR, parseComponentCsv } from '@/lib/grade-components';

// ───────────────────────────── kinds & types ─────────────────────────────

/**
 * How one bylaw value is edited. Everything is derived from the SHAPE of the default value, so a
 * future key gets a usable editor without anyone writing an input for it:
 *   number  → a numeric field            boolean → a switch
 *   text    → a text field (or a closed list when `options` is present)
 *   components → the four grade components as checkboxes (a CSV under the hood)
 *   numberMap  → an editable «مفتاح → رقم» table (levelMinHours, and any future map of numbers)
 *   rowTable   → an editable row table (cgpaGradeBands = جدول 4, and any future array of objects)
 *   json       → last resort: raw JSON, still editable, never hidden
 */
export type FieldKind = 'number' | 'boolean' | 'text' | 'components' | 'numberMap' | 'rowTable' | 'json';

export type ColumnSchema = {
  key: string;
  label: string;
  kind: 'number' | 'text';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type FieldSchema = {
  key: string;
  group: string;
  kind: FieldKind;
  label: string;
  /** ساعة / % / نقطة / فصل / أسبوع / مادة / محاولة — printed next to the input. */
  unit?: string;
  /** One line saying what the number actually CONTROLS. A number nobody can read is not configurable. */
  hint: string;
  /** The bylaw's own words for this rule, quoted, so the admin can check his own document against it. */
  bylaw?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Closed list for a text field (fixed, or filled at request time — see optionsFrom). */
  options?: { value: string; label: string }[];
  /** numberMap: what one row's KEY means (e.g. «المستوى»). */
  mapKeyLabel?: string;
  /** rowTable: the editable columns of one row. */
  columns?: ColumnSchema[];
  /** false = no hand-written Arabic metadata yet; the screen flags it instead of hiding it. */
  documented: boolean;
  /** The platform default, or undefined for a key this build does not know (stored-only). */
  default?: unknown;
  hasDefault: boolean;
};

export type GroupSchema = { id: string; title: string; description: string };

/** A rule that spans more than one field. Shipped as DATA so the form can pre-check the same rules. */
export type CrossRule =
  /** a ≤ b. `zeroDisables` marks the pair where 0 means «هذا الشرط معطَّل», so a disabled half is
   *  skipped instead of being compared — set per rule, never globally: the day an lte rule spans a
   *  key whose 0 is a legal value, a global escape would silently switch the check off. */
  | { type: 'lte'; a: string; b: string; message: string; zeroDisables?: boolean }
  | { type: 'ascending'; keys: string[]; message: string }
  | { type: 'mapAscending'; key: string; message: string }
  | { type: 'mapValuesLte'; key: string; limit: string; message: string }
  /** every row key of a numberMap must be a whole number (a level is 1,2,3… — a row keyed with
   *  anything else is saved and then read by nobody). */
  | { type: 'mapKeysInteger'; key: string; message: string }
  | { type: 'complementLte'; a: string; b: string; message: string }
  | { type: 'uniqueRows'; key: string; by: string; message: string };

// ───────────────────────────── groups ─────────────────────────────

export const GROUPS: GroupSchema[] = [
  { id: 'hours', title: 'الساعات والتخرج', description: 'إجمالي ساعات التخرج، ومعدل التخرج، وحدود الترقي بين المستويات' },
  { id: 'load', title: 'العبء الدراسي والتسجيل', description: 'الحد الأدنى والأقصى لساعات الفصل، والانسحاب، وإعادة المقرر' },
  { id: 'gpa', title: 'التقديرات والمعدل التراكمي', description: 'مرتبة الشرف، وجدول التقدير العام الذي يُطبع على بيان الحالة وشهادة التخرج' },
  { id: 'attendance', title: 'الحضور والحرمان', description: 'نسب الغياب: الإنذار الأول والثاني والحرمان، وحالة النتيجة عند تجاوز النسبة' },
  { id: 'exams', title: 'الامتحانات ورصد النتائج', description: 'الحدود الدنيا للدرجات، وشروط «غير مكتمل»، والاستكمال، واعتماد النتيجة' },
  { id: 'probation', title: 'الإنذار والمراقبة والفصل', description: 'حدود الإنذار الأكاديمي وعدد الفصول التي تؤدي إلى الفصل أو الانتساب' },
  { id: 'annual', title: 'النظام السنوي', description: 'قواعد النتيجة السنوية — تُطبَّق على البرامج ذات النظام السنوي فقط (لا تؤثر على الساعات المعتمدة)' },
  { id: 'other', title: 'بنود إضافية في اللائحة', description: 'بنود موجودة في اللائحة ولم يُكتب لها وصف عربي بعد — قابلة للتعديل، راجِعها قبل الحفظ' },
];

const OTHER_GROUP = 'other';

// ───────────────────────────── ranges ─────────────────────────────
// Deliberately GENEROUS. A limit here must never reject a legitimate bylaw of another institute —
// it only catches an obvious data-entry mistake (a percentage of 900, a negative hour count).

// The GPA scale. Read from a future `gpaScaleMax` key if one is ever added; otherwise the 4.00
// scale of جدول 3/4. Kept dynamic so a 5-point-scale institute needs one key, not a code change.
const GPA_MAX = Number((DEFAULT_REGULATIONS as unknown as Record<string, unknown>).gpaScaleMax ?? 4);

const PCT = { min: 0, max: 100, step: 1, unit: '%' } as const;
const GPA = { min: 0, max: GPA_MAX, step: 0.01, unit: 'نقطة' } as const;
const HOURS_TERM = { min: 0, max: 60, step: 1, integer: true, unit: 'ساعة' } as const;
const HOURS_TOTAL = { min: 1, max: 600, step: 1, integer: true, unit: 'ساعة' } as const;
const TERMS = { min: 0, max: 40, step: 1, integer: true, unit: 'فصل' } as const;
const WEEKS = { min: 0, max: 52, step: 1, integer: true, unit: 'أسبوع' } as const;

// ───────────────────────────── field metadata ─────────────────────────────
// Partial on purpose: an entry is the Arabic LABEL for a key, not permission for it to exist.
// A key with no entry is still rendered (see buildFields) — it just lands in «بنود إضافية».

type Meta = Omit<FieldSchema, 'key' | 'kind' | 'documented' | 'default' | 'hasDefault'> & {
  /** Fill `options` at request time from live data (grade statuses) instead of a fixed list. */
  optionsFrom?: 'gradeStatusCode';
};

const META: Partial<Record<keyof Regulations, Meta>> = {
  // ── الساعات والتخرج ──────────────────────────────────────────────
  graduationHours: {
    group: 'hours',
    label: 'إجمالي ساعات التخرج',
    hint: 'إجمالي الساعات المعتمدة التي يجب على الطالب اجتيازها للتخرج. يجوز لأي برنامج تجاوز هذه القيمة بإجمالي ساعات خاص به من شاشة البرامج.',
    bylaw: '«شروط تخرج الطلاب اجتياز عدد ساعات 130 ساعة مقسمة علي 8 فصول» — وجدول 1 يكرّرها لكل تخصص.',
    ...HOURS_TOTAL,
  },
  graduationMinCgpa: {
    group: 'hours',
    label: 'الحد الأدنى للمعدل التراكمي للتخرج',
    hint: 'لا يتخرج الطالب بمعدل تراكمي أقل من هذه القيمة مهما أتم من ساعات. اكتب صفراً لتعطيل هذا الشرط.',
    bylaw: '«الحد الادني للتخرج نقطتين حتي يصل الي تقدير تراكمي 2 ويصبح مقبول ويتم التخرج».',
    ...GPA,
  },
  levelMinHours: {
    group: 'hours',
    label: 'الحد الأدنى لساعات الترقي بين المستويات',
    unit: 'ساعة',
    mapKeyLabel: 'المستوى',
    hint: 'أقل عدد ساعات معتمدة مكتسبة بنجاح للترقي إلى كل مستوى. أضف صفاً إن كانت لائحتك تعرف مستوى خامساً. حذف صف من المستويات الأربعة الأساسية يعيده إلى قيمته الافتراضية ولا يلغيه.',
    bylaw: '«المستوي الثاني بعد اجتياز الطالب 26 ساعة دراسة معتمده بنجاح . المستوي الثالث 58 ساعة دراسية . المستوي الرابع بعد اجتياز الطالب 92 ساعة دراسية معتمدة بنجاح».',
    min: 0,
    max: 600,
    step: 1,
  },

  // ── العبء الدراسي والتسجيل ───────────────────────────────────────
  minRegHours: {
    group: 'load',
    label: 'الحد الأدنى لساعات الفصل العادي',
    hint: 'أقل مجموع ساعات يقبله نظام التسجيل في الفصل العادي للطالب المنتظم. أما الحد المخفَّض للطالب المُنذَر فيُضبط من بند «الحد الأقصى لساعات الطالب المُنذَر» في قسم «الإنذار والمراقبة والفصل»، لا من هنا.',
    bylaw: '«الفصل الدراسي مكون من 16 ساعة الحد الادني للدراسة لو طالب تحت المراقبة الاكاديمية يتم تقليص الي 12 ساعة».',
    ...HOURS_TERM,
    min: 1,
  },
  maxRegHours: {
    group: 'load',
    label: 'الحد الأقصى لساعات الفصل العادي',
    hint: 'أقصى عدد ساعات يسمح النظام بتسجيلها في الفصل العادي للطالب المنتظم.',
    bylaw: '«العبء الدراسي يجوز زياده عن 21 ساعه ادا كان للطالب معدل تراكميا عاليا من 3 نقاط فاكثر او في حالات التخرج».',
    ...HOURS_TERM,
    min: 1,
  },
  summerMaxHours: {
    group: 'load',
    label: 'الحد الأقصى لساعات الفصل الصيفي',
    hint: 'أقصى عدد ساعات في الفصل الصيفي المكثف.',
    bylaw: '«الفصل الصيفي 8 اسابيع مكثف … بحد اقصي 8 ساعات».',
    ...HOURS_TERM,
    min: 1,
  },
  withdrawWeek: {
    group: 'load',
    label: 'آخر أسبوع للانسحاب من المقرر',
    hint: 'آخر أسبوع دراسي يجوز فيه للطالب الانسحاب من المادة وتُرصد له حالة «منسحب».',
    bylaw: '«يجوز للطالب طلب الانسحاب من المادة قبل الاسبوع الثاني عشر او السادس من الفصل الصيفي بشرط الا يكون تعدي نسبة الغياب».',
    ...WEEKS,
    min: 1,
  },
  maxCourseAttempts: {
    group: 'load',
    label: 'أقصى عدد محاولات المقرر',
    unit: 'محاولة',
    hint: 'رسوب الطالب في المقرر بهذا العدد من المرات يمنعه من التسجيل في مقرر جديد قبل اجتيازه.',
    bylaw: '«اذا رسب الطالب في مقرر اكثر من 3 مرات علي التوالي لا يجوز التسجيل في مقرر جديد قبل نجاح في مقرر الذي رسب به ثلاث مرات».',
    min: 1,
    max: 20,
    step: 1,
    integer: true,
  },

  // ── التقديرات والمعدل التراكمي ───────────────────────────────────
  honorCgpa: {
    group: 'gpa',
    label: 'معدل مرتبة الشرف التراكمي',
    hint: 'أقل معدل تراكمي لاستحقاق مرتبة الشرف — شرط واجب مع بقية شروط المرتبة، لا بديل عنها.',
    bylaw: '«مرتبه الشرف تمنح الي الطلاب الذي لم يقل تقدير الفصلي عن 3.00 GPA وان يكون معدل تراكمي علي الاقل 3.33».',
    ...GPA,
  },
  honorTermGpa: {
    group: 'gpa',
    label: 'معدل مرتبة الشرف الفصلي',
    hint: 'أقل معدل فصلي يجب ألا يقل عنه الطالب في أي فصل اعتيادي ليظل مستحقاً لمرتبة الشرف.',
    bylaw: '«لم يقل تقدير الفصلي عن 3.00 GPA».',
    ...GPA,
  },
  honorMinTerms: {
    group: 'gpa',
    label: 'أقل عدد فصول اعتيادية لمرتبة الشرف',
    hint: 'المدة الاعتيادية للدراسة: أقل عدد فصول اعتيادية (بدون الصيفي). اكتب صفراً لتعطيل هذا الشرط.',
    bylaw: '«ان يكون حاصل في خلال المدة الاعتادية للدراسة من ( 7-9 فصول دراسية اعتيادية )».',
    ...TERMS,
  },
  honorMaxTerms: {
    group: 'gpa',
    label: 'أقصى عدد فصول اعتيادية لمرتبة الشرف',
    hint: 'الحد الأعلى للمدة الاعتيادية: من تجاوزه لا يُمنح مرتبة الشرف. اكتب صفراً لتعطيل هذا الشرط.',
    bylaw: '«خلال المدة الاعتادية للدراسة من ( 7-9 فصول دراسية اعتيادية )».',
    ...TERMS,
  },
  cgpaGradeBands: {
    group: 'gpa',
    label: 'جدول التقدير العام (جدول 4)',
    hint: 'التقدير المطبوع على بيان الحالة وكشف الخريجين وشهادة التخرج، ويُشتق من المعدل التراكمي. كل صف = أقل معدل + اسم التقدير، ويُرتَّب تنازلياً تلقائياً. أضف أو احذف صفوفاً حسب لائحتك.',
    bylaw: 'جدول 4 «تقدير عام»: ممتاز 3.40–4.00 · جيد جدا 3.00–3.39 · جيد 2.40–2.99 · مقبول 2.00–2.39 · ضعيف أقل من 2.00.',
    columns: [
      { key: 'minCgpa', label: 'أقل معدل تراكمي', kind: 'number', unit: 'نقطة', min: 0, max: GPA_MAX, step: 0.01 },
      { key: 'nameAr', label: 'اسم التقدير', kind: 'text' },
    ],
  },

  // ── الحضور والحرمان ──────────────────────────────────────────────
  absenceWarn1Percent: {
    group: 'attendance',
    label: 'نسبة الغياب للإنذار الأول',
    hint: 'بلوغ الطالب هذه النسبة من الغياب بدون عذر يوجّه له الإنذار الأول ويظهر في كشف الحرمان والإنذار.',
    bylaw: '«اذا غاب بدون عذر مقبول هو 15% من مجموع ساعات مقررة يوجه له الانذار الاول».',
    ...PCT,
  },
  absenceWarn2Percent: {
    group: 'attendance',
    label: 'نسبة الغياب للإنذار الثاني',
    hint: 'بلوغ هذه النسبة يوجّه الإنذار الثاني (تمهيداً للحرمان).',
    bylaw: '«الانذار الثاني عند نسبه 20%».',
    ...PCT,
  },
  absenceBanPercent: {
    group: 'attendance',
    label: 'نسبة الغياب للحرمان / الانسحاب الإجباري',
    hint: 'تجاوز الطالب هذه النسبة من الغياب بدون عذر يُرصد له كحرمان أو انسحاب إجباري حسب حالة النتيجة المختارة أدناه.',
    bylaw: '«اما اذا وصل 25% غياب بدون عذر فيعتبر منسحب اجباري» — وجدول 3: «ازا زادت نسبه الغياب عن 25% من اجمالي الساعات المقرر ولا يدخل في معدل التراكمي».',
    ...PCT,
  },
  absenceBanInclusive: {
    group: 'attendance',
    label: 'الحرمان عند بلوغ النسبة تماماً',
    hint: 'مُفعَّل: «وصل 25%» — بلوغ النسبة بالضبط يكفي للحرمان. متوقف: «زادت عن 25%» — وهو نص جدول 3 وسلوك النظام الحالي.',
    bylaw: 'تعارض داخل اللائحة نفسها: النص يقول «وصل 25%» بينما جدول 3 يقول «ازا زادت نسبه الغياب عن 25%».',
  },
  absenceBanStatusCode: {
    group: 'attendance',
    label: 'حالة النتيجة عند الحرمان',
    hint: 'رمز الحالة التي تُرصد للطالب المتجاوز لنسبة الغياب. يجب أن يطابق كوداً موجوداً في جدول حالات النتائج.',
    bylaw: 'جدول 3 يعطي التجاوز نتيجتين: «منسحب اجباري … ولا يدخل في معدل التراكمي» (FW) و«محروم … تتساوي مع راسب وتضاف الي معدل تراكمي» (DN).',
    optionsFrom: 'gradeStatusCode',
  },
  attendanceWarnThreshold: {
    group: 'attendance',
    label: 'عتبة تحذير نسبة الحضور',
    hint: 'الطالب الذي تنخفض نسبة حضوره إلى هذه النسبة أو أقل يظهر في تقرير تحذير الحضور. 85% حضور = 15% غياب، وهو أول تدخّل تنص عليه اللائحة.',
    bylaw: '«اذا غاب بدون عذر مقبول هو 15% من مجموع ساعات مقررة يوجه له الانذار الاول».',
    ...PCT,
  },

  // ── الامتحانات ورصد النتائج ──────────────────────────────────────
  writtenMinPercent: {
    group: 'exams',
    label: 'الحد الأدنى لدرجة الامتحان التحريري',
    hint: 'من يقل عن هذه النسبة في التحريري يُرصد «راسب لائحة» حتى لو تجاوز مجموعه درجة النجاح.',
    bylaw: 'جدول 3، راسب لائحه: «اقل من 30 % في الامتحان التحريري … لا تعتمد فقط على Final Grade >= 50».',
    ...PCT,
  },
  incompleteCourseworkPercent: {
    group: 'exams',
    label: 'أدنى نسبة أعمال فصلية لاستحقاق «غير مكتمل»',
    hint: 'لا تُمنح حالة «غير مكتمل» لمن لم يجتز هذه النسبة من الأعمال الفصلية، ويرفضها النظام عند الرصد.',
    bylaw: 'جدول 3، غير مكتمل: «اذا تقدم بعذر قهري عن عدم حضور الامتحان قبل 72 ساعة من الماده بشرط اجتياز 60 % من الاعمال الفصلية».',
    ...PCT,
  },
  makeupDeadlineWeeks: {
    group: 'exams',
    label: 'مهلة أداء الامتحان البديل / الاستكمال',
    hint: 'عدد الأسابيع من بداية الفصل التالي التي يجب خلالها أداء امتحان «غير مكتمل» أو «غائب بعذر»، وبعدها تُغلق الحالة.',
    bylaw: 'جدول 3، غير مكتمل: «ويكون الامتحان في الاسبوع الاول من التيرم التالي … وعادة بيمتحن في اول اسبوع او ثاني اسبوع تيرم التاني».',
    ...WEEKS,
  },
  repeatExemptComponents: {
    group: 'exams',
    label: 'إعفاء الطالب العايد من مكونات الدرجة',
    hint: 'المكونات التي يُعفى منها الطالب المعيد للمادة من المحاولة الثانية فصاعداً، ويُحسب مجموعه على المكونات المتبقية فقط. لا تختر شيئاً لعدم تطبيق أي إعفاء. لا يجوز إعفاؤه من كل المكونات.',
    bylaw: 'لائحة هذا المعهد لا تنص على إعفاء؛ الافتراضي «بدون إعفاء». لوائح أخرى تمنع العايد من أعمال السنة وتمتحنه في التحريري والعملي فقط.',
  },
  requireApprovedResult: {
    group: 'exams',
    label: 'لا تُحتسب المادة إلا بعد اعتماد وغلق النتيجة',
    hint: 'مُفعَّل: تظهر نتيجة الطالب «قيد الرصد» ما دامت لديه مواد مرصودة لم تُعتمد بعد. متوقف: تُحتسب المادة بمجرد رصد الدرجات — للمعهد الذي يعلن النتائج قبل خطوة الاعتماد الرسمية.',
    bylaw: 'قاعدة الكنترول التي تقوم عليها نتائج هذه اللائحة: المادة لا تُحتسب إلا بعد اعتماد النتيجة وغلقها.',
  },

  // ── الإنذار والمراقبة والفصل ─────────────────────────────────────
  probationGpa: {
    group: 'probation',
    label: 'معدل الإنذار الأكاديمي (التراكمي)',
    hint: 'الطالب الذي يقل معدله التراكمي عن هذه القيمة يوجَّه له إنذار أكاديمي ويُخفَّض عبؤه الدراسي.',
    bylaw: '«توجيه انذار اكاديمي اذا قل عن 2 ويخفض العب الدراسي الي 12 ساعة فصلية».',
    ...GPA,
  },
  probationHourCap: {
    group: 'probation',
    label: 'الحد الأقصى لساعات الطالب المُنذَر',
    hint: 'أقصى عدد ساعات يسمح النظام بتسجيلها للطالب أثناء الإنذار أو المراقبة الأكاديمية.',
    bylaw: '«ويخفض العب الدراسي الي 12 ساعة فصلية» — و«يتم الزامه بتخفيض عدد ساعات الي 12 ساعه للتيرم الواحد».',
    ...HOURS_TERM,
    min: 1,
  },
  maxConsecutiveProbation: {
    group: 'probation',
    label: 'أقصى عدد فصول الإنذار المتتالية',
    hint: 'بلوغ هذا العدد من فصول الإنذار المتتالية يعرّض الطالب للفصل. الفصل الصيفي لا يُحتسب.',
    bylaw: '«حصل علي اقل من 2 لمده اربع فصول متتالية يتم فصله ، وذلك بعد ان يتم توجيه انذار له في كل فصل ولا يحتسب الفصل الدراسي الصيفي».',
    ...TERMS,
    min: 1,
  },
  maxSeparateProbation: {
    group: 'probation',
    label: 'أقصى عدد فصول الإنذار المنفصلة',
    hint: 'بلوغ هذا العدد من فصول المراقبة غير المتتالية يُلغي قيد الطالب ويُدرجه ضمن الانتساب. الفصل الصيفي لا يُحتسب. (الفصل من المعهد له بند مستقل: «أقصى عدد فصول الإنذار المتتالية».)',
    bylaw: '«يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه ( ثلاث فصول متصله او اربعه فصول منفصله )».',
    ...TERMS,
    min: 1,
  },

  // ── النظام السنوي ────────────────────────────────────────────────
  annualPassPercent: {
    group: 'annual',
    label: 'نسبة النجاح في المادة',
    hint: 'أقل نسبة مئوية للنجاح في المادة على النظام السنوي؛ ما دونها «راسب». وهي أيضاً أرضية تقدير «مقبول».',
    bylaw: 'جدول 3: «راسب | اقل من 50 %».',
    ...PCT,
  },
  maxCarryOverSubjects: {
    group: 'annual',
    label: 'أقصى عدد مواد الدور الثاني',
    unit: 'مادة',
    hint: 'الرسوب في عدد مواد لا يتجاوز هذا العدد ← «له دور ثانٍ»؛ وأكثر منه ← «باقٍ للإعادة».',
    bylaw: 'قاعدة النظام السنوي المعمول بها في المعهد (لا يذكرها نص اللائحة المرفوع صراحةً) — اضبطها من لائحتك.',
    min: 0,
    max: 30,
    step: 1,
    integer: true,
  },
  annualExcellentMin: {
    group: 'annual',
    label: 'حد تقدير ممتاز',
    hint: 'النسبة المئوية التي يبدأ عندها تقدير «ممتاز» في النظام السنوي.',
    bylaw: 'جدول 4: «ممتاز | اعلي من 85%».',
    ...PCT,
  },
  annualVeryGoodMin: {
    group: 'annual',
    label: 'حد تقدير جيد جداً',
    hint: 'النسبة التي يبدأ عندها «جيد جداً» (وما دون حد الممتاز).',
    bylaw: 'جدول 4: «جيد جدا | اقل من 85% الي 75%».',
    ...PCT,
  },
  annualGoodMin: {
    group: 'annual',
    label: 'حد تقدير جيد',
    hint: 'النسبة التي يبدأ عندها «جيد» (وما دون حد الجيد جداً)، ومن نسبة النجاح حتى هذا الحد يكون التقدير «مقبول».',
    bylaw: 'جدول 4: «جيد | اقل من 75% الي 60%» و«مقبول | اقل من 60% الي 50%».',
    ...PCT,
  },
};

// ───────────────────────────── cross-field rules ─────────────────────────────
// Each names the offending field in Arabic so the admin knows what to fix.

export const CROSS_RULES: CrossRule[] = [
  {
    type: 'lte',
    a: 'minRegHours',
    b: 'maxRegHours',
    message: 'الحد الأدنى لساعات الفصل العادي يجب ألا يتجاوز الحد الأقصى لساعات الفصل العادي.',
  },
  {
    type: 'lte',
    a: 'probationHourCap',
    b: 'maxRegHours',
    message: 'الحد الأقصى لساعات الطالب المُنذَر يجب ألا يتجاوز الحد الأقصى لساعات الفصل العادي.',
  },
  {
    type: 'ascending',
    keys: ['absenceWarn1Percent', 'absenceWarn2Percent', 'absenceBanPercent'],
    message: 'نسب الغياب يجب أن تتصاعد: الإنذار الأول ≤ الإنذار الثاني ≤ نسبة الحرمان.',
  },
  {
    type: 'complementLte',
    a: 'attendanceWarnThreshold',
    b: 'absenceBanPercent',
    message: 'عتبة تحذير الحضور يجب أن تسبق الحرمان: نسبة الغياب المقابلة لها (100 − العتبة) يجب ألا تتجاوز نسبة الغياب للحرمان.',
  },
  {
    type: 'lte',
    a: 'honorMinTerms',
    b: 'honorMaxTerms',
    message: 'أقل عدد فصول لمرتبة الشرف يجب ألا يتجاوز أقصى عدد الفصول.',
    zeroDisables: true, // 0 on either half = «هذا الشرط معطَّل»
  },
  // ---- ترتيب حدود المعدل التراكمي. بدون هذه القواعد كان يمكن حفظ لائحة يصبح فيها كل طالب مُنذَراً
  // ومستحقاً لمرتبة الشرف في آن واحد (إنذار 3.90 مع شرف 1.00)، أو لائحة لا يتخرج فيها إلا الحاصل على
  // مرتبة الشرف (حد تخرج 3.50 مع شرف 3.33). نص اللائحة: «توجيه انذار اكاديمي اذا قل عن 2» و«معدل
  // تراكمي علي الاقل 3.33» و«الحد الادني للتخرج نقطتين».
  {
    type: 'lte',
    a: 'probationGpa',
    b: 'honorCgpa',
    message: 'معدل الإنذار الأكاديمي يجب ألا يتجاوز معدل مرتبة الشرف التراكمي — وإلا كان الطالب مُنذَراً ومستحقاً لمرتبة الشرف معاً.',
    zeroDisables: true, // صفر = لا إنذار / لا مرتبة شرف
  },
  {
    type: 'lte',
    a: 'graduationMinCgpa',
    b: 'honorCgpa',
    message: 'الحد الأدنى للمعدل التراكمي للتخرج يجب ألا يتجاوز معدل مرتبة الشرف — وإلا لم يتخرج إلا حاصل على مرتبة الشرف.',
    zeroDisables: true, // صفر = الشرط معطَّل
  },
  {
    type: 'ascending',
    keys: ['annualPassPercent', 'annualGoodMin', 'annualVeryGoodMin', 'annualExcellentMin'],
    message: 'حدود التقدير في النظام السنوي يجب أن تتصاعد: نسبة النجاح ≤ جيد ≤ جيد جداً ≤ ممتاز.',
  },
  {
    type: 'mapAscending',
    key: 'levelMinHours',
    message: 'ساعات الترقي بين المستويات يجب أن تتصاعد مع رقم المستوى.',
  },
  {
    type: 'mapValuesLte',
    key: 'levelMinHours',
    limit: 'graduationHours',
    message: 'ساعات الترقي إلى أي مستوى يجب ألا تتجاوز إجمالي ساعات التخرج.',
  },
  {
    type: 'uniqueRows',
    key: 'cgpaGradeBands',
    by: 'minCgpa',
    message: 'لا يجوز تكرار «أقل معدل تراكمي» في جدول التقدير العام — لكل تقدير حدّ مختلف.',
  },
  {
    type: 'mapKeysInteger',
    key: 'levelMinHours',
    message: 'رقم المستوى يجب أن يكون عدداً صحيحاً (1، 2، 3 …) — الصف الذي مفتاحه ليس رقماً لا يقرؤه النظام عند الترقي.',
  },
];

// ───────────────────────────── schema construction ─────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Derive an editor from the SHAPE of a value, so an undocumented key is still editable. */
export function inferKind(key: string, value: unknown): FieldKind {
  if (key === 'repeatExemptComponents') return 'components';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'text';
  if (isPlainObject(value) && Object.values(value).every((v) => typeof v === 'number')) return 'numberMap';
  if (Array.isArray(value) && value.length > 0 && value.every((v) => isPlainObject(v))) return 'rowTable';
  return 'json';
}

/** Columns for an undocumented array-of-objects key, taken from its first row. */
function inferColumns(value: unknown): ColumnSchema[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || !isPlainObject(value[0])) return undefined;
  return Object.entries(value[0]).map(([k, v]) => ({
    key: k,
    label: k,
    kind: typeof v === 'number' ? ('number' as const) : ('text' as const),
    step: typeof v === 'number' ? 0.01 : undefined,
  }));
}

export type BuildOptions = {
  /** Live GradeStatus codes, to fill the closed list of absenceBanStatusCode. */
  gradeStatuses?: { code: string; name: string }[];
};

/**
 * The field list for the screen: EVERY key of DEFAULT_REGULATIONS, plus every key already stored
 * for this institute that this build does not know about (so an older deploy can never hide — or
 * silently drop — a value a newer one wrote).
 */
export function buildFields(stored: Record<string, unknown>, opts: BuildOptions = {}): FieldSchema[] {
  const defaults = DEFAULT_REGULATIONS as unknown as Record<string, unknown>;
  const keys = [...Object.keys(defaults), ...Object.keys(stored).filter((k) => !(k in defaults))];

  return keys.map((key) => {
    const meta = META[key as keyof Regulations];
    const hasDefault = key in defaults;
    const sample = hasDefault ? defaults[key] : stored[key];
    const kind = inferKind(key, sample);

    let options = meta?.options;
    if (meta?.optionsFrom === 'gradeStatusCode' && opts.gradeStatuses?.length) {
      options = opts.gradeStatuses.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));
    }

    return {
      key,
      group: meta?.group ?? OTHER_GROUP,
      kind,
      label: meta?.label ?? key,
      unit: meta?.unit,
      hint:
        meta?.hint ??
        'بند أُضيف إلى اللائحة ولم يُكتب له وصف عربي بعد. القيمة قابلة للتعديل، وراجِعها مع لائحة معهدك قبل الحفظ.',
      bylaw: meta?.bylaw,
      min: meta?.min,
      max: meta?.max,
      step: meta?.step ?? (kind === 'number' ? 1 : undefined),
      integer: meta?.integer,
      options,
      mapKeyLabel: meta?.mapKeyLabel ?? (kind === 'numberMap' ? 'المفتاح' : undefined),
      columns: meta?.columns ?? (kind === 'rowTable' ? inferColumns(sample) : undefined),
      documented: Boolean(meta),
      default: hasDefault ? defaults[key] : undefined,
      hasDefault,
    };
  });
}

/** The component checkboxes the screen renders for `repeatExemptComponents`. */
export const COMPONENT_OPTIONS = COMPONENT_KEYS.map((k) => ({ value: k, label: COMPONENT_LABELS_AR[k] }));

// ───────────────────────────── validation ─────────────────────────────

export type ValidationError = { key: string; field: string; message: string };

function num(v: unknown): number | null {
  // A blank cell must be "no value", not zero: Number('') === 0, which silently saved an emptied
  // field as 0 and passed every min-0 range check.
  if (typeof v === 'string' && v.trim() === '') return null;
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Per-field checks: type, range, and the shape of the compound kinds. */
function validateField(f: FieldSchema, value: unknown): string | null {
  switch (f.kind) {
    case 'number': {
      const n = num(value);
      if (n === null) return `قيمة «${f.label}» يجب أن تكون رقماً.`;
      if (f.integer && !Number.isInteger(n)) return `قيمة «${f.label}» يجب أن تكون رقماً صحيحاً بلا كسور.`;
      if (f.min != null && n < f.min) return `قيمة «${f.label}» يجب ألا تقل عن ${f.min}${f.unit ? ' ' + f.unit : ''}.`;
      if (f.max != null && n > f.max) return `قيمة «${f.label}» يجب ألا تزيد عن ${f.max}${f.unit ? ' ' + f.unit : ''}.`;
      return null;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : `قيمة «${f.label}» يجب أن تكون تفعيلاً أو إيقافاً.`;
    case 'text': {
      if (typeof value !== 'string') return `قيمة «${f.label}» يجب أن تكون نصاً.`;
      if (value.length > 200) return `قيمة «${f.label}» أطول من المسموح (200 حرف).`;
      return null;
    }
    case 'components': {
      if (typeof value !== 'string') return `قيمة «${f.label}» يجب أن تكون قائمة مكونات.`;
      const parsed = parseComponentCsv(value);
      const raw = value.split(',').map((x) => x.trim()).filter(Boolean);
      if (raw.length !== parsed.length) return `قيمة «${f.label}» تحتوي على مكوّن غير معروف.`;
      // Exempting every component leaves a repeater with a denominator of zero — scored 0% and
      // filed as a fail. getRegulations() silently resets that; we reject it here so the admin
      // learns WHY instead of watching his choice disappear.
      if (parsed.length >= COMPONENT_KEYS.length) return `لا يمكن إعفاء الطالب العايد من كل مكونات الدرجة في «${f.label}» — اترك مكوّناً واحداً على الأقل.`;
      return null;
    }
    case 'numberMap': {
      if (!isPlainObject(value)) return `قيمة «${f.label}» يجب أن تكون جدول أرقام.`;
      for (const [k, v] of Object.entries(value)) {
        if (!k.trim()) return `«${f.label}»: يوجد صف بلا ${f.mapKeyLabel ?? 'مفتاح'}.`;
        const n = num(v);
        if (n === null) return `«${f.label}» — ${f.mapKeyLabel ?? 'المفتاح'} ${k}: القيمة يجب أن تكون رقماً.`;
        if (f.min != null && n < f.min) return `«${f.label}» — ${f.mapKeyLabel ?? 'المفتاح'} ${k}: القيمة يجب ألا تقل عن ${f.min}.`;
        if (f.max != null && n > f.max) return `«${f.label}» — ${f.mapKeyLabel ?? 'المفتاح'} ${k}: القيمة يجب ألا تزيد عن ${f.max}.`;
      }
      return null;
    }
    case 'rowTable': {
      if (!Array.isArray(value)) return `«${f.label}» يجب أن يكون جدول صفوف.`;
      if (value.length === 0) return `«${f.label}» لا يمكن أن يكون فارغاً — أضف صفاً واحداً على الأقل.`;
      for (const [i, row] of value.entries()) {
        if (!isPlainObject(row)) return `«${f.label}» — الصف ${i + 1}: صيغة غير صحيحة.`;
        for (const col of f.columns ?? []) {
          const cell = row[col.key];
          if (col.kind === 'number') {
            const n = num(cell);
            if (n === null) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب أن يكون رقماً.`;
            if (col.min != null && n < col.min) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب ألا يقل عن ${col.min}.`;
            if (col.max != null && n > col.max) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب ألا يزيد عن ${col.max}.`;
          } else if (typeof cell !== 'string' || !cell.trim()) {
            return `«${f.label}» — الصف ${i + 1}: «${col.label}» مطلوب.`;
          }
        }
      }
      return null;
    }
    case 'json':
      return null; // shape unknown to this build; stored as-is
  }
}

/** Cross-field checks, run on the EFFECTIVE bylaw (defaults merged with the incoming overrides). */
function validateCross(effective: Record<string, unknown>, byKey: Map<string, FieldSchema>): ValidationError[] {
  const errors: ValidationError[] = [];
  const label = (k: string) => byKey.get(k)?.label ?? k;

  for (const rule of CROSS_RULES) {
    switch (rule.type) {
      case 'lte': {
        const a = num(effective[rule.a]);
        const b = num(effective[rule.b]);
        if (a === null || b === null) break;
        // Only where the rule says so does 0 mean "condition disabled" (a disabled half never conflicts).
        if (rule.zeroDisables && (a === 0 || b === 0)) break;
        if (a > b) errors.push({ key: rule.a, field: label(rule.a), message: rule.message });
        break;
      }
      case 'ascending': {
        for (let i = 1; i < rule.keys.length; i++) {
          const prev = num(effective[rule.keys[i - 1]]);
          const cur = num(effective[rule.keys[i]]);
          if (prev === null || cur === null) continue;
          if (prev > cur) {
            errors.push({ key: rule.keys[i], field: label(rule.keys[i]), message: rule.message });
            break;
          }
        }
        break;
      }
      case 'complementLte': {
        const a = num(effective[rule.a]);
        const b = num(effective[rule.b]);
        if (a === null || b === null) break;
        if (100 - a > b) errors.push({ key: rule.a, field: label(rule.a), message: rule.message });
        break;
      }
      case 'mapAscending': {
        const map = effective[rule.key];
        if (!isPlainObject(map)) break;
        const rows = Object.entries(map)
          .map(([k, v]) => ({ k: Number(k), v: num(v) }))
          .filter((r) => Number.isFinite(r.k) && r.v !== null)
          .sort((x, y) => x.k - y.k);
        for (let i = 1; i < rows.length; i++) {
          if ((rows[i].v as number) < (rows[i - 1].v as number)) {
            errors.push({ key: rule.key, field: label(rule.key), message: rule.message });
            break;
          }
        }
        break;
      }
      case 'mapValuesLte': {
        const map = effective[rule.key];
        const limit = num(effective[rule.limit]);
        if (!isPlainObject(map) || limit === null) break;
        if (Object.values(map).some((v) => (num(v) ?? 0) > limit)) {
          errors.push({ key: rule.key, field: label(rule.key), message: rule.message });
        }
        break;
      }
      case 'mapKeysInteger': {
        const map = effective[rule.key];
        if (!isPlainObject(map)) break;
        if (Object.keys(map).some((k) => !Number.isInteger(Number(k.trim())) || k.trim() === '')) {
          errors.push({ key: rule.key, field: label(rule.key), message: rule.message });
        }
        break;
      }
      case 'uniqueRows': {
        const rows = effective[rule.key];
        if (!Array.isArray(rows)) break;
        const seen = new Set<string>();
        for (const row of rows) {
          if (!isPlainObject(row)) continue;
          const id = String(num(row[rule.by]) ?? row[rule.by]);
          if (seen.has(id)) {
            errors.push({ key: rule.key, field: label(rule.key), message: rule.message });
            break;
          }
          seen.add(id);
        }
        break;
      }
    }
  }
  return errors;
}

export type NormalizeResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: ValidationError[] };

/**
 * Validate an incoming override blob and normalise it to typed values.
 *
 * `incoming` carries ONLY what the institute overrides; anything absent keeps falling back to
 * DEFAULT_REGULATIONS in getRegulations(), so an institute that changes nothing keeps working.
 * `previouslyStored` is carried forward for keys this build does not know — an older deploy must
 * never wipe a value a newer one saved.
 */
export function validateAndNormalize(
  incoming: Record<string, unknown>,
  previouslyStored: Record<string, unknown>,
  opts: BuildOptions = {},
): NormalizeResult {
  const fields = buildFields({ ...previouslyStored, ...incoming }, opts);
  const byKey = new Map(fields.map((f) => [f.key, f] as [string, FieldSchema]));
  const errors: ValidationError[] = [];
  const value: Record<string, unknown> = {};

  const defaults = DEFAULT_REGULATIONS as unknown as Record<string, unknown>;
  for (const [key, raw] of Object.entries(incoming)) {
    // Only a key the bylaw knows — or one already stored for this institute (a newer deploy wrote
    // it) — may be saved. Anything else is dropped rather than accumulating junk in the blob.
    if (!(key in defaults) && !(key in previouslyStored)) continue;
    const f = byKey.get(key);
    if (!f) continue; // unreachable: buildFields covers every known key
    const coerced = coerce(f, raw);
    const err = validateField(f, coerced);
    if (err) errors.push({ key, field: f.label, message: err });
    else value[key] = coerced;
  }

  // A closed list is validated against LIVE data, not a literal, so an institute that renamed its
  // result states cannot save a code no engine will ever match.
  const banField = byKey.get('absenceBanStatusCode');
  if (banField && 'absenceBanStatusCode' in value && opts.gradeStatuses?.length) {
    const code = String(value.absenceBanStatusCode);
    if (!opts.gradeStatuses.some((s) => s.code === code)) {
      errors.push({
        key: 'absenceBanStatusCode',
        field: banField.label,
        message: `الرمز «${code}» غير موجود في جدول حالات النتائج — اختر رمزاً معرَّفاً في شاشة «حالات وقواعد النتائج».`,
      });
    }
  }

  // Keys this build does not know about survive the save untouched.
  for (const [key, raw] of Object.entries(previouslyStored)) {
    if (key in value) continue;
    if (key in incoming) continue; // the client deliberately reset it to the default
    if (!(key in defaults)) value[key] = raw;
  }

  if (errors.length) return { ok: false, errors };

  // Deep-merge the maps the way getRegulations() does. A shallow spread lets a partial levelMinHours
  // — say only { "3": 5 } — replace the whole map for validation purposes, so the "ascending" cross
  // rule sees a one-entry map, passes, and a corrupted promotion ladder is saved.
  const effective: Record<string, unknown> = { ...defaults, ...value };
  for (const f of fields) {
    if (f.kind !== 'numberMap') continue;
    const d = (defaults as Record<string, unknown>)[f.key];
    const v = (value as Record<string, unknown>)[f.key];
    if (d && typeof d === 'object' && v && typeof v === 'object') {
      effective[f.key] = { ...(d as object), ...(v as object) };
    }
  }
  const crossErrors = validateCross(effective, byKey);
  if (crossErrors.length) return { ok: false, errors: crossErrors };

  return { ok: true, value };
}

/** Bring a JSON-transported value to the type the engines expect (forms send numbers as strings). */
function coerce(f: FieldSchema, raw: unknown): unknown {
  switch (f.kind) {
    case 'number': {
      const n = num(raw);
      return n === null ? raw : n;
    }
    case 'boolean':
      return typeof raw === 'string' ? raw === 'true' : raw;
    case 'text':
    case 'components':
      return typeof raw === 'string' ? raw.trim() : raw;
    case 'numberMap': {
      if (!isPlainObject(raw)) return raw;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = num(v);
        out[String(k).trim()] = n === null ? NaN : n;
      }
      return out;
    }
    case 'rowTable': {
      if (!Array.isArray(raw)) return raw;
      return raw.map((row) => {
        if (!isPlainObject(row)) return row;
        const out: Record<string, unknown> = { ...row };
        for (const col of f.columns ?? []) {
          if (col.kind === 'number') {
            const n = num(row[col.key]);
            out[col.key] = n === null ? NaN : n;
          } else {
            out[col.key] = typeof row[col.key] === 'string' ? (row[col.key] as string).trim() : row[col.key];
          }
        }
        return out;
      });
    }
    default:
      return raw;
  }
}
