from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
import string
import numpy as np

import nltk

# Initialize NLTK resources
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

# Download necessary NLTK resources
nltk.download('punkt')
nltk.download('stopwords')

app = FastAPI()

# Enable CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SummaryRequest(BaseModel):
    text: str
    num_sentences: Optional[int] = 3

class SummaryResponse(BaseModel):
    summary: str

def preprocess_text(text: str) -> list[str]:
    # Split text into sentences and clean
    sentences = sent_tokenize(text)
    return [s.strip() for s in sentences if s.strip()]

def calculate_sentence_scores(sentences: list[str]) -> list[float]:
    # Create TF-IDF matrix
    tfidf = TfidfVectorizer(
        stop_words=stopwords.words('english'),
        tokenizer=word_tokenize,
        token_pattern=None
    )
    tfidf_matrix = tfidf.fit_transform(sentences)
    
    # Calculate sentence scores as sum of TF-IDF scores
    return np.asarray(tfidf_matrix.sum(axis=1)).flatten().tolist()

@app.post("/summarize", response_model=SummaryResponse)
async def summarize_text(request: SummaryRequest):
    try:
        # Validate input
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Empty text provided")
            
        sentences = preprocess_text(request.text)
        if len(sentences) == 0:
            return SummaryResponse(summary="")

        # Handle case where requested sentences exceed available sentences
        num_sentences = min(request.num_sentences, len(sentences))
        if num_sentences <= 0:
            return SummaryResponse(summary=request.text[:200] + "...")

        # Calculate sentence scores and sort
        scores = calculate_sentence_scores(sentences)
        ranked_sentences = sorted(
            ((score, idx) for idx, score in enumerate(scores)),
            reverse=True
        )

        # Select top sentences while preserving original order
        top_indices = sorted(
            [idx for _, idx in ranked_sentences[:num_sentences]]
        )
        summary = " ".join(sentences[idx] for idx in top_indices)

        return SummaryResponse(summary=summary)

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Summarization failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
