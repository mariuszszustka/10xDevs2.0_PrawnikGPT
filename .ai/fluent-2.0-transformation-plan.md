# Plan Transformacji UI w kierunku Microsoft Fluent 2.0 Design System

## 📋 Przegląd

Dokument opisuje plan transformacji interfejsu PrawnikGPT w kierunku Microsoft Fluent 2.0 Design System, z uwzględnieniem najlepszych praktyk czytelności i dostępności (WCAG AA).

**Data utworzenia:** 2025-01-XX  
**Status:** PLANOWANIE

---

## 🎨 1. Analiza Różnic: Shadcn/ui vs Fluent 2.0

### Obecny stan (Shadcn/ui)
- **Format kolorów:** HSL
- **Hierarchia typografii:** Podstawowa (body, heading)
- **Spacing:** Tailwind default (4px base)
- **Shadows:** Podstawowe (sm, md, lg)
- **Radius:** Jednolity (0.5rem)
- **Density:** Jeden poziom
- **Motion:** Minimalne animacje

### Docelowy stan (Fluent 2.0)
- **Format kolorów:** OKLCH (lepsza percepcja kolorów)
- **Hierarchia typografii:** 5 poziomów (Display, Title, Headline, Body, Caption)
- **Spacing:** 4px base unit z pełną skalą
- **Shadows:** 8 poziomów (2xs → 2xl) z blur i opacity
- **Radius:** Skalowalny (sm, md, lg, xl)
- **Density:** 3 poziomy (Compact, Comfortable, Spacious)
- **Motion:** Subtelne animacje (200-300ms) dla wszystkich interakcji

---

## 🔧 2. Zmiany Tokenów Design System

### 2.1. Typography Tokens

#### Obecne tokeny (do dodania):
```css
--font-display: /* 68px, Bold, line-height 1.2 */
--font-title: /* 42px, Semibold, line-height 1.3 */
--font-headline: /* 28px, Semibold, line-height 1.4 */
--font-body-large: /* 18px, Regular, line-height 1.5 */
--font-body: /* 16px, Regular, line-height 1.5 */
--font-body-small: /* 14px, Regular, line-height 1.5 */
--font-caption: /* 12px, Regular, line-height 1.4 */
```

#### Zmiany w Tailwind config:
- Dodanie typography scale do `theme.extend.fontSize`
- Mapowanie na Tailwind utilities: `text-display`, `text-title`, etc.
- Font weights: 400 (Regular), 600 (Semibold), 700 (Bold)

#### Zastosowanie:
- **Display:** Hero section na landing page
- **Title:** Główne nagłówki sekcji
- **Headline:** Nagłówki kart, modali
- **Body:** Główna treść, odpowiedzi czatu
- **Caption:** Metadane, timestamps, labels

---

### 2.2. Color Tokens (OKLCH Migration)

#### Konwersja z HSL na OKLCH:
- **Korzyści:** Lepsza percepcja kolorów, spójność w różnych przestrzeniach kolorów
- **Wsparcie:** Nowoczesne przeglądarki (Chrome 111+, Safari 16.4+, Firefox 113+)

#### Nowe tokeny kolorów:
```css
/* Primary - Neonowy zielony (już zastosowany w dark mode) */
--primary: oklch(0.8853 0.1908 162.0984);
--primary-hover: oklch(0.9100 0.2000 162.0984);
--primary-active: oklch(0.8500 0.1800 162.0984);
--primary-disabled: oklch(0.5000 0.0500 162.0984);

/* Semantic colors */
--success: oklch(0.7000 0.1500 150);
--warning: oklch(0.7500 0.1800 80);
--error: oklch(0.6500 0.2000 25);
--info: oklch(0.7000 0.1500 220);

/* Surface colors (Fluent 2.0 layers) */
--surface-base: oklch(0.1450 0 0); /* Dark background */
--surface-elevated: oklch(0.2050 0 0); /* Cards */
--surface-overlay: oklch(0.2690 0 0); /* Popovers, modals */
```

