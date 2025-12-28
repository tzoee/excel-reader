"""
Excel/Spreadsheet Reader Module
Mendukung format: .xlsx, .xls, .csv
"""
import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any


class ExcelReader:
    """Class untuk membaca file Excel/Spreadsheet"""
    
    SUPPORTED_FORMATS = ['.xlsx', '.xls', '.csv']
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self._validate_file()
        self._dataframes: Dict[str, pd.DataFrame] = {}
    
    def _validate_file(self) -> None:
        """Validasi file exists dan format didukung"""
        if not self.file_path.exists():
            raise FileNotFoundError(f"File tidak ditemukan: {self.file_path}")
        
        if self.file_path.suffix.lower() not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Format tidak didukung. Gunakan: {self.SUPPORTED_FORMATS}")
    
    def read(self, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """
        Baca file dan return DataFrame
        
        Args:
            sheet_name: Nama sheet (untuk Excel). None = sheet pertama
        
        Returns:
            pandas DataFrame
        """
        suffix = self.file_path.suffix.lower()
        
        if suffix == '.csv':
            df = pd.read_csv(self.file_path)
        else:
            df = pd.read_excel(self.file_path, sheet_name=sheet_name)
        
        # Cache hasil
        cache_key = sheet_name or 'default'
        self._dataframes[cache_key] = df
        
        return df
    
    def read_all_sheets(self) -> Dict[str, pd.DataFrame]:
        """Baca semua sheet dalam file Excel"""
        if self.file_path.suffix.lower() == '.csv':
            return {'Sheet1': self.read()}
        
        all_sheets = pd.read_excel(self.file_path, sheet_name=None)
        self._dataframes.update(all_sheets)
        return all_sheets
    
    def get_sheet_names(self) -> List[str]:
        """Dapatkan daftar nama sheet"""
        if self.file_path.suffix.lower() == '.csv':
            return ['Sheet1']
        
        excel_file = pd.ExcelFile(self.file_path)
        return excel_file.sheet_names
    
    def get_info(self) -> Dict[str, Any]:
        """Dapatkan informasi file"""
        return {
            'file_name': self.file_path.name,
            'file_size': self.file_path.stat().st_size,
            'format': self.file_path.suffix,
            'sheets': self.get_sheet_names()
        }
