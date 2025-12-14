#!/usr/bin/env python3
"""
Script: Generate Test Embeddings for Legal Act Chunks
Purpose: Generate embeddings for test data chunks and insert into database
Usage: python scripts/generate-test-embeddings.py
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.db.supabase_client import get_supabase
from backend.services.ollama_service import OllamaService
from backend.config import settings

# Test chunks data - przykładowe fragmenty aktów prawnych
TEST_CHUNKS = [
    {
        "act_title": "Kodeks cywilny",
        "chunks": [
            {
                "content": "Art. 1. Kodeks niniejszy reguluje stosunki cywilnoprawne między osobami fizycznymi i osobami prawnymi. Prawo cywilne określa prawa i obowiązki podmiotów prawa cywilnego.",
                "metadata": {"type": "article", "number": "1", "section": "Część ogólna"}
            },
            {
                "content": "Art. 353. § 1. Dłużnik obowiązany jest do spełnienia świadczenia, a wierzyciel może żądać spełnienia świadczenia od chwili, gdy stało się ono wymagalne. § 2. Świadczenie powinno być spełnione w miejscu i czasie określonym w umowie lub wynikającym z przepisów prawa.",
                "metadata": {"type": "article", "number": "353", "section": "Część szczegółowa"}
            },
            {
                "content": "Art. 384. § 1. Umowa sprzedaży zobowiązuje sprzedawcę do przeniesienia na kupującego własności rzeczy i wydania mu rzeczy, a kupującego do odebrania rzeczy i zapłacenia ceny. § 2. Sprzedawca jest obowiązany wydać rzecz w stanie wolnym od wad fizycznych i prawnych.",
                "metadata": {"type": "article", "number": "384", "section": "Sprzedaż"}
            },
            {
                "content": "Art. 556. § 1. Sprzedawca jest odpowiedzialny względem kupującego, jeżeli rzecz sprzedana ma wadę fizyczną lub prawną. § 2. Wada fizyczna istnieje, jeżeli rzecz nie ma właściwości, które rzecz tego rodzaju powinna mieć ze względu na cel w umowie oznaczony albo wynikający z okoliczności lub przeznaczenia.",
                "metadata": {"type": "article", "number": "556", "section": "Gwarancja"}
            },
        ]
    },
    {
        "act_title": "Ustawa o prawach konsumenta",
        "chunks": [
            {
                "content": "Art. 2. 1. Konsumentem jest osoba fizyczna dokonująca z przedsiębiorcą czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową. 2. Przedsiębiorcą jest osoba fizyczna, osoba prawna oraz jednostka organizacyjna niebędąca osobą prawną, która wykonuje działalność gospodarczą.",
                "metadata": {"type": "article", "number": "2", "section": "Definicje"}
            },
            {
                "content": "Art. 5. 1. Konsument ma prawo do informacji o towarach i usługach. 2. Informacje powinny być przekazane w sposób zrozumiały, w języku polskim, przed zawarciem umowy. 3. Przedsiębiorca jest obowiązany poinformować konsumenta o istotnych cechach towaru lub usługi.",
                "metadata": {"type": "article", "number": "5", "section": "Prawa konsumenta"}
            },
            {
                "content": "Art. 38. 1. Konsument może odstąpić od umowy zawartej poza lokalem przedsiębiorstwa lub na odległość w terminie 14 dni bez podania przyczyny. 2. Termin do odstąpienia od umowy liczy się od dnia objęcia w posiadanie rzeczy lub zawarcia umowy o świadczenie usługi.",
                "metadata": {"type": "article", "number": "38", "section": "Prawo odstąpienia"}
            },
            {
                "content": "Art. 55. 1. Przedsiębiorca nie może stosować klauzul abuzywnych w umowach z konsumentami. 2. Klauzula abuzywna to postanowienie umowy, które nie zostało indywidualnie uzgodnione z konsumentem i kształtuje jego prawa i obowiązki w sposób sprzeczny z dobrymi obyczajami.",
                "metadata": {"type": "article", "number": "55", "section": "Klauzule abuzywne"}
            },
        ]
    },
    {
        "act_title": "Kodeks pracy",
        "chunks": [
            {
                "content": "Art. 22. § 1. Przez nawiązanie stosunku pracy pracownik zobowiązuje się do wykonywania pracy określonego rodzaju na rzecz pracodawcy i pod jego kierownictwem oraz w miejscu i czasie wyznaczonym przez pracodawcę, a pracodawca - do zatrudnienia pracownika za wynagrodzeniem.",
                "metadata": {"type": "article", "number": "22", "section": "Stosunek pracy"}
            },
            {
                "content": "Art. 29. § 1. Umowa o pracę powinna określać strony umowy, rodzaj umowy, datę jej zawarcia oraz warunki pracy i płacy, w szczególności: rodzaj pracy, miejsce wykonywania pracy, wynagrodzenie za pracę odpowiadające rodzajowi pracy oraz wymiar czasu pracy.",
                "metadata": {"type": "article", "number": "29", "section": "Treść umowy"}
            },
            {
                "content": "Art. 151. § 1. Czas pracy nie może przekraczać 8 godzin na dobę i przeciętnie 40 godzin w przeciętnie pięciodniowym tygodniu pracy w przyjętym okresie rozliczeniowym nieprzekraczającym 4 miesięcy. § 2. Do czasu pracy wlicza się czas, w którym pracownik pozostaje w dyspozycji pracodawcy w zakładzie pracy lub w innym miejscu wyznaczonym do wykonywania pracy.",
                "metadata": {"type": "article", "number": "151", "section": "Czas pracy"}
            },
        ]
    },
    {
        "act_title": "Ustawa o ochronie danych osobowych",
        "chunks": [
            {
                "content": "Art. 5. 1. Przetwarzanie danych osobowych jest dopuszczalne tylko w przypadkach określonych w ustawie. 2. Administrator danych osobowych jest obowiązany zapewnić bezpieczeństwo przetwarzanych danych osobowych. 3. Dane osobowe powinny być przetwarzane zgodnie z zasadą minimalizacji danych.",
                "metadata": {"type": "article", "number": "5", "section": "Zasady przetwarzania"}
            },
            {
                "content": "Art. 13. 1. Administrator danych osobowych jest obowiązany poinformować osobę, której dane dotyczą, o przetwarzaniu jej danych osobowych. 2. Informacja powinna zawierać: cel przetwarzania, podstawę prawną, okres przechowywania danych oraz prawa osoby, której dane dotyczą.",
                "metadata": {"type": "article", "number": "13", "section": "Obowiązek informacyjny"}
            },
        ]
    },
    {
        "act_title": "Kodeks postępowania cywilnego",
        "chunks": [
            {
                "content": "Art. 187. § 1. Pozew powinien zawierać: oznaczenie stron, przedmiot sporu, okoliczności faktyczne i prawne uzasadniające żądanie oraz dowody na ich poparcie. § 2. Pozew należy złożyć na piśmie lub w formie elektronicznej.",
                "metadata": {"type": "article", "number": "187", "section": "Treść pozwu"}
            },
            {
                "content": "Art. 318. § 1. Sąd rozpoznaje sprawę na rozprawie. § 2. Rozprawa jest jawna, chyba że ustawa stanowi inaczej. § 3. Sąd może wyłączyć jawność rozprawy ze względu na ochronę życia prywatnego lub innych ważnych interesów.",
                "metadata": {"type": "article", "number": "318", "section": "Rozprawa"}
            },
        ]
    },
]


async def generate_embeddings_for_chunks():
    """Generate embeddings for all test chunks and insert into database"""
    
    print("🚀 Generowanie embeddings dla danych testowych...")
    print("")
    
    # Initialize services
    supabase = get_supabase()
    ollama_service = OllamaService()
    
    # Get all legal acts from database
    acts_result = supabase.table("legal_acts").select("id, title").execute()
    acts = {act["title"]: act["id"] for act in acts_result.data}
    
    print(f"📊 Znaleziono {len(acts)} aktów prawnych w bazie danych")
    print("")
    
    total_chunks = 0
    successful = 0
    failed = 0
    
    # Process each act
    for act_data in TEST_CHUNKS:
        act_title = act_data["act_title"]
        
        if act_title not in acts:
            print(f"⚠️  Pomijam: {act_title} (nie znaleziono w bazie)")
            continue
        
        act_id = acts[act_title]
        print(f"📜 Przetwarzam: {act_title}")
        
        # Get existing chunks count for this act
        existing_chunks = supabase.table("legal_act_chunks").select("chunk_index", count="exact").eq("legal_act_id", act_id).execute()
        next_chunk_index = existing_chunks.count if existing_chunks.count else 0
        
        # Process chunks
        chunks_to_insert = []
        
        for chunk_data in act_data["chunks"]:
            content = chunk_data["content"]
            metadata = chunk_data.get("metadata", {})
            
            try:
                # Generate embedding
                print(f"   🔄 Generuję embedding dla: {metadata.get('number', 'chunk')}...")
                embedding = await ollama_service.generate_embedding(
                    text=content,
                    model=settings.ollama_embedding_model
                )
                
                # Pad embedding to 1024 dimensions if needed (nomic-embed-text is 768)
                if len(embedding) == 768:
                    embedding = list(embedding) + [0.0] * 256  # Pad to 1024
                elif len(embedding) != 1024:
                    # If not 768 or 1024, pad or truncate
                    if len(embedding) < 1024:
                        embedding = list(embedding) + [0.0] * (1024 - len(embedding))
                    else:
                        embedding = list(embedding[:1024])
                
                chunks_to_insert.append({
                    "legal_act_id": act_id,
                    "chunk_index": next_chunk_index,
                    "content": content,
                    "embedding": embedding,
                    "embedding_model_name": settings.ollama_embedding_model,
                    "metadata": metadata
                })
                
                next_chunk_index += 1
                total_chunks += 1
                successful += 1
                print(f"   ✅ Dodano chunk {next_chunk_index - 1}")
                
            except Exception as e:
                print(f"   ❌ Błąd: {e}")
                failed += 1
                continue
        
        # Insert chunks in batch
        if chunks_to_insert:
            try:
                supabase.table("legal_act_chunks").insert(chunks_to_insert).execute()
                print(f"   ✅ Wstawiono {len(chunks_to_insert)} chunks do bazy danych")
            except Exception as e:
                print(f"   ❌ Błąd wstawiania: {e}")
                failed += len(chunks_to_insert)
        
        print("")
    
    # Summary
    print("=" * 60)
    print("📊 PODSUMOWANIE")
    print("=" * 60)
    print(f"✅ Pomyślnie: {successful}")
    if failed > 0:
        print(f"❌ Niepowodzenia: {failed}")
    print(f"📦 Łącznie chunks: {total_chunks}")
    print("")
    
    # Verify
    chunks_result = supabase.table("legal_act_chunks").select("id", count="exact").execute()
    print(f"📊 Łączna liczba chunks w bazie: {chunks_result.count}")
    print("")
    print("✅ Gotowe!")


if __name__ == "__main__":
    try:
        asyncio.run(generate_embeddings_for_chunks())
    except KeyboardInterrupt:
        print("\n\n⚠️  Przerwano przez użytkownika")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Błąd: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
