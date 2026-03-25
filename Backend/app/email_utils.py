import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings

from email.header import Header

def send_verification_email(user_email: str, token: str):
    # Si no hay credenciales configuradas, solo imprimimos en consola (ideal para desarrollo local temprano)
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print(f"\n[SIMULACIÓN DE EMAIL] Enviando a {user_email}\nEnlace: {settings.BACKEND_URL}/auth/verify?token={token}\n")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = str(Header(settings.SMTP_USERNAME or '', 'utf-8'))
        msg['To'] = str(Header(user_email, 'utf-8'))
        msg['Subject'] = str(Header("Aviso: Verifica tu cuenta en FitHealth", 'utf-8'))

        # URL del endpoint al que el usuario hará clic
        verify_url = f"{settings.BACKEND_URL}/auth/verify?token={token}"

        # Cuerpo del mensaje (sin tildes por ahora para probar)
        body = f"""
        <html>
            <body>
                <h2>Bienvenido a FitHealth</h2>
                <p>Gracias por registrarte. Solo queda un paso para empezar a usar la aplicacion.</p>
                <p>Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:</p>
                <br>
                <p><a href="{verify_url}" style="padding: 10px 20px; background-color: #0a7ea4; color: white; text-decoration: none; border-radius: 5px;">Verificar Mi Cuenta</a></p>
                <br>
                <p>Si el boton no funciona, pega este enlace en tu navegador:</p>
                <p>{verify_url}</p>
                <p>Si no te registraste en FitHealth, puedes ignorar este correo.</p>
            </body>
        </html>
        """
        
        # OJO: Pasamos '_charset' explícitamente al constructor de MIMEText
        # Esto fuerza que el payload sea base64 y correcto para UTF-8
        msg.attach(MIMEText(body, 'html', _charset='utf-8'))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
    except Exception as e:
        print(f"Error al enviar el email: {e}")
