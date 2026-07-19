from app.ingestion.loader import DataLoader
from app.ingestion.cleaner import DataCleaner

loader = DataLoader()
cleaner = DataCleaner()

data = loader.load_all()

reviews = cleaner.clean_reviews(data["reviews"])

print(f"Total review documents: {len(reviews)}")

print("\nFirst cleaned document:\n")

print(reviews[0]["text"])

print("\nMetadata:\n")

print(reviews[0]["metadata"])