
import re
import logging
from typing import List, Dict, Any, Set

logger = logging.getLogger(__name__)

class NumericVerifier:
    """
    Guardrail to detect financial hallucinations.
    Ensures that numbers in the generated response exist in the source data.
    """

    @staticmethod
    def extract_numbers(text: str) -> Set[float]:
        """
        Extracts numbers from text, normalizing formats.
        Handles: "1.2M", "5%", "$10.50", "1,000"
        Ignores: Years (2020-2030), small integers < 10 (likely counts/lists).
        """
        # Regex for various number formats
        # Matches: 1.23, -1.23, 1,000.00, 50%
        # Does NOT match strict years easily, but we filter post-extraction
        pattern = r'[-+]?\.?\d+(?:,\d{3})*(?:\.\d+)?(?:[KMg%]?)'
        
        matches = re.findall(pattern, text)
        cleaned_numbers = set()

        for raw in matches:
            try:
                # Remove artifacts
                clean = raw.replace(',', '').replace('$', '').replace('%', '')
                if clean.upper().endswith('K'):
                    val = float(clean[:-1]) * 1000
                elif clean.upper().endswith('M'):
                    val = float(clean[:-1]) * 1000000
                elif clean.upper().endswith('B'):
                    val = float(clean[:-1]) * 1000000000
                else:
                    val = float(clean)

                # Filter out years (roughly) and small integers (lists)
                if 2015 <= val <= 2030:
                    continue # Likely a year
                if abs(val) < 10 and float(val).is_integer():
                    continue # Likely a list item "1.", "2." or small count

                cleaned_numbers.add(val)
            except ValueError:
                continue
                
        return cleaned_numbers

    @staticmethod
    def verify_response(response_text: str, data_context: List[Dict[str, Any]]) -> List[str]:
        """
        Verifies that numbers in response_text are present in data_context.
        Returns a list of warnings (mismatches).
        """
        if not response_text or not data_context:
            return []

        # 1. Flatten Data Context into a searchable string/set
        # We convert the entire data object to string to catch all values
        data_str = str(data_context) 
        source_numbers = NumericVerifier.extract_numbers(data_str)
        
        # 2. Extract Response Numbers
        response_numbers = NumericVerifier.extract_numbers(response_text)
        
        # 3. Check for Hallucinations
        mismatches = []
        for num in response_numbers:
            # Check for close match (floating point tolerance)
            # 1% tolerance for rounding differences (e.g. 1.23 vs 1.2)
            found = False
            for source_num in source_numbers:
                if source_num == 0:
                    if abs(num) < 0.001: found = True
                else:
                    # Rel tol 1%, Abs tol 0.1
                    if abs(num - source_num) <= (0.01 * abs(source_num)) or abs(num - source_num) < 0.1:
                        found = True
                        break
            
            if not found:
                mismatches.append(f"Value {num} not found in source data.")

        if mismatches:
            logger.warning(f"🚨 CHALLENGER DETECTED HALLUCINATIONS: {mismatches}")
            
        return mismatches
