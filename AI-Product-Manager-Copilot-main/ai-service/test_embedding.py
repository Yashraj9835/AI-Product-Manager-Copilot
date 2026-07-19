from app.embeddings.embedding_model import EmbeddingModel

model = EmbeddingModel()

texts = [
    "Pizza was cold",
    "Delivery was delayed",
    "Great customer service"
]

vectors = model.encode(texts)

print("Total vectors:", len(vectors))

print()

print("Embedding Dimension:", len(vectors[0]))

print()

print(vectors[0][:10])