from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from activos_utils import (
    TICKERS_COMMODITIES,
    TICKERS_INDICES,
    TIPOS_ACTIVO_VALIDOS,
    activo_desbloqueado,
    clasificar_ticker,
    separar_activos_por_disponibilidad,
)


class TestClasificarTicker:
    def test_index_tickers(self):
        for ticker in TICKERS_INDICES:
            assert clasificar_ticker(ticker) == "indices"

    def test_commodity_tickers(self):
        for ticker in TICKERS_COMMODITIES:
            assert clasificar_ticker(ticker) == "commodities"

    def test_regular_stock(self):
        assert clasificar_ticker("AAPL") == "acciones"
        assert clasificar_ticker("MSFT") == "acciones"
        assert clasificar_ticker("TSLA") == "acciones"

    def test_case_insensitive(self):
        assert clasificar_ticker("spy") == "indices"
        assert clasificar_ticker("gld") == "commodities"
        assert clasificar_ticker("aapl") == "acciones"

    def test_strips_whitespace(self):
        assert clasificar_ticker("  SPY  ") == "indices"
        assert clasificar_ticker("  AAPL  ") == "acciones"

    def test_unknown_ticker_defaults_to_acciones(self):
        assert clasificar_ticker("UNKNOWN123") == "acciones"


class _FakeFase:
    def __init__(self, tipo_activo: str, fecha_activacion: datetime):
        self.tipo_activo = tipo_activo
        self.fecha_activacion = fecha_activacion


class TestActivoDesbloqueado:
    def test_tipo_not_in_permitted_list(self):
        assert activo_desbloqueado("indices", ["acciones"], []) is False

    def test_none_permitted_list(self):
        assert activo_desbloqueado("acciones", None, []) is False

    def test_empty_permitted_list(self):
        assert activo_desbloqueado("acciones", [], []) is False

    def test_permitted_no_phase(self):
        assert activo_desbloqueado("acciones", ["acciones", "indices"], []) is True

    def test_phase_already_active(self):
        past = datetime.now(timezone.utc) - timedelta(days=1)
        fase = _FakeFase("acciones", past)
        assert activo_desbloqueado("acciones", ["acciones"], [fase]) is True

    def test_phase_not_yet_active(self):
        future = datetime.now(timezone.utc) + timedelta(days=1)
        fase = _FakeFase("acciones", future)
        assert activo_desbloqueado("acciones", ["acciones"], [fase]) is False

    def test_phase_for_different_asset_type(self):
        future = datetime.now(timezone.utc) + timedelta(days=1)
        fase = _FakeFase("indices", future)
        assert activo_desbloqueado("acciones", ["acciones", "indices"], [fase]) is True


class TestSepararActivosPorDisponibilidad:
    def test_none_permitted(self):
        disponibles, proximos = separar_activos_por_disponibilidad(None, [])
        assert disponibles == []
        assert proximos == []

    def test_all_available_no_phases(self):
        disponibles, proximos = separar_activos_por_disponibilidad(
            ["acciones", "indices"], []
        )
        assert disponibles == ["acciones", "indices"]
        assert proximos == []

    def test_mix_of_available_and_upcoming(self):
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        future = datetime.now(timezone.utc) + timedelta(days=7)
        fases = [
            _FakeFase("acciones", past),
            _FakeFase("indices", future),
        ]
        disponibles, proximos = separar_activos_por_disponibilidad(
            ["acciones", "indices", "commodities"], fases
        )
        assert "acciones" in disponibles
        assert "commodities" in disponibles
        assert len(proximos) == 1
        assert proximos[0]["tipo_activo"] == "indices"

    def test_upcoming_includes_activation_date(self):
        future = datetime.now(timezone.utc) + timedelta(days=30)
        fase = _FakeFase("indices", future)
        _, proximos = separar_activos_por_disponibilidad(["indices"], [fase])
        assert proximos[0]["fecha_activacion"] == future.isoformat()


class TestTiposActivoValidos:
    def test_expected_types(self):
        assert "acciones" in TIPOS_ACTIVO_VALIDOS
        assert "indices" in TIPOS_ACTIVO_VALIDOS
        assert "commodities" in TIPOS_ACTIVO_VALIDOS
        assert len(TIPOS_ACTIVO_VALIDOS) == 3