#### Zmiany w Tailwind config:
- Aktualizacja `colors` z OKLCH zamiast HSL
- Dodanie stanów hover/active/disabled dla primary
- Semantic colors dla feedback (success, warning, error, info)

---

### 2.3. Spacing Tokens

#### Fluent 2.0 spacing scale (4px base):
```css
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
```

#### Zmiany w Tailwind config:
- Rozszerzenie `spacing` o pełną skalę Fluent 2.0
- Zapewnienie spójności z 4px base unit

---

### 2.4. Shadow Tokens

#### Fluent 2.0 shadow system:
```css
--shadow-2xs: 0 1px 3px 0px oklch(0 0 0 / 0.05);
--shadow-xs: 0 1px 3px 0px oklch(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0px oklch(0 0 0 / 0.10), 0 1px 2px -1px oklch(0 0 0 / 0.10);
--shadow-md: 0 1px 3px 0px oklch(0 0 0 / 0.10), 0 2px 4px -1px oklch(0 0 0 / 0.10);
--shadow-lg: 0 1px 3px 0px oklch(0 0 0 / 0.10), 0 4px 6px -1px oklch(0 0 0 / 0.10);
--shadow-xl: 0 1px 3px 0px oklch(0 0 0 / 0.10), 0 8px 10px -1px oklch(0 0 0 / 0.10);
--shadow-2xl: 0 1px 3px 0px oklch(0 0 0 / 0.25);
```

#### Zastosowanie:
- **2xs/xs:** Subtle separators, borders
- **sm/md:** Cards, inputs
- **lg/xl:** Modals, popovers
- **2xl:** Elevated surfaces (rare)

---

### 2.5. Border Radius Tokens

#### Fluent 2.0 radius scale:
```css
--radius-sm: calc(var(--radius) - 4px);  /* 2px */
--radius-md: calc(var(--radius) - 2px);  /* 6px */
--radius-lg: var(--radius);              /* 10px (0.625rem) */
--radius-xl: calc(var(--radius) + 4px);  /* 14px */
```

#### Zastosowanie:
- **sm:** Small buttons, badges
- **md:** Inputs, default buttons
- **lg:** Cards, modals
- **xl:** Large containers

---

### 2.6. Motion Tokens

#### Fluent 2.0 animation system:
```css
--motion-duration-fast: 150ms;
--motion-duration-normal: 200ms;
--motion-duration-slow: 300ms;
--motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
--motion-easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
--motion-easing-accelerate: cubic-bezier(0.4, 0, 1, 1);
```

#### Zastosowanie:
- **fast:** Hover states, focus rings
- **normal:** Button clicks, modal open/close
- **slow:** Page transitions, complex animations

---

### 2.7. Density Tokens

#### Fluent 2.0 density levels:
```css
--density-compact: {
  --spacing-component: 0.5rem;  /* 8px */
  --spacing-section: 1rem;      /* 16px */
  --height-button: 24px;
  --height-input: 32px;
}

--density-comfortable: {
  --spacing-component: 0.75rem; /* 12px */
  --spacing-section: 1.5rem;   /* 24px */
  --height-button: 32px;
  --height-input: 40px;
}

--density-spacious: {
  --spacing-component: 1rem;    /* 16px */
  --spacing-section: 2rem;      /* 32px */
  --height-button: 40px;
  --height-input: 48px;
}
```

#### Domyślna gęstość:
- **Comfortable** (dla większości interfejsu)
- **Compact** (dla list, tabel)
- **Spacious** (dla landing page, hero sections)

---

## 🎯 3. Transformacja Komponentów

### 3.1. Button

#### Zmiany:
- **Rozmiary:** Small (24px), Medium (32px), Large (40px)
- **Warianty:** Primary, Secondary, Subtle, Transparent
- **Stany:** Hover, Active, Focus (z wyraźnym ring), Disabled
- **Motion:** 200ms transition dla wszystkich stanów
- **Focus:** 2px ring z primary color (WCAG AA kontrast)

