"""Email sending via Resend. Fails gracefully when RESEND_API_KEY is not set."""
import logging

from config import settings

logger = logging.getLogger(__name__)


def _get_resend():
    try:
        import resend
        resend.api_key = settings.resend_api_key
        return resend
    except ImportError:
        logger.warning("resend package not installed — emails disabled")
        return None


def send_password_reset_email(to_email: str, nombre: str, reset_token: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping password reset email to %s", to_email)
        return False

    resend = _get_resend()
    if not resend:
        return False

    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f0f0f; color: #e5e5e5;">
      <h1 style="color: #f59e0b; font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
        &#9632; Tradex
      </h1>
      <p style="color: #999; font-size: 13px; margin-bottom: 24px;">Recuperación de contraseña</p>
      <p style="font-size: 14px; margin-bottom: 8px;">Hola {nombre},</p>
      <p style="font-size: 14px; color: #999; margin-bottom: 24px;">
        Recibimos una solicitud para restablecer tu contraseña. El enlace es válido por 1 hora.
      </p>
      <a href="{reset_url}"
         style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px;
                font-family: monospace; font-size: 13px; font-weight: bold; text-transform: uppercase;
                letter-spacing: 0.08em; text-decoration: none;">
        RESTABLECER CONTRASEÑA
      </a>
      <p style="font-size: 12px; color: #555; margin-top: 24px;">
        Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Tradex <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Restablece tu contraseña — Tradex",
            "html": html,
        })
        return True
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)
        return False


def send_verification_email(to_email: str, nombre: str, verification_token: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping verification email to %s", to_email)
        return False

    resend = _get_resend()
    if not resend:
        return False

    verify_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
    html = f"""
    <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f0f0f; color: #e5e5e5;">
      <h1 style="color: #f59e0b; font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
        &#9632; Tradex
      </h1>
      <p style="color: #999; font-size: 13px; margin-bottom: 24px;">Verificación de correo</p>
      <p style="font-size: 14px; margin-bottom: 8px;">Hola {nombre},</p>
      <p style="font-size: 14px; color: #999; margin-bottom: 24px;">
        Confirma tu correo para activar tu cuenta. El enlace es válido por 24 horas.
      </p>
      <a href="{verify_url}"
         style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px;
                font-family: monospace; font-size: 13px; font-weight: bold; text-transform: uppercase;
                letter-spacing: 0.08em; text-decoration: none;">
        VERIFICAR CORREO
      </a>
      <p style="font-size: 12px; color: #555; margin-top: 24px;">
        Si no creaste esta cuenta, ignora este correo.
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Tradex <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Verifica tu correo — Tradex",
            "html": html,
        })
        return True
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc)
        return False


def send_welcome_email(to_email: str, nombre: str) -> bool:
    if not settings.resend_api_key:
        return False

    resend = _get_resend()
    if not resend:
        return False

    login_url = f"{settings.frontend_url}/login"
    html = f"""
    <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f0f0f; color: #e5e5e5;">
      <h1 style="color: #f59e0b; font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
        &#9632; Tradex
      </h1>
      <p style="color: #999; font-size: 13px; margin-bottom: 24px;">Simulador educativo de inversión</p>
      <p style="font-size: 14px; margin-bottom: 8px;">Hola {nombre},</p>
      <p style="font-size: 14px; color: #999; margin-bottom: 24px;">
        ¡Tu cuenta ha sido creada exitosamente! Ya puedes acceder al simulador y comenzar a invertir.
      </p>
      <a href="{login_url}"
         style="display: inline-block; background: #f59e0b; color: #000; padding: 12px 24px;
                font-family: monospace; font-size: 13px; font-weight: bold; text-transform: uppercase;
                letter-spacing: 0.08em; text-decoration: none;">
        INICIAR SESIÓN
      </a>
    </div>
    """

    try:
        resend.Emails.send({
            "from": "Tradex <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Bienvenido a Tradex",
            "html": html,
        })
        return True
    except Exception as exc:
        logger.error("Failed to send welcome email to %s: %s", to_email, exc)
        return False
