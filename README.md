# مُحرّك الأوامر - Enterprise Prompt Engineering Workbench

## نظرة عامة

تطبيق ويب متقدم لهندسة البرومبت المؤسسي، يحوّل الطلبات البسيطة إلى بروتوكولات تنفيذ احترافية مع تحكم كامل في دورة الحياة.

## ✨ التحسينات المنفذة

### 1. Intent Analyzer Layer ✅

**الملف:** `src/lib/prompt/intentAnalyzer.ts`

**الوظائف:**
- تحليل نية المستخدم وتصنيف نوع المهمة (15 نوع)
- تقدير مستوى المخاطرة (low/medium/high/critical)
- تحديد تعقيد المهمة (simple/moderate/complex)
- اختيار المكونات المطلوبة تلقائياً
- اقتراح الشخصية المناسبة
- حل التبعيات بين المكونات

**المخرجات:**
```typescript
interface IntentAnalysisResult {
  taskType: TaskType;
  riskLevel: RiskLevel;
  complexity: "simple" | "moderate" | "complex";
  components: PromptComponentDecision[];
  suggestedPersona?: PersonaSpec;
  confidence?: number;
  warnings?: string[];
}
```

### 2. Prompt Registry ✅

**الملف:** `src/lib/prompt/registry.ts`

**الوظائف:**
- إدارة أصول البرومبت (Prompt Assets)
- نظام إصدارات Semantic Versioning
- دورة حياة كاملة (draft → review → published → deprecated)
- سجل تدقيق غير قابل للتغيير
- مقارنة الإصدارات
- تخزين محلي مع استعداد لـ Supabase

**الكيانات:**
- `PromptAsset` - الأصل الرئيسي
- `PromptVersion` - إصدار محدد
- `AuditEvent` - سجل التدقيق

### 3. Red-Team Engine ✅

**الملف:** `src/lib/prompt/redTeam.ts`

**الوظائف:**
- محاكاة هجمات أمنية منهجية
- 6 أنواع هجمات:
  - Prompt Injection
  - Context Poisoning
  - Data Leakage
  - Unsafe Instructions
  - Output Violations
  - Hallucination Inducement
- تحليل ثابت (Static Analysis)
- تقارير نتائج شفافة

**المبدأ الأساسي:**
> "لا تختلق نتائج الاختبار أبداً"

### 4. Evaluation Engine ✅

**الملف:** `src/lib/prompt/evaluation.ts`

**الوظائف:**
- قياس مقاييس الجودة:
  - Correctness
  - Coverage
  - Specificity
- مقاييس RAG:
  - Groundedness
  - Citation Precision/Recall
- مقاييس التشغيل:
  - Token Usage
  - Failure Rate
- حالات اختبار وظيفية وعدائية

### 5. Prompt Workspace ✅

**الملف:** `src/components/WorkspacePanel.tsx`

**الميزات:**
- مساحة عمل موحدة للبرومبت
- 3 أوضاع تشغيل:
  - **Quick**: للطلبات اليومية البسيطة
  - **Expert**: تحكم كامل في المواصفات
  - **Enterprise**: إصدارات واختبارات وحوكمة
- 5 علامات تبويب:
  - Intent (النية)
  - Specification (المواصفة)
  - Compiled (المُجمَّع)
  - Validation (التحقق)
  - Registry (سجل الأصول)

### 6. تبديل الأوضاع ✅

**الأوضاع:**
- **Quick Mode**: واجهة مبسطة، لا تظهر المواصفات أو الاختبارات
- **Expert Mode**: كل المكونات ظاهرة، تحكم كامل
- **Enterprise Mode**: Registry + Versions + Tests + Governance

**التبديل:**
- صريح: عبر أزرار في الواجهة
- ضمني: النظام يقترح الترقية للمهام المعقدة

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────┐
│         Prompt Workspace                │
│  (Quick / Expert / Enterprise Modes)    │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────┐          ┌──────────────┐
│  Intent  │          │   Registry   │
│ Analyzer │          │  (Assets &   │
│          │          │   Versions)  │
└────┬─────┘          └──────┬───────┘
     │                       │
     └───────────┬───────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌──────────┐
   │ Compiler│      │ Red-Team │
   │         │      │  Engine  │
   └────┬────┘      └────┬─────┘
        │                │
        └────────┬───────┘
                 │
                 ▼
          ┌────────────┐
          │ Evaluation │
          │   Engine   │
          └────────────┘
