# Mapa Relacji Prawnych w Systemie ISAP/ELI
## Kompleksowy Przewodnik do Indeksowania Aktów Prawnych

---

## Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Struktura Metadanych](#struktura-metadanych)
3. [Typy Relacji Między Aktami](#typy-relacji-między-aktami)
4. [Kombinacje Kierunków Relacji](#kombinacje-kierunków-relacji)
5. [Struktura Danych API](#struktura-danych-api)
6. [Implementacja Knowledge Grafu](#implementacja-knowledge-grafu)
7. [Praktyczne Przykłady](#praktyczne-przykłady)

---

## Wprowadzenie

Internetowy System Aktów Prawnych (ISAP) oraz jego międzynarodowy odpowiednik ELI (European Legislation Identifier) udostępniają kompleksową bazę polskich aktów prawnych z rozbudowaną strukturą metadanych i powiązań.

System ISAP dostępny jest pod adresem: **https://isap.sejm.gov.pl**

API ELI dostępne jest pod adresem: **https://api.sejm.gov.pl/eli**

### Trzy Filary ELI

1. **Ujednolicone Identyfikatory URI** - Każdy akt ma unikalny identyfikator (np. `https://eli.gov.pl/eli/DU/2023/682/ogl`)
2. **Metadane w Standardowym Formacie** - Opisują akt, organy, daty, relacje
3. **Publikacja Metadanych w RDFa** - Umożliwia automatyczne przetwarzanie przez systemy AI/ML

---

## Struktura Metadanych

### Kategorie Metadanych

#### 1. Identyfikatory i Adresy

| Pole | Opis | Przykład |
|------|------|---------|
| `address` | Adres publikacji (format: publisher+rok+tom+pozycja) | `WDU20170002196` |
| `ELI` | Europejski Identyfikator Prawodawstwa | `DU/2017/2196` |
| `displayAddress` | Adres wyświetlany | `Dz.U. 2017 poz. 2196` |
| `pos` | Pozycja w roku (lub tomie) | `2196` |
| `volume` | Tom publikacji (0 po 2012 roku) | `1` |
| `year` | Rok publikacji | `2017` |

#### 2. Informacje Podstawowe

| Pole | Opis | Rodzaj Danych |
|------|------|---------------|
| `title` | Pełny tytuł aktu | String |
| `type` | Typ aktu (Ustawa, Rozporządzenie, Obwieszczenie, itp.) | String |
| `publisher` | Kod wydawcy (DU, MP, WDU, itd.) | String |

#### 3. Daty Krytyczne

| Pole | Opis | Znaczenie |
|------|------|----------|
| `announcementDate` | Data ogłoszenia w dzienniku | Kiedy akt został opublikowany oficjalnie |
| `promulgation` | Data promulgacji | Kiedy został ogłoszony przez organ |
| `entryIntoForce` | Data wejścia w życie | Kiedy akt zaczął obowiązywać |
| `validFrom` | Data wiążącości | Kiedy akt jest obowiązujący |
| `repealDate` | Data uchylenia | Kiedy akt został uchylony |
| `expirationDate` | Data wygaśnięcia | Kiedy akt naturalnie wygasł |
| `legalStatusDate` | Data stanu prawnego | Do kiedy metadane są aktualne |
| `changeDate` | Ostatnia zmiana w systemie | Timestamp zmian w ISAP |

#### 4. Status i Obowiązywanie

| Pole | Wartości | Opis |
|------|----------|------|
| `status` | obowiązujący, uchylony, wygaśnięcie, itp. | Wyszczególniony status |
| `inForce` | IN_FORCE, NOT_IN_FORCE, UNKNOWN | Czy akt obowiązuje |

#### 5. Organy i Instytucje

| Pole | Opis |
|------|------|
| `releasedBy` | Organ wydający akt (np. Sejm, Rada Ministrów, Minister) |
| `authorizedBody` | Organ uprawniony do działania |
| `obligated` | Organ zobowiązany do wykonania |

#### 6. Zawartość i Słowa Kluczowe

| Pole | Opis |
|------|------|
| `keywords` | Słowa kluczowe do kategoryzacji (np. "celne prawo") |
| `keywordsNames` | Nazwy własne wymieniiane w akcie |
| `comments` | Dodatkowe komentarze |

#### 7. Teksty Dostępne

| Kod | Typ | Opis |
|-----|------|------|
| `O` | Ogłoszony | Tekst w postaci ogłoszonej w dzienniku |
| `T` | Jednolity | Tekst jednolity (bez zmian, początkowy) |
| `U` | Ujednolicony | Tekst z wszymi zmianami (bez mocy prawnej) |
| `H` | HTML | Format HTML |
| `I` | Interpretacyjny | Tekst z interpretacją |

Flagi `textPDF` i `textHTML` wskazują dostępne formaty.

---

## Typy Relacji Między Aktami

### 1. Relacje Modyfikacyjne (Zmiana Treści)

#### `Akty zmieniające` (kierunek: czynny)
- **Definicja**: Akty, które modyfikują dany akt
- **Zastosowanie**: Nowelizacje, zmiany, sprostowania
- **Typy zmian**:
  - Zmiana (typowa modyfikacja treści)
  - Sprostowanie błędów (korygowanie błędów redakcyjnych)
  - Zmiana pośrednia (poprzez zmianę innego aktu)
  - Zmiana przeniesiona (zmiana przeniesiona z innego aktu)
  - Uzupełnienie (dodanie nowych regulacji)

#### `Akty zmieniane` (kierunek: bierny)
- **Definicja**: Akt, który jest modyfikowany
- **Zastosowanie**: Akt pierwotny, który uległ zmianom
- **Informacje Dodatkowe**: Data zmiany, nr artykułu (opcjonalnie)

### 2. Relacje Uchyleniowe (Wycofanie z Obrotu)

#### `Akty uchylające` (kierunek: czynny)
- **Definicja**: Akty, które wycofują inny akt z obrotu
- **Typy uchylenia**:
  - Uchylenie wyraźne (bezpośrednie wskazanie)
  - Uchylenie pośrednie (przez wejście w życie nowej regulacji)
  - Uchylenie generalne (zbiorowe)
- **Metadane**: Data uchylenia

#### `Akty uznane za uchylone` (kierunek: bierny)
- **Definicja**: Akt, który został uchylony
- **Skutek**: Akt traci moc obowiązującą
- **Pole `repealDate`**: Data, kiedy akt został uchylony

### 3. Relacje Wykonawcze (Akty Podustawowe)

#### `Akty wykonawcze` (kierunek: czynny)
- **Definicja**: Rozporządzenia, zarządzenia, obwieszczenia wydane na podstawie ustawy
- **Charakterystyka**: 
  - Zwykle rozporządzenia Rady Ministrów lub ministrów
  - Wydawane na upoważnienie zawarte w ustawie
  - Konkretyzują przepisy ustawy
- **Przykłady**: Rozporządzenie Ministra Edukacji, Zarządzenie MZ

#### `Akty wykonywane` (kierunek: bierny)
- **Definicja**: Ustawa, która stanowi podstawę do wydania aktów wykonawczych
- **Charakterystyka**: Zawiera upoważnienia dla organów administracyjnych

### 4. Relacje Wprowadzające

#### `Akty wprowadzające` (kierunek: czynny)
- **Definicja**: Pierwszy akt wdrażający daną regulację
- **Zastosowanie**: Zwykle dla nowych systemów prawnych

#### `Akty wprowadzane` (kierunek: bierny)
- **Definicja**: Akt wprowadzany przez inne akty

### 5. Relacje Interpretacyjne

#### `Akty interpretujące` (kierunek: czynny)
- **Definicja**: Akty wydane w celu interpretacji norm
- **Przykłady**: Uchwały Sejmu, interpretacje organów

#### `Akty interpretowane` (kierunek: bierny)
- **Definicja**: Akt, którego normy są interpretowane

### 6. Relacje Implementacyjne (Prawo UE)

#### `Akty implementujące` (kierunek: czynny)
- **Definicja**: Polskie akty (ustawa, rozporządzenie) implementujące dyrektywę UE
- **Zastosowanie**: Wdrażanie unijnego prawa do porządku krajowego
- **Powiązanie**: Z polem `directives`

#### `Akty implementowane` (kierunek: bierny)
- **Definicja**: Dyrektywy UE implementowane przez polskie akty
- **Polje**: `directives` (lista powiązanych dyrektyw)

Metadane dotyczące dyrektyw:
```
{
  "address": "32013R0952",
  "title": "Rozporządzenie Parlamentu Europejskiego i Rady (UE) nr 952/2013...",
  "date": "2013-10-09"
}
```

### 7. Relacje Zastępcze (Następstwo Prawne)

#### `Akty zastępujące` (kierunek: czynny)
- **Definicja**: Nowy akt będący następcą prawnym
- **Warunki**: Brak wyraźnego uchylenia, ale utrata mocy poprzednika
- **Zastosowanie**: Tylko dla aktów podustawowych
- **Charakterystyka**: Całkowita zmiana regulacji w danym obszarze

#### `Akty zastępowane` (kierunek: bierny)
- **Definicja**: Akt utrácił moc na skutek wejścia nowego aktu
- **Warunki**: Brak wyraźnego uchylenia (pośrednie)

### 8. Relacje Informacyjne

#### `Podstawa prawna` (kierunek: informacyjny)
- **Definicja**: Akty stanowiące upoważnienie do wydania danego aktu
- **Zastosowanie**: Dla aktów wykonawczych
- **Metadane**: Może zawierać nr artykułu (np. "art. 19 ust. 1")

#### `Tekst jednolity dla aktu` (kierunek: informacyjny)
- **Definicja**: Tekst jednolity wydany dla danego aktu
- **Charakterystyka**: 
  - Zawiera wszystkie zmany do daty publikacji
  - Wydawany przez Marszałka Sejmu (dla ustaw) lub ministra (dla rozporządzeń)
  - Tekst ma moc prawną
- **Powiązanie**: Z tekstem ogłoszonym

---

## Kombinacje Kierunków Relacji

### Macierz Wszystkich Kombinacji Relacji

Dla każdego aktu mogą występować kombinacje wszystkich typów relacji. Przykładowa ustawa może:

1. **Być modyfikowana** (ma relacje "Akty zmieniane")
2. **Modyfikować inne akty** (ma relacje "Akty zmieniające")
3. **Być podstawą do aktów wykonawczych** (ma relacje "Akty wykonawcze")
4. **Być wykonawczą dla innego aktu** (mieć "Podstawę prawną")
5. **Implementować dyrektywę UE** (powiązana z "Dyrektywy europejskie")
6. **Być uchylona** (mieć "Akty uchylające")
7. **Uchylać inne akty** (mieć "Akty uchylone")

### Wielowymiarowa Sieć Relacji

```
┌─────────────────┐
│   USTA_2020_1   │ ← Ustawa podstawowa
├─────────────────┤
│  ZMIENIAJĄCE    │ → [USTAWA_2021_5, USTAWA_2022_10]
│  ZMIENIANE      │ ← [USTAWA_2023_2]
│  WYKONAWCZE     │ → [ROZP_MIN_2020_A, ROZP_MIN_2020_B]
│  WYKONYWANE     │ ← (nic)
│  UCHYLAJĄCE     │ → (nic)
│  UCHYLONE       │ ← (nic)
│  IMPLEMENTUJĄCE │ ← (nic)
│  IMPLEMENTOWANE │ → [DIR_UE_2015_1234]
└─────────────────┘
```

---

## Struktura Danych API

### Endpoint: `/acts/{publisher}/{year}/{position}/references`

Zwraca mapę typów relacji do listy referencji:

```json
{
  "Akty zmieniające": [
    {
      "act": {
        "address": "WDU20210000501",
        "ELI": "DU/2021/501",
        "title": "Ustawa z dnia 4 marca 2021 r. o zmianie...",
        "type": "Ustawa",
        "year": 2021,
        "pos": 501,
        "announcementDate": "2021-03-11"
      },
      "art": "art. 5",
      "date": "2021-03-11"
    }
  ],
  "Akty wykonawcze": [
    {
      "act": {
        "address": "WDU20200000439",
        "ELI": "DU/2020/439",
        "title": "Rozporządzenie Ministra Zdrowia z dnia...",
        "type": "Rozporządzenie",
        "year": 2020,
        "pos": 439
      },
      "art": null,
      "date": null
    }
  ],
  "Dyrektywy europejskie": [
    {
      "address": "32015L1535",
      "title": "Dyrektywa Parlamentu Europejskiego i Rady (UE) 2015/1535...",
      "date": "2015-09-09"
    }
  ]
}
```

### Schemat Referencji (ReferenceDetailsInfo)

```
ReferenceDetailsInfo:
  - act: ActInfo (bez pełnych metadanych)
    - address: string
    - ELI: string
    - title: string
    - type: string
    - year: integer
    - pos: integer
    - displayAddress: string
    - announcementDate: date
    - promulgation: date
    - publisher: string
    - textPDF: boolean
    - textHTML: boolean
  - art: string (opcjonalnie, np. "art. 5 ust. 2")
  - date: date (opcjonalnie, dla uchyleń i zmian)
```

### Pełne Dane Aktu (Endpoint: `/acts/{publisher}/{year}/{position}`)

Zwraca kompletny obiekt `Act`:

```json
{
  "address": "WDU20170002196",
  "ELI": "DU/2017/2196",
  "title": "Obwieszczenie Marszałka Sejmu...",
  "type": "Ustawa",
  "displayAddress": "Dz.U. 2017 poz. 2196",
  "year": 2017,
  "pos": 2196,
  "volume": 0,
  "publisher": "DU",
  "status": "obowiązujący",
  "inForce": "IN_FORCE",
  "announcementDate": "2017-11-09",
  "promulgation": "2017-11-10",
  "entryIntoForce": "2017-11-17",
  "validFrom": "2017-11-17",
  "repealDate": null,
  "expirationDate": null,
  "legalStatusDate": "2017-11-10",
  "changeDate": "2023-11-15T10:30:45",
  
  "releasedBy": ["SEJM"],
  "authorizedBody": [],
  "obligated": ["MINISTERSTWO ROLNICTWA"],
  
  "keywords": ["rolnictwo", "ustrój"],
  "keywordsNames": ["Rzecznik Praw Pacjenta"],
  "comments": "",
  
  "textPDF": true,
  "textHTML": false,
  "texts": [
    {
      "fileName": "D20172196.pdf",
      "type": "O"  // Ogłoszony
    }
  ],
  
  "previousTitle": [],
  "prints": [
    {
      "term": 8,
      "number": "1234",
      "link": "https://www.sejm.gov.pl/Sejm8.nsf/PrzebiegProc.xsp?nr=1234",
      "linkPrintAPI": "https://api.sejm.gov.pl/sejm/term8/prints/1234",
      "linkProcessAPI": "https://api.sejm.gov.pl/sejm/term8/processes/1234"
    }
  ],
  
  "directives": [
    {
      "address": "32015L1535",
      "title": "Dyrektywa Parlamentu Europejskiego i Rady (UE) 2015/1535...",
      "date": "2015-09-09"
    }
  ],
  
  "references": {
    "Akty zmieniające": [...],
    "Akty zmieniane": [...],
    "Akty wykonawcze": [...],
    "Podstawa prawna": [...],
    "Dyrektywy europejskie": [...]
  }
}
```

---

## Implementacja Knowledge Grafu

### Architektura Grafu

#### 1. Węzły (Nodes)

```
Node types:
- ACT: Pojedynczy akt prawny
- DIRECTIVE: Dyrektywa europejska
- AUTHORITY: Organ (Sejm, Minister, itp.)
- KEYWORD: Słowo kluczowe
- DATE_EVENT: Zdarzenie czasowe
```

#### 2. Krawędzie (Edges)

Dla każdej krawędzi przechowuj:

```
Edge properties:
- type: String (relationType)
- direction: "active" | "passive" | "bidirectional"
- metadata:
  - article: String (nr artykułu, opcjonalnie)
  - date: Date (data relacji, opcjonalnie)
  - change_date: DateTime (kiedy zmiana została zarejestrowana)
```

#### 3. Rodzaje Krawędzi

```
MODIFICATION:
  - changes (Akty zmieniające)
  - changed_by (Akty zmieniane)

REPEAL:
  - repeals (Akty uchylające)
  - repealed_by (Akty uchylone)

EXECUTION:
  - implements (Akty wykonawcze)
  - implemented_by (Akty wykonywane)

IMPLEMENTATION_EU:
  - implements_directive (Akty implementujące)
  - implemented_by_act (Dyrektywy implementowane)

LEGAL_BASIS:
  - based_on (Podstawa prawna)

UNIFIED_TEXT:
  - has_unified_text (Tekst jednolity)
  - is_unified_text_for

INTERPRETATION:
  - interprets (Akty interpretujące)
  - interpreted_by (Akty interpretowane)

REPLACEMENT:
  - replaces (Akty zastępujące)
  - replaced_by (Akty zastępowane)

INTRODUCTION:
  - introduces (Akty wprowadzające)
  - introduced_by (Akty wprowadzane)
```

### Format Przechowywania

#### Option 1: Neo4j (Graf Bazy Danych)

```cypher
(Act:ACT {
  eli: "DU/2020/1",
  address: "WDU20200000001",
  title: "Ustawa o...",
  type: "Ustawa",
  status: "IN_FORCE",
  announcementDate: date("2020-01-15"),
  entryIntoForce: date("2020-02-01"),
  keywords: ["prawo", "administracja"]
})

(Act)-[:CHANGES_ARTICLES {article: "art. 5", date: "2021-03-11"}]->(Act2)
(Act)-[:IMPLEMENTS {directiveAddress: "32015L1535"}]->(Directive:DIRECTIVE)
(Act)-[:ISSUED_BY {date: "2020-01-15"}]->(Authority:AUTHORITY)
```

#### Option 2: RDF/Turtle (Semantyczne Web)

```turtle
@prefix eli: <http://eli.gov.pl/resource/> .
@prefix isap: <http://isap.sejm.gov.pl/> .
@prefix dcterms: <http://purl.org/dc/terms/> .

isap:DU/2020/1 a eli:LegalResource ;
  dcterms:title "Ustawa o..." ;
  eli:status "IN_FORCE" ;
  eli:date_publication "2020-01-15"^^xsd:date ;
  eli:changes_article isap:DU/2021/10 ;
  eli:implements eli:Directive/2015/1535 ;
  eli:passed_by isap:Sejm .
```

#### Option 3: JSON-LD (JSON + Linked Data)

```json
{
  "@context": {
    "eli": "http://eli.gov.pl/resource/",
    "isap": "http://isap.sejm.gov.pl/",
    "title": "http://purl.org/dc/terms/title"
  },
  "@id": "isap:DU/2020/1",
  "@type": "eli:LegalResource",
  "title": "Ustawa o...",
  "eli:changes": {
    "@id": "isap:DU/2021/10",
    "eli:article": "art. 5"
  },
  "eli:implements": {
    "@id": "eli:Directive/2015/1535"
  }
}
```

#### Option 4: Vector Database + Embedding (Dla AI/LLM)

```python
{
  "akt_eli": "DU/2020/1",
  "title": "Ustawa o...",
  "text_embedding": [0.123, 0.456, ...],  # 768/1536-wymiarowy wektor
  "metadata": {
    "type": "Ustawa",
    "status": "IN_FORCE",
    "keywords": ["prawo", "administracja"]
  },
  "relations": {
    "changes": ["DU/2021/10"],
    "implements": ["32015L1535"],
    "has_executing_acts": ["DU/2020/150"]
  }
}
```

---

## Praktyczne Przykłady

### Przykład 1: Ustawa Modyfikowana Wielokrotnie

**Ustawa z dnia 29 maja 1992 r. o ochronie konkurencji i konsumentów** (Dz.U. 1992 nr 21 poz. 93)

**Powiązania:**

```
ZMIENIANA PRZEZ:
  - Ustawa z dnia 2 lipca 2004 r. (Dz.U. 2004 nr 172 poz. 1807)
  - Ustawa z dnia 16 lipca 2004 r. (Dz.U. 2004 nr 173 poz. 1808)
  - Ustawa z dnia 20 lipca 2004 r. (Dz.U. 2004 nr 176 poz. 1848)
  - ... (dalszych 50+ zmian)

ZMIENIA INNE AKTY:
  - Ustawę z dnia 23 kwietnia 1964 r. - Kodeks Cywilny

AKTY WYKONAWCZE:
  - Rozporządzenie Ministra Gospodarki z dnia 12 kwietnia 2001 r.
  - Zarządzenia Prezesa UOKiK

DYREKTYWY EUROPEJSKIE:
  - Dyrektywa (EU) 2015/2366 (PSD2)
  - Dyrektywa Rady (UE) 2008/1
```

### Przykład 2: Wdrażanie Dyrektywy UE

**Dyrektywa Parlamentu Europejskiego i Rady (UE) 2018/844** (zmiana dyrektywy 2010/31/UE)

**Implementowanie w Polsce:**

```
IMPLEMENTOWANA PRZEZ:
  - Ustawa z dnia 1 marca 2019 r. o zmianie ustawy o ochronie konkurencji...
  - Rozporządzenie Ministra Energii z dnia 20 marca 2015 r.

INNE POLSKIE AKTY BAZUJĄCE NA TEJ DYREKTYWIE:
  - Ustawa o efektywności energetycznej
  - Kodeks pracy (art. regulujące bezpieczeństwo)
```

### Przykład 3: Łańcuch Uchyleń

**Ustawa z dnia 1 marca 1999 r. o podatku handlowym** → UCHYLONA

```
UCHYLANA PRZEZ:
  - Ustawę z dnia 15 lipca 1999 r.
    (artykuł X: ustawa z 1999 r. traci moc)

ORAZ POŚREDNIO:
  - Przez nową Ustawę o podatku od towarów i usług (2004)
    (która introdukowała alternatywny system podatkowy)

TEKSTY JEDNOLITE:
  - Tekst jednolity z dnia 15 lipca 1999 r. (ostatni)
    - zawierał wszystkie zmiany do momentu uchylenia
```

### Przykład 4: Relacje Wielokierunkowe

**Rozporządzenie Ministra Zdrowia z dnia 12 maja 2015 r.**

```
RELACJA: Ustawa podstawowa (Podstawa prawna)
  ← Ustawa o ochronie zdrowia (art. 38 ust. 2)

RELACJA: Zmieniane
  ← Rozporządzenie Ministra Zdrowia z dnia 3 marca 2016 r.
  ← Rozporządzenie Ministra Zdrowia z dnia 15 lipca 2017 r.

RELACJA: Wykonawcze
  ← Ustawa o ochronie zdrowia (stanowi podstawę)

RELACJA: Implementujące
  → Dyrektywa (UE) 2014/95/EU (wymagania ujawniania)

RELACJA: Akty wprowadzające
  ← Zarządzenie Ministra Zdrowia z dnia 12 maja 2015 r.
    (wprowadza w życie rozporządzenie)

TEKST JEDNOLITY:
  - Tekst jednolity z dnia 1 marca 2020 r.
    (zawiera wszystkie 7 zmian)
```

---

## Rekomendacje dla Indeksowania do LLM

### 1. Hierarchia Ważności Metadanych

```
KRYTYCZNE (Zawsze indeksuj):
  - ELI, address, title, type
  - status, inForce, entryIntoForce
  - releasedBy, announcementDate

WYSOKIE (Zawsze jeśli dostępne):
  - Wszystkie relacje (references)
  - keywords, keywords_names
  - Daty: promulgation, repealDate

ŚREDNIE (Według potrzeby):
  - texts (typy dostępnych tekstów)
  - previousTitle
  - authorizedBody, obligated

OPCJONALNE:
  - comments
  - prints (powiązania sejmowe)
```

### 2. Struktura Dla Wektorizacji (Embeddings)

```python
{
  "id": "DU/2020/1",
  "content": {
    "title": "Ustawa o...",
    "full_text": "... pełna treść dla embedding...",
    "keywords": "prawo administracja bezpieczeństwo",
    "relations_summary": "zmienia [DU/2019/5], wykonawcze: [DU/2020/150, DU/2020/151]"
  },
  "metadata": {
    "type": "Ustawa",
    "status": "IN_FORCE",
    "year": 2020
  },
  "graph_structure": {
    "outgoing_edges": {
      "changes": ["DU/2019/5"],
      "implements": ["32015L1535"],
      "has_executing_acts": ["DU/2020/150"]
    },
    "incoming_edges": {
      "changed_by": ["DU/2021/10"],
      "basis_for": ["DU/2020/150", "DU/2020/151"]
    }
  }
}
```

### 3. Query Patterns Dla LLM

```
Query 1: Wyszukaj wszystkie zmiany ustawy X
  → Pobierz references["Akty zmieniające"]

Query 2: Czy ustawa Y jest obowiązująca?
  → Sprawdź pole status i inForce

Query 3: Jakie akty wykonawcze zostały wydane na podstawie ustawy Z?
  → Pobierz references["Akty wykonawcze"]

Query 4: Która dyrektywa europejska była podstawą do aktu A?
  → Sprawdź directives

Query 5: Jakie akty ogółem zmieniają regulację dotyczącą X?
  → Wyszukaj po keywords = "X"
  → Dla każdego wynik, pobierz zarówno:
     - "Akty zmieniające"
     - "Akty zmieniane"
```

---

## Zasoby i Linki

### Dokumentacja API
- Dokumentacja OpenAPI: https://api.sejm.gov.pl/eli/openapi/
- ELI Ontologia: http://eli.gov.pl/resource/ontology/elipl#
- Sejm API: https://api.sejm.gov.pl/

### Portale
- ISAP: https://isap.sejm.gov.pl/
- ELI: https://eli.gov.pl/
- Publiczny Portal Informacji o Prawie: https://ppiop.rcl.gov.pl/

### Standardy
- ELI Best Practices: https://op.europa.eu/en/publication-detail/-/publication/d99a4fcb-4cd1-11e9-a8ed-01aa75ed71a1
- RDF/Turtle: https://www.w3.org/TeamSubmission/turtle/
- JSON-LD: https://www.w3.org/TR/json-ld/

---

## Podsumowanie

System ISAP/ELI dostarcza kompleksowej struktury do mapowania powiązań między aktami prawnymi poprzez:

1. **16 typów relacji** dwukierunkowych (czynne/bierne)
2. **28 pól metadanych** opisujących każdy akt
3. **OpenAPI interface** do programowego dostępu
4. **RDF/Linked Data** dla semantycznego przetwarzania
5. **Powiązania z dyrektywami UE** dla międzynarodowej interoperacyjności

To czyni ISAP idealnym źródłem do budowy knowledge grafu i indeksowania do lokalnych LLM lub publicznych modeli dla:
- Analizy prawnej
- Weryikacji aktów
- Śledzenia zmian legislacyjnych
- Badań nad systemem prawnym
- Automatyzacji procesów prawnych
