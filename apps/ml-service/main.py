from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Glossa ML Service")

# Allow CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Language code mapping for argostranslate
LANG_CODES = {
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "italian": "it", "portuguese": "pt", "russian": "ru", "chinese": "zh",
    "japanese": "ja", "korean": "ko", "arabic": "ar", "hindi": "hi",
    "turkish": "tr", "dutch": "nl", "polish": "pl", "swedish": "sv",
}

translator_ready = False

try:
    import argostranslate.package
    import argostranslate.translate

    logger.info("Updating Argos Translate package index...")
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()

    # Install essential language packages
    priority_pairs = [
        ("en", "es"), ("en", "fr"), ("en", "de"), ("en", "ar"),
        ("en", "it"), ("en", "pt"), ("en", "ru"), ("en", "zh"),
        ("en", "ja"), ("en", "ko"), ("en", "hi"), ("en", "tr"),
    ]

    for from_code, to_code in priority_pairs:
        pkg = next(
            (p for p in available_packages
             if p.from_code == from_code and p.to_code == to_code),
            None
        )
        if pkg:
            logger.info(f"Installing {from_code} -> {to_code}...")
            argostranslate.package.install_from_path(pkg.download())

        # Also install the reverse direction
        pkg_rev = next(
            (p for p in available_packages
             if p.from_code == to_code and p.to_code == from_code),
            None
        )
        if pkg_rev:
            logger.info(f"Installing {to_code} -> {from_code}...")
            argostranslate.package.install_from_path(pkg_rev.download())

    translator_ready = True
    logger.info("Argos Translate ready with all language packages.")

except Exception as e:
    logger.error(f"Failed to initialize Argos Translate: {e}")


class TranslateRequest(BaseModel):
    source_text: str
    source_lang: str
    target_lang: str


class TranslateResponse(BaseModel):
    translated_text: str


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": translator_ready}


@app.get("/languages")
def list_languages():
    """Return available translation language pairs."""
    if not translator_ready:
        return {"languages": list(LANG_CODES.keys())}
    try:
        installed = argostranslate.translate.get_installed_languages()
        return {
            "languages": [lang.name for lang in installed]
        }
    except Exception:
        return {"languages": list(LANG_CODES.keys())}


@app.post("/ml/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    if not translator_ready:
        raise HTTPException(status_code=503, detail="Translation engine is still loading. Please wait.")

    from_code = LANG_CODES.get(req.source_lang.lower())
    to_code = LANG_CODES.get(req.target_lang.lower())

    if not from_code or not to_code:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language pair: {req.source_lang} -> {req.target_lang}. "
                   f"Supported: {', '.join(LANG_CODES.keys())}"
        )

    try:
        translated = argostranslate.translate.translate(req.source_text, from_code, to_code)
        return TranslateResponse(translated_text=translated)
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
