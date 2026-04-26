from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
import concurrent.futures

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Glossa ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LANG_CODES = {
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "italian": "it", "portuguese": "pt", "russian": "ru", "chinese": "zh",
    "japanese": "ja", "korean": "ko", "arabic": "ar", "hindi": "hi",
    "turkish": "tr", "dutch": "nl", "polish": "pl", "swedish": "sv",
}

translator_ready = False


def download_with_timeout(pkg, timeout=30):
    """Download a package with a timeout. Returns path or None on timeout/error."""
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        future = executor.submit(pkg.download)
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        logger.warning(f"Download timed out after {timeout}s")
        return None
    except Exception as e:
        logger.warning(f"Download failed: {e}")
        return None
    finally:
        executor.shutdown(wait=False)


def install_models():
    global translator_ready
    try:
        import argostranslate.package
        import argostranslate.translate
        import argostranslate.settings
        import os

        models_dir = os.environ.get('ARGOS_MODELS_DIR', '/models')
        os.makedirs(models_dir, exist_ok=True)
        argostranslate.settings.package_data_dir = models_dir
        logger.info(f"Argos Translate models directory: {models_dir}")

        logger.info("Updating Argos Translate package index...")
        argostranslate.package.update_package_index()
        available_packages = argostranslate.package.get_available_packages()

        priority_pairs = [
            ("en", "es"), ("en", "fr"), ("en", "de"), ("en", "ar"),
            ("en", "it"), ("en", "pt"), ("en", "ru"), ("en", "zh"),
            ("en", "ja"), ("en", "ko"), ("en", "hi"), ("en", "tr"),
        ]

        installed_count = 0

        for from_code, to_code in priority_pairs:
            try:
                pkg = next(
                    (p for p in available_packages
                     if p.from_code == from_code and p.to_code == to_code),
                    None
                )
                if pkg:
                    logger.info(f"Installing {from_code} -> {to_code}...")
                    model_path = download_with_timeout(pkg)
                    if model_path:
                        argostranslate.package.install_from_path(model_path)
                        installed_count += 1
                        translator_ready = True
                        logger.info(f"✓ {from_code} -> {to_code} installed")
            except Exception as e:
                logger.warning(f"✗ Skipping {from_code} -> {to_code}: {e}")

            try:
                pkg_rev = next(
                    (p for p in available_packages
                     if p.from_code == to_code and p.to_code == from_code),
                    None
                )
                if pkg_rev:
                    logger.info(f"Installing {to_code} -> {from_code}...")
                    model_path = download_with_timeout(pkg_rev)
                    if model_path:
                        argostranslate.package.install_from_path(model_path)
                        installed_count += 1
                        logger.info(f"✓ {to_code} -> {from_code} installed")
            except Exception as e:
                logger.warning(f"✗ Skipping {to_code} -> {from_code}: {e}")

        translator_ready = installed_count > 0
        logger.info(
            f"Argos Translate ready: {installed_count} model pairs installed "
            f"({('all' if installed_count >= len(priority_pairs) * 2 else 'partial')})."
        )

    except Exception as e:
        logger.error(f"Failed to initialize Argos Translate: {e}")


@app.on_event("startup")
async def startup_event():
    asyncio.get_event_loop().run_in_executor(None, install_models)


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
    return {"languages": list(LANG_CODES.keys())}


@app.post("/ml/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    if not translator_ready:
        raise HTTPException(
            status_code=503,
            detail="Translation engine is still loading. Please wait."
        )

    from_code = LANG_CODES.get(req.source_lang.lower())
    to_code = LANG_CODES.get(req.target_lang.lower())

    if not from_code or not to_code:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language pair: {req.source_lang} -> {req.target_lang}. "
                   f"Supported: {', '.join(LANG_CODES.keys())}"
        )

    try:
        import argostranslate.translate
        result = argostranslate.translate.translate(req.source_text, from_code, to_code)
        if result is None:
            raise HTTPException(
                status_code=503,
                detail=f"Translation model not available for {req.source_lang} → {req.target_lang}. "
                       f"The model package has not been downloaded yet."
            )
        return TranslateResponse(translated_text=result)
    except HTTPException:
        raise
    except AttributeError:
        raise HTTPException(
            status_code=503,
            detail=f"Translation model not available for {req.source_lang} → {req.target_lang}. "
                   f"The model package has not been downloaded yet."
        )
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
