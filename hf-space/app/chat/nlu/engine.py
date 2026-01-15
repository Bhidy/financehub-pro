import yaml
import os
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class NLUEngine:
    """
    Semantic NLU Engine using Sentence Transformers (all-MiniLM-L6-v2).
    Maps user text to intents via vector similarity.
    """
    
    def __init__(self, intents_path: str = "app/chat/nlu/intents.yaml"):
        self.model = None
        self.intent_embeddings = None
        self.intent_labels = []
        self.intents_path = intents_path
        self.enabled = False
        self._load_model()

    def _load_model(self):
        """Load the model and intents."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("NLU: Loading SentenceTransformer model...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.enabled = True
            self._load_intents()
            logger.info("NLU: Functionality Enabled.")
        except ImportError:
            logger.warning("NLU: sentence-transformers not installed. Semantic search disabled.")
        except Exception as e:
            logger.error(f"NLU: Model load error: {e}")

    def _load_intents(self):
        """Load intent examples and pre-compute embeddings."""
        if not self.model: return

        try:
            path = Path(self.intents_path)
            if not path.exists():
                logger.warning(f"NLU: Intents file not found at {path}")
                return

            with open(path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)

            if not data or 'intents' not in data:
                return

            examples = []
            labels = []

            for intent in data['intents']:
                name = intent['name']
                for example in intent.get('examples', []):
                    examples.append(example)
                    labels.append(name)

            if examples:
                logger.info(f"NLU: Encoding {len(examples)} examples...")
                self.intent_embeddings = self.model.encode(examples, convert_to_tensor=True)
                self.intent_labels = labels
                logger.info("NLU: Encoding complete.")

        except Exception as e:
            logger.error(f"NLU: Intent load error: {e}")

    def predict_intent(self, text: str, threshold: float = 0.45) -> Tuple[Optional[str], float]:
        """
        Predict intent for value.
        Returns (intent_name, score).
        If score < threshold, returns (None, score).
        """
        if not self.enabled or self.intent_embeddings is None:
            return None, 0.0

        try:
            from sentence_transformers import util
            
            # Encode query
            query_embedding = self.model.encode(text, convert_to_tensor=True)
            
            # Compute cosine similarities
            cos_scores = util.cos_sim(query_embedding, self.intent_embeddings)[0]
            
            # Find best match
            best_score_idx = np.argmax(cos_scores.cpu().numpy())
            best_score = float(cos_scores[best_score_idx])
            best_intent = self.intent_labels[best_score_idx]
            
            if best_score >= threshold:
                return best_intent, best_score
            
            return None, best_score

        except Exception as e:
            logger.error(f"NLU: Prediction error: {e}")
            return None, 0.0