#### Tokeny:
```css
--button-height-sm: 24px;
--button-height-md: 32px;
--button-height-lg: 40px;
--button-padding-x-sm: 12px;
--button-padding-x-md: 16px;
--button-padding-x-lg: 20px;
--button-radius: var(--radius-md);
```

---

### 3.2. Input

#### Zmiany:
- **Rozmiary:** Small (32px), Medium (40px), Large (48px)
- **Stany:** Default, Focus (z ring), Error (czerwony border + ikona), Disabled
- **Placeholder:** Subtelny, kontrastowy (WCAG AA)
- **Walidacja:** Komunikaty błędów pod polem (12px font, czerwony kolor)
- **Prefix/Suffix:** Wsparcie dla ikon i tekstu

#### Tokeny:
```css
--input-height-sm: 32px;
--input-height-md: 40px;
--input-height-lg: 48px;
--input-padding-x: 12px;
--input-border-width: 1px;
--input-border-radius: var(--radius-md);
--input-focus-ring: 2px solid var(--primary);
```

---

### 3.3. Typography

#### Zmiany:
- **Hierarchia:** 5 poziomów z wyraźnymi rozmiarami
- **Font:** Segoe UI Variable (systemowy) lub fallback stack
- **Line height:** 1.2-1.5 w zależności od rozmiaru
- **Tracking:** Normal (0em) dla wszystkich poziomów

#### Zastosowanie w komponentach:
- **ResponseCard:** `text-body` dla treści, `text-caption` dla metadanych
- **ChatInput:** `text-body` dla placeholder
- **HistoryList:** `text-headline` dla tytułów, `text-body-small` dla dat

---

### 3.4. Card

#### Zmiany:
- **Warianty:** Elevated (shadow-md), Filled (tło), Outlined (border)
- **Padding:** 16px-24px w zależności od density
- **Hover:** Subtelny shadow lift (shadow-lg)
- **Interaktywność:** Cursor pointer dla klikalnych kart

#### Tokeny:
```css
--card-padding: var(--spacing-4);
--card-padding-spacious: var(--spacing-6);
--card-radius: var(--radius-lg);
--card-shadow: var(--shadow-md);
--card-shadow-hover: var(--shadow-lg);
```

---

### 3.5. Modal/Dialog

#### Zmiany:
- **Overlay:** Półprzezroczyste tło z blur (backdrop-blur-sm)
- **Pozycjonowanie:** Wyśrodkowany, z animacją fade-in (300ms)
- **Rozmiary:** Small (400px), Medium (600px), Large (800px), Fullscreen
- **Focus trap:** Automatyczne zarządzanie fokusem
- **Zamknięcie:** X button, Escape key, click outside

#### Tokeny:
```css
--modal-overlay: oklch(0 0 0 / 0.5);
--modal-backdrop-blur: 8px;
--modal-radius: var(--radius-lg);
--modal-shadow: var(--shadow-2xl);
--modal-max-width-sm: 400px;
--modal-max-width-md: 600px;
--modal-max-width-lg: 800px;
```

---

### 3.6. Form

#### Zmiany:
- **Grupowanie:** Fieldset z legend dla sekcji
- **Walidacja:** Real-time i po submit
- **Komunikaty błędów:** Pod każdym polem (12px, czerwony)
- **Wymagane pola:** Asterisk (*) + aria-required
- **Help text:** Opcjonalne podpowiedzi (12px, muted color)

#### Tokeny:
```css
--form-spacing-field: var(--spacing-4);
--form-spacing-section: var(--spacing-6);
--form-error-color: var(--error);
--form-error-font-size: 12px;
--form-help-color: var(--muted-foreground);
```

---

### 3.7. Navigation

#### Zmiany:
- **Typy:** Horizontal, Vertical, Breadcrumb, Tabs
- **Stany:** Active (primary color), Hover, Focus, Disabled
- **Ikony:** Opcjonalne przed tekstem
- **Badge:** Powiadomienia/liczniki (małe kółko, primary color)
- **Keyboard navigation:** Pełna obsługa (Tab, Arrow keys, Enter)

