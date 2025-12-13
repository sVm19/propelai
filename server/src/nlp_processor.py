from bs4 import BeautifulSoup
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer as Summarizer
from yake import KeywordExtractor
import requests
import os
import json
from typing import List, Dict, Any

# --- Configuration Constants ---
LANGUAGE = "english"
SUMMARY_SENTENCES_COUNT = 5
KEYWORD_COUNT = 10
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

# --- JSON Schema for Structured Output ---
# This dictionary structure forces the LLM to return data in a reliable, parsable format.
IDEA_SCHEMA = {
    "type": "array",
    "description": "A list of exactly 3 unique startup ideas based on the provided text.",
    "items": {
        "type": "object",
        "properties": {
            "Name": {"type": "string", "description": "A catchy, short name for the startup idea."},
            "Problem": {"type": "string", "description": "The specific market problem identified in the text context."},
            "Solution": {"type": "string", "description": "A brief, actionable solution using modern technology."}
        },
        "required": ["Name", "Problem", "Solution"]
    }
}

LLM_INSTRUCTIONS = (
    "You are a Venture Capitalist (VC) analyst. Analyze the context and identify market gaps. "
    "Generate exactly 3 unique, actionable startup ideas. Use the provided JSON schema."
)

class NLPProcessor:
    """Handles text cleaning, summarization, keyword extraction, and LLM communication."""
    def __init__(self, raw_text: str):
        self.raw_text = raw_text
        self.cleaned_text = self._clean_html()
        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
             print("Warning: GEMINI_API_KEY not set. LLM calls will fail.")
             # NOTE: main.py will handle the critical failure exception

    def _clean_html(self) -> str:
        """Strips HTML tags from the raw text, leaving only plain body copy."""
        soup = BeautifulSoup(self.raw_text, 'html.parser')
        # Filter scripts, styles, and headers to get cleaner body text
        for tag in soup(["script", "style", "header", "footer", "nav"]):
            tag.decompose()
        return soup.get_text(separator=' ', strip=True)

    def _generate_summary(self) -> str:
        """Uses LSA Summarizer to generate a short, representative summary."""
        parser = PlaintextParser.from_string(self.cleaned_text, Tokenizer(LANGUAGE))
        summarizer = Summarizer()
        summary_sentences = [str(sentence) for sentence in summarizer(parser.document, SUMMARY_SENTENCES_COUNT)]
        return " ".join(summary_sentences)

    def _extract_keywords(self) -> str:
        """Uses YAKE to extract the most relevant keywords and phrases."""
        kw_extractor = KeywordExtractor(lan=LANGUAGE, n=3, top=KEYWORD_COUNT, dedupLim=0.9)
        keywords = [kw for score, kw in kw_extractor.extract_keywords(self.cleaned_text)]
        return ", ".join(keywords)

    def build_optimized_prompt(self) -> str:
        """Combines the extracted data and instructions into a single LLM prompt."""
        summary = self._generate_summary()
        keywords = self._extract_keywords()
        
        prompt = (
            f"Context Summary:\n'{summary}'\n\n"
            f"Key Concepts:\n'{keywords}'"
        )
        return prompt

    def call_llm(self) -> List[Dict[str, str]]:
        """
        Makes the final API call to the Gemini LLM for structured output.
        Returns a list of dictionaries containing the ideas.
        """
        optimized_prompt = self.build_optimized_prompt()
        
        # 1. Define the Request Body
        headers = {
            'Content-Type': 'application/json',
            # 2. Authentication via Header
            'x-goog-api-key': self.api_key 
        }

        data = {
            # Contents array holds the user's prompt
            "contents": [
                {
                    "parts": [
                        {"text": self.build_optimized_prompt()}
                    ]
                }
            ],
            # 3. Configuration to enforce Structured JSON Output
            "config": {
                "systemInstruction": LLM_INSTRUCTIONS, # Set the persona
                "responseMimeType": "application/json",
                "responseSchema": IDEA_SCHEMA,
                "temperature": 0.8 # Added for a bit of creativity in ideas
            }
        }
        
        # 4. Make the HTTP POST Request
        try:
            response = requests.post(
                GEMINI_API_URL, 
                headers=headers, 
                data=json.dumps(data)
            )
            response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)

            # 5. Parse the Response
            # The response.json() contains the 'candidates' structure
            response_data = response.json()
            
            # Extract the raw JSON string from the response
            json_text = response_data['candidates'][0]['content']['parts'][0]['text']
            
            # The LLM output is a JSON string, so we parse it into a Python list of dicts
            return json.loads(json_text)

        except requests.exceptions.RequestException as e:
            print(f"API Request Error: {e}")
            raise HTTPException(status_code=500, detail="External API Request Failed.")
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print(f"Response Parsing Error: {e}")
            raise HTTPException(status_code=500, detail="Invalid JSON structure returned by LLM.")