class PromptBuilder:

    @staticmethod
    def build(question: str, documents):

        context = "\n\n".join(
            [doc["text"] for doc in documents]
        )

        prompt = f"""
        You are an experienced AI Product Manager.

        Use ONLY the provided context.

        Context:
        {context}

        User Question:
        {question}

        Respond using this format:

        ## Summary

        ## Key Customer Pain Points

        ## Evidence from Reviews

        ## Recommended Product Improvements

        ## Priority
        (High / Medium / Low)

        If the context is insufficient, clearly say so.
        """
        return prompt