"""
Data Processor Module
Untuk memproses data dari Excel/Spreadsheet
"""
import pandas as pd
from typing import List, Dict, Any, Optional, Callable


class DataProcessor:
    """Class untuk memproses DataFrame hasil pembacaan Excel"""
    
    def __init__(self, dataframe: pd.DataFrame):
        self.df = dataframe.copy()
        self.original_df = dataframe.copy()
    
    def get_summary(self) -> Dict[str, Any]:
        """Dapatkan ringkasan data"""
        return {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'columns': list(self.df.columns),
            'dtypes': self.df.dtypes.to_dict(),
            'null_counts': self.df.isnull().sum().to_dict(),
            'memory_usage': self.df.memory_usage(deep=True).sum()
        }
    
    def filter_rows(self, column: str, condition: Callable) -> 'DataProcessor':
        """Filter baris berdasarkan kondisi"""
        self.df = self.df[self.df[column].apply(condition)]
        return self
    
    def select_columns(self, columns: List[str]) -> 'DataProcessor':
        """Pilih kolom tertentu"""
        self.df = self.df[columns]
        return self
    
    def rename_columns(self, mapping: Dict[str, str]) -> 'DataProcessor':
        """Rename kolom"""
        self.df = self.df.rename(columns=mapping)
        return self
    
    def drop_nulls(self, columns: Optional[List[str]] = None) -> 'DataProcessor':
        """Hapus baris dengan nilai null"""
        if columns:
            self.df = self.df.dropna(subset=columns)
        else:
            self.df = self.df.dropna()
        return self
    
    def fill_nulls(self, value: Any, columns: Optional[List[str]] = None) -> 'DataProcessor':
        """Isi nilai null"""
        if columns:
            self.df[columns] = self.df[columns].fillna(value)
        else:
            self.df = self.df.fillna(value)
        return self
    
    def add_column(self, name: str, values: Any) -> 'DataProcessor':
        """Tambah kolom baru"""
        self.df[name] = values
        return self
    
    def to_dict(self, orient: str = 'records') -> List[Dict]:
        """Convert ke dictionary"""
        return self.df.to_dict(orient=orient)
    
    def to_csv(self, path: str, index: bool = False) -> None:
        """Export ke CSV"""
        self.df.to_csv(path, index=index)
    
    def to_excel(self, path: str, sheet_name: str = 'Sheet1', index: bool = False) -> None:
        """Export ke Excel"""
        self.df.to_excel(path, sheet_name=sheet_name, index=index)
    
    def reset(self) -> 'DataProcessor':
        """Reset ke data original"""
        self.df = self.original_df.copy()
        return self
    
    def get_dataframe(self) -> pd.DataFrame:
        """Dapatkan DataFrame hasil proses"""
        return self.df
