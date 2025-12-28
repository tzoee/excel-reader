"""
Contoh penggunaan Excel Reader System
"""
from excel_reader import ExcelReader, DataProcessor


def main():
    # === 1. MEMBACA FILE ===
    # Ganti dengan path file Excel kamu
    reader = ExcelReader('data/sample.xlsx')
    
    # Lihat info file
    print("Info File:")
    print(reader.get_info())
    
    # Baca sheet pertama
    df = reader.read()
    print(f"\nData ({len(df)} baris):")
    print(df.head())
    
    # Baca sheet tertentu
    # df = reader.read(sheet_name='Sheet2')
    
    # Baca semua sheet
    # all_sheets = reader.read_all_sheets()
    
    
    # === 2. MEMPROSES DATA ===
    processor = DataProcessor(df)
    
    # Lihat ringkasan
    print("\nRingkasan Data:")
    print(processor.get_summary())
    
    # Contoh chaining operations
    # processor.drop_nulls() \
    #          .select_columns(['nama', 'nilai']) \
    #          .filter_rows('nilai', lambda x: x > 70)
    
    # Dapatkan hasil
    result = processor.get_dataframe()
    print("\nHasil Proses:")
    print(result.head())
    
    # Export hasil
    # processor.to_csv('output/hasil.csv')
    # processor.to_excel('output/hasil.xlsx')
    
    # Convert ke dictionary (untuk API/database)
    # data_dict = processor.to_dict()


if __name__ == '__main__':
    main()