#### Tokeny:
```css
--nav-item-height: 40px;
--nav-item-padding-x: 16px;
--nav-item-padding-y: 8px;
--nav-active-indicator: 2px solid var(--primary);
--nav-badge-size: 8px;
```

---

### 3.8. List

#### Zmiany:
- **Typy:** Single-select, Multi-select, Virtualized (dla długich list)
- **Elementy:** ListItem z avatar, ikoną, akcjami
- **Interakcje:** Hover (subtle background), Selected (primary background), Focus
- **Grupowanie:** Sekcje z nagłówkami (12px, muted color)

#### Tokeny:
```css
--list-item-height: 40px;
--list-item-padding-x: 16px;
--list-item-padding-y: 8px;
--list-item-hover: var(--muted);
--list-item-selected: var(--primary);
--list-section-header: 12px;
```

---

### 3.9. Feedback

#### Zmiany:
- **Toast/Notification:** Non-blocking, auto-dismiss (5s), z ikoną
- **Progress:** Linear (dla długich operacji), Circular (dla krótkich)
- **Skeleton:** Loading placeholders z animacją pulse
- **Empty State:** Ilustracja + tekst + CTA button
- **Error Boundary:** Komunikaty błędów aplikacji z możliwością refresh

#### Tokeny:
```css
--toast-duration: 5000ms;
--toast-max-width: 400px;
--progress-height: 4px;
--skeleton-animation: pulse 1.5s ease-in-out infinite;
--empty-state-spacing: var(--spacing-8);
```

---

### 3.10. Layout

#### Zmiany:
- **Grid System:** 12-kolumnowy, responsywny
- **Containers:** Max-width z wyśrodkowaniem (1400px dla desktop)
- **Breakpoints:** Mobile (320px), Tablet (768px), Desktop (1024px+)
- **Z-index layers:** Hierarchia nakładania (modal: 1000, dropdown: 100)

#### Tokeny:
```css
--container-max-width: 1400px;
--breakpoint-mobile: 320px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 1024px;
--z-index-dropdown: 100;
--z-index-modal: 1000;
--z-index-toast: 1100;
```

---

## ♿ 4. Dostępność (WCAG AA)

### 4.1. Kontrast kolorów

#### Wymagania:
- **Tekst normalny:** 4.5:1 kontrast z tłem
- **Tekst duży (18px+):** 3:1 kontrast z tłem
- **Interactive elements:** 3:1 kontrast dla focus states

#### Weryfikacja:
- Użycie narzędzi: WebAIM Contrast Checker, axe DevTools
- Testowanie z neonowym zielonym primary w dark mode
- Zapewnienie kontrastu dla wszystkich stanów (hover, active, disabled)

---

### 4.2. Focus Management

#### Wymagania:
- **Focus indicators:** Widoczne na wszystkich interaktywnych elementach
- **Focus trap:** W modalach i dropdownach
- **Keyboard navigation:** Pełna obsługa (Tab, Shift+Tab, Enter, Escape, Arrow keys)

#### Implementacja:
- 2px ring z primary color dla focus states
- `focus-visible` zamiast `focus` (nie pokazuj focus przy kliknięciu myszką)
- `tabindex` management w modalach

---

### 4.3. ARIA Attributes

#### Wymagania:
- **Labels:** `aria-label` dla ikon bez tekstu
- **States:** `aria-expanded`, `aria-selected`, `aria-disabled`
- **Live regions:** `aria-live` dla dynamicznych treści (toast, notifications)
- **Landmarks:** Semantic HTML (`<main>`, `<nav>`, `<article>`)

---

### 4.4. Screen Reader Support

#### Wymagania:
- **Alt text:** Dla wszystkich obrazów
- **Skip links:** "Skip to main content" link
- **Headings hierarchy:** H1 → H2 → H3 (bez pomijania poziomów)

---

## 📐 5. Plan Implementacji

