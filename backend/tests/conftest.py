import sys
from pathlib import Path

# Ensure backend root is on sys.path so that imports like
# ``from riesgo_utils import ...`` work inside tests the same
# way they work in the application code.
_backend_root = str(Path(__file__).resolve().parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)
