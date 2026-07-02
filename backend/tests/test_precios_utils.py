from datetime import date, datetime, timezone

import pytest
from fastapi import HTTPException

from precios_utils import (
    INDICES_MERCADO,
    TICKERS_DESTACADOS,
    _to_unix_ts,
    validar_ticker,
)


class TestValidarTicker:
    def test_valid_uppercase(self):
        assert validar_ticker("AAPL") == "AAPL"
        assert validar_ticker("MSFT") == "MSFT"

    def test_lowercase_is_uppercased(self):
        assert validar_ticker("aapl") == "AAPL"

    def test_strips_whitespace(self):
        assert validar_ticker("  AAPL  ") == "AAPL"

    def test_ticker_with_dot(self):
        assert validar_ticker("BRK.B") == "BRK.B"

    def test_ticker_with_caret(self):
        assert validar_ticker("^GSPC") == "^GSPC"

    def test_ticker_with_equals(self):
        assert validar_ticker("GC=F") == "GC=F"

    def test_ticker_with_dash(self):
        assert validar_ticker("BF-B") == "BF-B"

    def test_invalid_ticker_empty(self):
        with pytest.raises(HTTPException) as exc_info:
            validar_ticker("")
        assert exc_info.value.status_code == 400

    def test_invalid_ticker_special_chars(self):
        with pytest.raises(HTTPException) as exc_info:
            validar_ticker("AA$PL")
        assert exc_info.value.status_code == 400

    def test_invalid_ticker_too_long(self):
        with pytest.raises(HTTPException) as exc_info:
            validar_ticker("A" * 16)
        assert exc_info.value.status_code == 400

    def test_max_length_ticker(self):
        result = validar_ticker("A" * 15)
        assert len(result) == 15

    def test_invalid_ticker_with_spaces_inside(self):
        with pytest.raises(HTTPException):
            validar_ticker("AA PL")

    def test_numeric_ticker(self):
        assert validar_ticker("0700") == "0700"


class TestToUnixTs:
    def test_start_of_day(self):
        d = date(2024, 1, 1)
        expected = int(datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc).timestamp())
        assert _to_unix_ts(d) == expected

    def test_end_of_day(self):
        d = date(2024, 1, 1)
        expected = int(datetime(2024, 1, 1, 23, 59, 59, tzinfo=timezone.utc).timestamp())
        assert _to_unix_ts(d, end_of_day=True) == expected

    def test_returns_integer(self):
        d = date(2024, 6, 15)
        assert isinstance(_to_unix_ts(d), int)


class TestConstants:
    def test_tickers_destacados_non_empty(self):
        assert len(TICKERS_DESTACADOS) > 0

    def test_tickers_destacados_are_uppercase(self):
        for t in TICKERS_DESTACADOS:
            assert t == t.upper()

    def test_indices_mercado_have_required_keys(self):
        for idx in INDICES_MERCADO:
            assert "ticker" in idx
            assert "nombre" in idx

    def test_indices_mercado_non_empty(self):
        assert len(INDICES_MERCADO) > 0
