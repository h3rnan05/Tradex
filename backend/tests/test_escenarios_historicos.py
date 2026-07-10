from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from escenarios_historicos import (
    ESCENARIOS_HISTORICOS,
    obtener_escenario,
    precio_simulado,
)


class TestEscenariosHistoricosConstants:
    def test_all_scenarios_have_required_keys(self):
        required_keys = {"nombre", "descripcion", "fecha_inicio", "fecha_fin", "tickers_sugeridos"}
        for escenario_id, esc in ESCENARIOS_HISTORICOS.items():
            assert required_keys.issubset(esc.keys()), f"Missing keys in {escenario_id}"

    def test_dates_are_date_objects(self):
        for esc in ESCENARIOS_HISTORICOS.values():
            assert isinstance(esc["fecha_inicio"], date)
            assert isinstance(esc["fecha_fin"], date)

    def test_fecha_fin_after_fecha_inicio(self):
        for escenario_id, esc in ESCENARIOS_HISTORICOS.items():
            assert esc["fecha_fin"] > esc["fecha_inicio"], f"Invalid dates in {escenario_id}"

    def test_tickers_sugeridos_non_empty(self):
        for esc in ESCENARIOS_HISTORICOS.values():
            assert len(esc["tickers_sugeridos"]) > 0

    def test_known_scenarios_exist(self):
        assert "covid_2020" in ESCENARIOS_HISTORICOS
        assert "inflacion_2022" in ESCENARIOS_HISTORICOS
        assert "rally_ia_2023" in ESCENARIOS_HISTORICOS


class TestObtenerEscenario:
    def test_valid_scenario(self):
        result = obtener_escenario("covid_2020")
        assert result["nombre"] == "Crash y recuperacion COVID-19"

    def test_invalid_scenario_raises_404(self):
        with pytest.raises(HTTPException) as exc_info:
            obtener_escenario("nonexistent")
        assert exc_info.value.status_code == 404


class TestPrecioSimulado:
    @patch("escenarios_historicos.obtener_historial_precios_rango")
    def test_returns_decimal(self, mock_historial):
        mock_historial.return_value = [
            {"fecha": "2020-02-03", "precio": Decimal("320.00")},
            {"fecha": "2020-06-01", "precio": Decimal("310.00")},
            {"fecha": "2020-12-31", "precio": Decimal("370.00")},
        ]
        ahora = datetime.now(timezone.utc)
        inicio = ahora - timedelta(hours=2)
        fin = ahora + timedelta(hours=2)
        result = precio_simulado("SPY", "covid_2020", inicio, fin)
        assert isinstance(result, Decimal)

    @patch("escenarios_historicos.obtener_historial_precios_rango")
    def test_at_start_returns_first_price(self, mock_historial):
        mock_historial.return_value = [
            {"fecha": "2020-02-03", "precio": Decimal("100.00")},
            {"fecha": "2020-06-01", "precio": Decimal("200.00")},
            {"fecha": "2020-12-31", "precio": Decimal("300.00")},
        ]
        ahora = datetime.now(timezone.utc)
        inicio = ahora
        fin = ahora + timedelta(days=10)
        result = precio_simulado("SPY", "covid_2020", inicio, fin)
        assert result == Decimal("100.00")

    @patch("escenarios_historicos.obtener_historial_precios_rango")
    @patch("escenarios_historicos.datetime")
    def test_at_end_returns_last_price(self, mock_dt, mock_historial):
        mock_historial.return_value = [
            {"fecha": "2020-02-03", "precio": Decimal("100.00")},
            {"fecha": "2020-06-01", "precio": Decimal("200.00")},
            {"fecha": "2020-12-31", "precio": Decimal("300.00")},
        ]
        past = datetime(2024, 1, 1, tzinfo=timezone.utc)
        inicio = past - timedelta(days=10)
        fin = past - timedelta(days=1)
        mock_dt.now.return_value = past
        mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
        result = precio_simulado("SPY", "covid_2020", inicio, fin)
        assert result == Decimal("300.00")

    @patch("escenarios_historicos.obtener_historial_precios_rango")
    def test_zero_duration_returns_last_price(self, mock_historial):
        mock_historial.return_value = [
            {"fecha": "2020-02-03", "precio": Decimal("100.00")},
            {"fecha": "2020-12-31", "precio": Decimal("300.00")},
        ]
        ahora = datetime.now(timezone.utc)
        result = precio_simulado("SPY", "covid_2020", ahora, ahora)
        assert result == Decimal("300.00")
