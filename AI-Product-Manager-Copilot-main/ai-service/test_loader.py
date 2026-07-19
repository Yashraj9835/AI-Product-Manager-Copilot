from app.ingestion.loader import DataLoader

loader = DataLoader()

datasets = loader.load_all()

for name, df in datasets.items():
    print(f"\n{name}")
    print(df.head())