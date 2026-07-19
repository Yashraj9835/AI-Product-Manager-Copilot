from app.ingestion.loader import DataLoader
from app.ingestion.cleaner import DataCleaner
from app.ingestion.chunker import Chunker
from app.embeddings.embedding_service import EmbeddingService
from app.vectordb.qdrant_client import VectorStore

loader = DataLoader()
cleaner = DataCleaner()
chunker = Chunker()
embedding_service = EmbeddingService()
vector_store = VectorStore()

data = loader.load_all()

reviews = cleaner.clean_reviews(data["reviews"])

chunks = chunker.chunk_documents(reviews)

embedded_docs = embedding_service.embed_documents(chunks)

vector_store.insert_documents(embedded_docs)

vector_store.insert_documents(embedded_docs)
vector_store.close()