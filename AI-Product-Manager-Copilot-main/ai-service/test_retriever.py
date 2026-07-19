from app.rag.retriever import Retriever

retriever = Retriever()

results = retriever.search(
    "customers are complaining about cold food"
)

print(f"Retrieved {len(results)} documents\n")

for i, doc in enumerate(results, start=1):
    print("=" * 60)
    print(f"Result {i}")
    print(f"Score : {doc['score']:.4f}")
    print(f"Text  :\n{doc['text']}")
    print(f"Metadata : {doc['metadata']}")
    print()

retriever.vector_store.close()