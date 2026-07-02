import math

from riesgo_utils import (
    calcular_metricas,
    calcular_retornos_diarios,
    calcular_sharpe_ratio,
    calcular_volatilidad_anualizada,
)


class TestCalcularRetornosDiarios:
    def test_empty_series(self):
        assert calcular_retornos_diarios([]) == []

    def test_single_value(self):
        assert calcular_retornos_diarios([100.0]) == []

    def test_two_values(self):
        result = calcular_retornos_diarios([100.0, 110.0])
        assert len(result) == 1
        assert result[0] == pytest.approx(0.1)

    def test_multiple_values(self):
        result = calcular_retornos_diarios([100.0, 105.0, 110.25])
        assert len(result) == 2
        assert result[0] == pytest.approx(0.05)
        assert result[1] == pytest.approx(0.05)

    def test_negative_return(self):
        result = calcular_retornos_diarios([100.0, 90.0])
        assert result[0] == pytest.approx(-0.1)

    def test_constant_prices(self):
        result = calcular_retornos_diarios([50.0, 50.0, 50.0])
        assert result == [0.0, 0.0]


class TestCalcularVolatilidadAnualizada:
    def test_insufficient_data(self):
        assert calcular_volatilidad_anualizada([]) == 0.0
        assert calcular_volatilidad_anualizada([0.01]) == 0.0

    def test_zero_returns(self):
        assert calcular_volatilidad_anualizada([0.0, 0.0, 0.0]) == 0.0

    def test_positive_returns(self):
        retornos = [0.01, 0.02, -0.01, 0.03, 0.0]
        vol = calcular_volatilidad_anualizada(retornos)
        assert vol > 0
        n = len(retornos)
        media = sum(retornos) / n
        varianza = sum((r - media) ** 2 for r in retornos) / (n - 1)
        expected = math.sqrt(varianza) * math.sqrt(252)
        assert vol == pytest.approx(expected)

    def test_annualization_factor(self):
        retornos = [0.01, -0.01]
        vol = calcular_volatilidad_anualizada(retornos)
        media = 0.0
        varianza = sum((r - media) ** 2 for r in retornos) / 1
        daily_vol = math.sqrt(varianza)
        assert vol == pytest.approx(daily_vol * math.sqrt(252))


class TestCalcularSharpeRatio:
    def test_insufficient_data(self):
        assert calcular_sharpe_ratio([]) == 0.0
        assert calcular_sharpe_ratio([0.01]) == 0.0

    def test_zero_volatility(self):
        assert calcular_sharpe_ratio([0.0, 0.0, 0.0]) == 0.0

    def test_positive_sharpe(self):
        retornos = [0.01] * 10
        sharpe = calcular_sharpe_ratio(retornos)
        assert sharpe > 0

    def test_custom_risk_free_rate(self):
        retornos = [0.01, 0.02, 0.015, 0.01, 0.02]
        sharpe_default = calcular_sharpe_ratio(retornos)
        sharpe_zero_rf = calcular_sharpe_ratio(retornos, tasa_libre_riesgo=0.0)
        assert sharpe_zero_rf > sharpe_default

    def test_negative_sharpe_for_losing_returns(self):
        retornos = [-0.05, -0.03, -0.04, -0.02, -0.06]
        sharpe = calcular_sharpe_ratio(retornos)
        assert sharpe < 0


class TestCalcularMetricas:
    def test_insufficient_data_returns_nones(self):
        result = calcular_metricas([])
        assert result["volatilidad_anualizada"] is None
        assert result["sharpe_ratio"] is None
        assert result["rendimiento_total_pct"] is None

    def test_two_points_returns_nones(self):
        result = calcular_metricas([
            {"fecha": "2024-01-01", "valor": 100},
            {"fecha": "2024-01-02", "valor": 110},
        ])
        assert result["volatilidad_anualizada"] is None

    def test_valid_series(self):
        serie = [
            {"fecha": "2024-01-01", "valor": 100.0},
            {"fecha": "2024-01-02", "valor": 105.0},
            {"fecha": "2024-01-03", "valor": 110.0},
            {"fecha": "2024-01-04", "valor": 108.0},
        ]
        result = calcular_metricas(serie)
        assert result["volatilidad_anualizada"] is not None
        assert result["sharpe_ratio"] is not None
        assert result["rendimiento_total_pct"] == pytest.approx(8.0)

    def test_rendimiento_total_percentage(self):
        serie = [
            {"fecha": "2024-01-01", "valor": 200.0},
            {"fecha": "2024-01-02", "valor": 210.0},
            {"fecha": "2024-01-03", "valor": 220.0},
            {"fecha": "2024-01-04", "valor": 300.0},
        ]
        result = calcular_metricas(serie)
        assert result["rendimiento_total_pct"] == pytest.approx(50.0)

    def test_results_are_rounded(self):
        serie = [
            {"fecha": "2024-01-01", "valor": 100.0},
            {"fecha": "2024-01-02", "valor": 101.123456},
            {"fecha": "2024-01-03", "valor": 102.789012},
            {"fecha": "2024-01-04", "valor": 103.456789},
        ]
        result = calcular_metricas(serie)
        vol_str = str(result["volatilidad_anualizada"])
        decimals = vol_str.split(".")[-1] if "." in vol_str else ""
        assert len(decimals) <= 2


import pytest
