import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from app.ingestion.chunker import Chunker
from app.embeddings.embedding_service import EmbeddingService
from app.vectordb.qdrant_client import VectorStore


CSV_PATH = Path("dataset/processed/cleaned_feedback.csv")


def main():
    print("Loading final restaurant dataset...")

    df = pd.read_csv(CSV_PATH)

    print(f"Loaded {len(df)} records.")

    # Keep only usable feedback
    df = df.dropna(subset=["feedback_text"])
    df["feedback_text"] = df["feedback_text"].astype(str).str.strip()
    df = df[df["feedback_text"] != ""]

    documents = []

    for _, row in df.iterrows():
        documents.append({
            "text": row["feedback_text"],
            "metadata": {
                "feedback_id": str(row.get("feedback_id", "")),
                "restaurant_name": str(row.get("restaurant_name", "")),
                "rating": str(row.get("rating", "")),
                "city": str(row.get("city", "")),
                "source": str(row.get("source", "")),
                "created_date": str(row.get("created_date", "")),
                "category": str(row.get("issue_category", "")),
            }
        })

    print(f"Prepared {len(documents)} feedback documents.")

    # Chunk
    chunker = Chunker(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = chunker.chunk_documents(documents)

    print(f"Created {len(chunks)} chunks.")

    # Embeddings
    embedding_service = EmbeddingService()

    embedded_documents = embedding_service.embed_documents(chunks)

    print(f"Generated {len(embedded_documents)} embeddings.")

    # Qdrant
    vector_store = VectorStore(
        collection_name="restaurant_knowledge_base",
        vector_size=768
    )

    vector_store.insert_documents(embedded_documents)

    print("\n✅ DATA INGESTION COMPLETE")
    print(f"Inserted {len(embedded_documents)} vectors.")

    vector_store.close()


if __name__ == "__main__":
    main()