from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType


BACKEND_DIR = Path(__file__).resolve().parent
PRIVATE_APP_PATH = BACKEND_DIR / "main_private.py"
PUBLIC_APP_PATH = BACKEND_DIR / "public_app.py"


def load_app_module(module_path: Path, module_name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load backend module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


app_module = load_app_module(
    PRIVATE_APP_PATH if PRIVATE_APP_PATH.is_file() else PUBLIC_APP_PATH,
    "cocoon_private_backend" if PRIVATE_APP_PATH.is_file() else "cocoon_public_backend",
)
app = app_module.app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
