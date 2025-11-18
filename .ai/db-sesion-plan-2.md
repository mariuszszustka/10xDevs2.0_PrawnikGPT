<conversation_summary>

<decisions>
1. Utworzyć tabelę `user_profiles` (PK `supabase_user_id`) rozszerzoną o `is_onboarded`, `onboarding_completed_at`, `consent_version`, `ui_locale`.
2. Dodać do `queries` kolumny `question_text` (`TEXT`), `language_code`, `token_count`, `query_hash` (unikalny z opcjonalnym partycjonowaniem po `user_id`).
3. W `responses` przechowywać `response_type` (enum), `model_id`, `prompt_template_id`, flagę `is_context_found`, JSONB `generation_params` i `token_usage`.
4. Wprowadzić tabelę `prompt_templates` oraz referencję `responses.model_id` do tabeli modeli, aby wersjonować konfiguracje LLM.
5. Dodać `response_sources` (`response_id`, `legal_act_id`, `chunk_id`, `reference_label`, `source_url`, `position`) dla śledzenia kontekstu.
6. Wprowadzić tabelę `response_errors` z `error_type`, `error_code` oraz funkcję `delete_user_cascade` logującą w `deletion_audits`.
7. Zastosować indeksy B-Tree na `legal_act_chunks` (`legal_act_id`, `article_number`, `paragraph_number`) oraz pgvector z odpowiednimi parametrami.
8. Traktować `legal_act_relations` jako relacje kierunkowe z enumeracją typów i kluczami obcymi ON DELETE CASCADE.
9. Rozszerzyć `legal_acts` o `valid_from`, `valid_to`, `source_url`, `content_hash`, `ingested_at` oraz ewentualną tabelę `legal_act_versions`.
10. Skonfigurować RLS: tabele użytkownika (`queries`, `responses`, `ratings`) tylko dla właściciela (`supabase.auth.uid()`), dane referencyjne (akty, modele) dostępne read-only i utrzymywane w oddzielnych schematach.

</decisions>

<matched_recommendations>
1. Utrzymanie minimalnego profilu użytkownika lokalnie dla RLS: decyzje 1 i 2 rozwijają tę koncepcję.
2. Jedna tabela `responses` z typem odpowiedzi i metadanymi modeli: decyzje 3 i 4 rozszerzają rekomendację.
3. Snapshot kontekstu i źródeł odpowiedzi: decyzja 5 odpowiada rekomendacji o `response_sources`.
4. Rejestrowanie błędów i audytów usunięć: decyzja 6 realizuje wcześniejsze zalecenia dot. `response_errors` i `deletion_audits`.
5. Indeksy pgvector + klasyczne na chunkach prawnych: decyzja 7 bezpośrednio odpowiada zaleceniom wydajnościowym.
6. Kierunkowe relacje między aktami z enum: decyzja 8 implementuje wcześniejsze sugestie dot. integralności.
7. Śledzenie wersji aktów i metadanych ingestii: decyzja 9 rozwija rekomendację nt. `legal_act_versions`.
8. RLS rozdzielający dane użytkownika i referencyjne: decyzja 10 wzmacnia wcześniejsze zalecenia bezpieczeństwa.

</matched_recommendations>

<database_planning_summary>
Schemat ma wspierać pełny przepływ użytkownika (logowanie, czat, historia, oceny) na Supabase/PostgreSQL z pgvector. Kluczowe encje to `user_profiles`, `queries`, `responses`, `ratings`, `response_sources`, `legal_acts`, `legal_act_chunks`, `legal_act_relations`, `prompt_templates`, `models`, `response_errors`, `deletion_audits`, `legal_act_versions`. Relacje: `user_profiles` 1:N `queries`; `queries` 1:N `responses`; `responses` 1:N `ratings` i `response_sources`; `legal_acts` 1:N `legal_act_chunks`; `legal_act_relations` wiążą akty kierunkowo; `responses` → `models` i `prompt_templates`. Bezpieczeństwo: RLS ogranicza tabele użytkowników do właściciela, dane referencyjne są tylko do odczytu z osobnego schematu, dostęp administracyjny steruje funkcją `delete_user_cascade`. Skalowalność i wydajność: pgvector na `legal_act_chunks` plus indeksy B-Tree, unikalny `query_hash` dla cache, JSONB statystyki tokenów, opcja częściowych indeksów w `ratings`, strukturalne źródła odpowiedzi dla audytu. Dodatkowe wymagania: logowanie błędów, audyty usunięć, wersjonowanie aktów i promptów, przechowywanie metadanych ingestii, przygotowanie do przyszłego partycjonowania po `created_at` lub `act_year`.

</database_planning_summary>

<unresolved_issues>
1. Nie ustalono ostatecznie struktury tabeli kontekstu (np. `query_contexts` vs. `response_sources` + JSONB snapshot).
2. Brak decyzji o docelowym mechanizmie partycjonowania (kiedy i które tabele będą partycjonowane).
3. Nie doprecyzowano limitów długości `question_text` ani polityki przechowywania historii w czasie (retencja danych).

</unresolved_issues>

</conversation_summary>