```

## 📦 الملفات المضافة

### المحركات (Engines)
- `src/lib/prompt/intentAnalyzer.ts` - تحليل النية
- `src/lib/prompt/registry.ts` - سجل الأصول
- `src/lib/prompt/redTeam.ts` - محرك Red-Team
- `src/lib/prompt/evaluation.ts` - محرك التقييم

### الواجهة (UI)
- `src/components/WorkspacePanel.tsx` - مساحة العمل

### الترجمة (i18n)
- تحديث `src/lib/i18n.tsx` بإضافة:
  - نصوص الأوضاع (Quick/Expert/Enterprise)
  - نصوص مساحة العمل
  - نصوص سجل الأصول
  - نصوص الجاهزية
  - نصوص حالة التنفيذ

## 🎯 المبادئ المحققة

### 1. لا تختلق النتائج
- كل اختبار يُبلغ عن حالته بصدق
- `not_executed` ≠ `failed`
- `static_analysis` ≠ `executed`

### 2. الحد الأدنى الكافي
- Intent Analyzer يختار فقط المكونات المطلوبة
- لا توجد حقول غير ضرورية
- Quick Mode يخفي التعقيد

### 3. البرومبت كأصل مؤسسي
- كل تغيير يولد إصداراً جديداً
- سجل تدقيق كامل
- دورة حياة واضحة

### 4. الأمان كطبقة أولى
- Red-Team يكتشف الثغرات
- Validation يتحقق من المطابقة
- Failure Handling يحدد السلوك

### 5. الشفافية
- كل قرار له سبب
- كل نتيجة لها دليل
- كل اختبار له حالة

## 🚀 الاستخدام

### الوضع السريع (Quick)
1. اكتب طلبك
2. احصل على تحليل فوري
3. انسخ البرومبت المُجمَّع

### وضع الخبير (Expert)
1. اكتب طلبك
2. راجع المواصفة الكاملة
3. عدّل المكونات حسب الحاجة
4. شغّل التحقق
5. انسخ البرومبت النهائي

### الوضع المؤسسي (Enterprise)
1. اكتب طلبك
2. راجع المواصفة
3. شغّل Red-Team
4. شغّل الاختبارات
5. احفظ كأصل في Registry
6. أنشئ إصداراً
7. انشر بعد الموافقة

## 📊 الإحصائيات

- **15 نوع مهمة** مدعوم
- **4 مستويات مخاطرة** (low/medium/high/critical)
- **6 أنواع هجمات** Red-Team
- **10+ مقاييس** تقييم
- **3 أوضاع تشغيل** (Quick/Expert/Enterprise)
- **250+ أمر** بصري ومهام

## 🔧 التطوير المستقبلي

### المرحلة التالية
1. **Supabase Integration** - مزامنة سحابية
2. **Real Model Execution** - تنفيذ فعلي على النماذج
3. **Dataset Management** - إدارة مجموعات البيانات
4. **Approval Workflow** - سير عمل الموافقات
5. **Production Monitoring** - مراقبة الإنتاج

### التكاملات الممكنة
- OpenAI API
- Anthropic Claude
- Google Gemini
- Custom Models

## 📝 ملاحظات تقنية

### التخزين
- حالياً: LocalStorage فقط
- مستقبلاً: Supabase + LocalStorage fallback

### الاختبارات
- حالياً: Static Analysis فقط
- مستقبلاً: Real Execution مع Models

### الأمان
- Injection Protection
- Data Leakage Protection
- Output Validation
- Failure Handling

## 🎓 التعلم

### للمبتدئين
ابدأ بـ **Quick Mode**:
- اكتب طلباً بسيطاً
- راقب التحليل التلقائي
- انسخ النتيجة

### للمتقدمين
استخدم **Expert Mode**:
- تحكم في كل مكون
- شغّل التحقق
- عدّل المواصفة

### للمؤسسات
استخدم **Enterprise Mode**:
- إدارة الأصول
- إصدارات متعددة
- اختبارات شاملة
- سجل تدقيق

## 📄 الترخيص

مشروع تعليمي/بحثي لهندسة البرومبت المؤسسي.

---

**تم التطوير بواسطة:** مُحرّك الأوامر - Enterprise Prompt Engineering Workbench  
**الإصدار:** 2.0.0  
**التاريخ:** 2026
