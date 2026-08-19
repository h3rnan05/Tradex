from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException

from routers.grupos import validar_rango_fechas
from schemas.grupo import GrupoUpdate


class TestValidarRangoFechas:
    def test_rango_valido(self):
        inicio = datetime(2026, 8, 19, tzinfo=timezone.utc)
        fin = inicio + timedelta(days=30)
        validar_rango_fechas(inicio, fin)  # no debe lanzar

    def test_fin_antes_de_inicio(self):
        inicio = datetime(2026, 8, 19, tzinfo=timezone.utc)
        with pytest.raises(HTTPException) as exc:
            validar_rango_fechas(inicio, inicio - timedelta(days=1))
        assert exc.value.status_code == 400

    def test_fin_igual_a_inicio(self):
        inicio = datetime(2026, 8, 19, tzinfo=timezone.utc)
        with pytest.raises(HTTPException):
            validar_rango_fechas(inicio, inicio)

    def test_mezcla_naive_y_aware_no_truena(self):
        # Un PATCH viejo pudo guardar fechas naive; la comparación no debe
        # lanzar TypeError al mezclarlas con fechas aware.
        inicio_naive = datetime(2026, 8, 19)
        fin_aware = datetime(2026, 9, 19, tzinfo=timezone.utc)
        validar_rango_fechas(inicio_naive, fin_aware)


class TestGrupoUpdate:
    def test_acepta_los_campos_del_form_de_configuracion(self):
        # El form de Configuración del maestro manda estos campos; antes
        # fecha_inicio y capital_inicial se descartaban en silencio.
        u = GrupoUpdate(
            nombre="Mi clase",
            capital_inicial=50000,
            fecha_inicio="2026-08-19T06:00:00Z",
            fecha_fin="2026-09-20T05:59:59Z",
            comision_porcentaje=0.01,
        )
        aplicados = u.model_dump(exclude_none=True)
        assert aplicados["capital_inicial"] == Decimal("50000")
        assert aplicados["fecha_inicio"].year == 2026
        assert aplicados["fecha_fin"] > aplicados["fecha_inicio"]
