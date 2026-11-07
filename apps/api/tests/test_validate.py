import pytest

from pipeline.errors import UnrepairableScriptError
from pipeline.validate import validate_script
from tests.conftest import REPO_ROOT, SAMPLE_SCRIPT, TSX_AVAILABLE

pytestmark = pytest.mark.skipif(
    not TSX_AVAILABLE, reason="validator bridge needs tsx (run pnpm install)"
)


def test_bridge_returns_script_warnings_stats():
    result = validate_script(SAMPLE_SCRIPT, REPO_ROOT)
    assert result["script"]["version"] == "1.0"
    assert result["stats"]["repairCount"] == 1
    assert result["warnings"][0]["code"] == "unknown_prop"


def test_bridge_raises_typed_on_unrepairable():
    with pytest.raises(UnrepairableScriptError):
        validate_script({"title": "no scenes here"}, REPO_ROOT)
    with pytest.raises(UnrepairableScriptError):
        validate_script(None, REPO_ROOT)