### Faza 1: Tokeny podstawowe (Week 1)
- [ ] Migracja kolorów na OKLCH
- [ ] Typography tokens (5 poziomów)
- [ ] Spacing tokens (4px base)
- [ ] Shadow tokens (8 poziomów)
- [ ] Radius tokens (4 poziomy)

### Faza 2: Motion i Density (Week 1-2)
- [ ] Motion tokens (duration, easing)
- [ ] Density tokens (3 poziomy)
- [ ] Animacje podstawowe (hover, focus, click)

### Faza 3: Komponenty podstawowe (Week 2)
- [ ] Button (4 warianty, 3 rozmiary)
- [ ] Input (3 rozmiary, walidacja)
- [ ] Card (3 warianty)
- [ ] Typography utilities

### Faza 4: Komponenty zaawansowane (Week 3)
- [ ] Modal/Dialog
- [ ] Form (walidacja, komunikaty błędów)
- [ ] Navigation (horizontal, vertical, tabs)
- [ ] List (single/multi-select)

### Faza 5: Feedback i Layout (Week 3-4)
- [ ] Toast/Notification
- [ ] Progress indicators
- [ ] Skeleton loaders
- [ ] Empty states
- [ ] Layout system (grid, containers)

### Faza 6: Dostępność i testy (Week 4)
- [ ] WCAG AA compliance check
- [ ] Keyboard navigation testy
- [ ] Screen reader testy
- [ ] Kontrast kolorów weryfikacja
- [ ] Responsywność testy

---

## 🎨 6. Przykłady Zastosowania

### 6.1. Chat Interface z Fluent 2.0

```tsx
// ChatInput z Fluent 2.0 tokens
<Textarea
  className="
    h-[var(--input-height-md)]
    px-[var(--input-padding-x)]
    rounded-[var(--radius-md)]
    text-body
    focus:ring-2 focus:ring-primary
    transition-all duration-[var(--motion-duration-normal)]
  "
/>
```

### 6.2. ResponseCard z Fluent 2.0

```tsx
<Card className="
  p-[var(--card-padding)]
  rounded-[var(--card-radius)]
  shadow-[var(--card-shadow)]
  hover:shadow-[var(--card-shadow-hover)]
  transition-shadow duration-[var(--motion-duration-normal)]
">
  <CardContent className="text-body">
    {/* Treść odpowiedzi */}
  </CardContent>
  <CardFooter className="text-caption text-muted-foreground">
    {/* Metadane */}
  </CardFooter>
</Card>
```

### 6.3. Button z Fluent 2.0

```tsx
<Button
  size="md" // 32px height
  variant="primary"
  className="
    transition-all duration-[var(--motion-duration-normal)]
    focus-visible:ring-2 focus-visible:ring-primary
  "
>
  Wyślij pytanie
</Button>
```

---

## 📊 7. Metryki Sukcesu

### Czytelność:
- ✅ Kontrast 4.5:1 dla wszystkich tekstów
- ✅ Hierarchia typografii wyraźnie widoczna
- ✅ Spacing spójny w całej aplikacji

### Dostępność:
- ✅ WCAG AA compliance (100%)
- ✅ Keyboard navigation (100% coverage)
- ✅ Screen reader support (testowane z NVDA/JAWS)

### Wydajność:
- ✅ Bundle size <50KB (bez zmian)
- ✅ Animacje 60fps (bez jank)
- ✅ First Contentful Paint <2s

---

## 🔗 8. Zasoby

- **Microsoft Fluent 2.0:** https://fluent2.microsoft.design/
- **OKLCH Color:** https://oklch.com/
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/

---

## 📝 Notatki

- Neonowy zielony primary już zastosowany w dark mode
- OKLCH wymaga nowoczesnych przeglądarek (fallback na HSL dla starszych)
- Fluent 2.0 density może być konfigurowalna przez użytkownika (future enhancement)
- Motion tokens mogą być wyłączone dla użytkowników z `prefers-reduced-motion`

