from app.ingestion.loader import DataLoader
from app.ingestion.cleaner import DataCleaner
from app.ingestion.chunker import Chunker

loader = DataLoader()
cleaner = DataCleaner()
chunker = Chunker()

data = loader.load_all()

reviews = cleaner.clean_reviews(data["reviews"])

chunks = chunker.chunk_documents(reviews)

print(f"Total Chunks: {len(chunks)}")

print()

print(chunks[0].page_content)

print()

print(chunks[0].metadata)