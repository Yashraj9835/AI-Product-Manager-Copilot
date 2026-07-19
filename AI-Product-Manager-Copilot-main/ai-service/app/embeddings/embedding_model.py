import os
os.environ["HF_HUB_OFFLINE"] = "1"

from sentence_transformers import SentenceTransformer
from typing import List


class EmbeddingModel:
    """
    Generates embeddings using a Hugging Face model.
    """

    def __init__(self):
        print("Loading embedding model...")

        self.model = SentenceTransformer(
            "BAAI/bge-base-en-v1.5",
            local_files_only=True
        )

        print("Embedding model loaded.")

    def encode(self, texts: List[str]):

        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=True,
            normalize_embeddings=True
        )

        return embeddings