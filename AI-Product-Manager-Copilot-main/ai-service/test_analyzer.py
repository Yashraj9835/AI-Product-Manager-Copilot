from app.analysis.analyzer import FeedbackAnalyzer


def main():
    analyzer = FeedbackAnalyzer()

    question = "Analyze customer feedback and identify major issues."

    result = analyzer.analyze(question)

    print("\n===== AI Analysis Result =====\n")

    print(result.model_dump_json(indent=4))


if __name__ == "__main__":
    main()