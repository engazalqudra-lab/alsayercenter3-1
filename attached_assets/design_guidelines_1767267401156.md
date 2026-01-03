# Design Guidelines: مركز اضواء الساير للعلاج الطبيعي والمساند الطبية

## Design Approach
**System**: Material Design with healthcare optimization - forms-heavy, data-entry focused, offline-first progressive web app

## Layout Structure

### Header Section
- Center: "مركز اضواء الساير للعلاج الطبيعي والمساند الطبية" logo/text
- Left side: Image representing medical aids
- Right side: Image representing physical therapy
- Fixed header that remains visible during scrolling

### Main Form Layout
Single-column form with clear visual grouping and RTL (Right-to-Left) support for Arabic text:

**Patient Information Block**
- اسم المريض (Patient Name) - text input
- العمر (Age) - number input
- السكن (Residence) - text input
- رقم الهاتف (Phone) - tel input
- اسم الطبيب (Doctor Name) - text input
- التشخيص (Diagnosis) - textarea
- المطلوب من قبل الطبيب (Doctor's Request) - textarea

**Surgical History Block**
- "هل توجد عملية جراحية؟" (Surgery?) - Yes/No radio buttons
- Conditional: نوع العملية (Surgery Type) - text input (appears only if Yes)

**Medical Care Section**
- "هل يحتاج الى رعاية طبية؟" (Needs Medical Care?) - Yes/No radio
- Conditional branching:
  - **Option 1**: تمارين منزلية (Home Exercises) - checkbox
  - **Option 2**: جلسات (Sessions) - checkbox with sub-options:
    - اجهزة (Equipment) or تمارين (Exercises) - radio selection
    - عدد الجلسات (Number of Sessions) - number input
    - سعر الجلسة (Session Price in IQD) - number input with currency indicator

**Medical Aids Section**
- "هل يحتاج الى مساند طبية؟" (Needs Medical Aids?) - Yes/No radio
- Conditional fields:
  - نوع المسند (Aid Type) - dropdown/text input
  - سعر المسند (Aid Price in IQD) - number input with currency

**Medical Attachments**
- المرفقات العلاجية (Medical Attachments)
- Image upload interface with camera icon
- Support for X-rays and medical imaging
- Thumbnail preview grid after upload

**Summary Section**
- التقييم الاجمالي (Overall Assessment) - textarea
- المبلغ الاجمالي (Total Amount) - auto-calculated, display only, IQD
- المبلغ الواصل الاجمالي (Total Received Amount) - number input, IQD

## Typography
- Primary: Noto Sans Arabic (Google Fonts) for excellent Arabic rendering
- Sizes: Headings 24px, Form Labels 16px, Input Text 18px
- Weight: Regular (400) for body, Semibold (600) for labels

## Spacing System
Tailwind units: 2, 4, 6, 8 for consistent rhythm
- Form field gaps: space-y-6
- Section separation: mb-8
- Input padding: p-4
- Container padding: px-6 py-8

## Component Specifications

**Form Inputs**
- Full-width with clear labels above
- Bordered style with focus states
- Error states with red accent
- Helper text below inputs where needed

**Radio/Checkbox Groups**
- Horizontal layout where space permits
- Clear visual selection states
- Large touch targets (min 44px)

**Conditional Fields**
- Smooth reveal/hide animations
- Indented to show hierarchy
- Visual connection to parent field

**Upload Interface**
- Drag-and-drop zone with border
- Camera icon prominently displayed
- Grid layout for multiple images (2-3 columns)
- Delete option on image thumbnails

**Calculation Fields**
- Read-only with distinct background
- Currency symbol (IQD) clearly visible
- Larger font size for amounts

**Action Buttons**
- Primary: Save Patient Record - full-width, prominent
- Secondary: Clear Form, Export Data - outlined style
- Positioned at bottom of form

## Progressive Web App Features
- Offline indicator badge (top-right)
- Sync status notification
- Local storage indication
- Install prompt for mobile

## Images
- **Header Images**: Professional photos showing physical therapy equipment (left) and medical aids/supports (right) - should convey clinical professionalism
- Images should be high quality, horizontally oriented, approximately 400x300px each

## Accessibility
- All form labels properly associated
- Keyboard navigation through form
- Screen reader support for conditional fields
- High contrast text (WCAG AA minimum)
- RTL layout fully supported

This is a professional medical data entry application prioritizing clarity, efficiency, and offline reliability.