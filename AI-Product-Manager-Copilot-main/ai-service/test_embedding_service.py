from app.ingestion.loader import DataLoader
from app.ingestion.cleaner import DataCleaner
from app.ingestion.chunker import Chunker
from app.embeddings.embedding_service import EmbeddingService

loader = DataLoader()
cleaner = DataCleaner()
chunker = Chunker()
embedding_service = EmbeddingService()

data = loader.load_all()

reviews = cleaner.clean_reviews(data["reviews"])

chunks = chunker.chunk_documents(reviews)

embedded_docs = embedding_service.embed_documents(chunks)

print(f"Embedded Documents: {len(embedded_docs)}")

print()

print("Keys:")

print(embedded_docs[0].keys())

print()

print("Metadata:")

print(embedded_docs[0]["metadata"])

print()

print("Embedding Dimension:")

print(len(embedded_docs[0]["embedding"]))