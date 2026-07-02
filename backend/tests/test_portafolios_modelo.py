from decimal import Decimal

from portafolios_modelo import PERFILES_RIESGO_VALIDOS, PLANTILLAS_PORTAFOLIO


class TestPerfilesRiesgoValidos:
    def test_expected_profiles(self):
        assert "conservador" in PERFILES_RIESGO_VALIDOS
        assert "moderado" in PERFILES_RIESGO_VALIDOS
        assert "agresivo" in PERFILES_RIESGO_VALIDOS
        assert len(PERFILES_RIESGO_VALIDOS) == 3


class TestPlantillasPortafolio:
    def test_all_profiles_have_templates(self):
        for perfil in PERFILES_RIESGO_VALIDOS:
            assert perfil in PLANTILLAS_PORTAFOLIO

    def test_templates_have_required_keys(self):
        for perfil, template in PLANTILLAS_PORTAFOLIO.items():
            assert "nombre" in template, f"Missing 'nombre' in {perfil}"
            assert "descripcion" in template, f"Missing 'descripcion' in {perfil}"
            assert "activos" in template, f"Missing 'activos' in {perfil}"

    def test_activos_have_required_fields(self):
        for perfil, template in PLANTILLAS_PORTAFOLIO.items():
            for activo in template["activos"]:
                assert "ticker" in activo, f"Missing 'ticker' in {perfil} asset"
                assert "porcentaje" in activo, f"Missing 'porcentaje' in {perfil} asset"

    def test_portfolio_weights_sum_to_one(self):
        for perfil, template in PLANTILLAS_PORTAFOLIO.items():
            total = sum(Decimal(a["porcentaje"]) for a in template["activos"])
            assert total == Decimal("1.00"), f"Weights in {perfil} sum to {total}, not 1.00"

    def test_all_tickers_are_uppercase(self):
        for template in PLANTILLAS_PORTAFOLIO.values():
            for activo in template["activos"]:
                assert activo["ticker"] == activo["ticker"].upper()

    def test_each_template_has_at_least_two_assets(self):
        for perfil, template in PLANTILLAS_PORTAFOLIO.items():
            assert len(template["activos"]) >= 2, f"{perfil} has fewer than 2 assets"

    def test_porcentajes_are_positive(self):
        for template in PLANTILLAS_PORTAFOLIO.values():
            for activo in template["activos"]:
                assert Decimal(activo["porcentaje"]) > 0
