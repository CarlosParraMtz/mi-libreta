# API Lambda de Mi Libreta

Una sola Lambda atiende:

- sincronización del administrador principal;
- migración del formato anterior de Firestore;
- invitaciones y aceptación de administradores compartidos;
- correos de invitación con Amazon SES;
- listado y configuración de libretas desde el panel administrativo;
- Stripe Checkout, Customer Portal y webhook;
- suspensión, restauración y cancelación programada de suscripciones.

## Variables requeridas

- `APP_URL`: URL pública del frontend. Para producción usa `https://milibreta.web.app`.
- `ADMIN_EMAILS`: correos de administradores de plataforma separados por coma. Agrega aquí tu correo.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON completo de una cuenta de servicio de Firebase.
- `STRIPE_SECRET_KEY`: clave secreta de Stripe.
- `STRIPE_WEBHOOK_SECRET`: secreto del endpoint webhook.
- `STRIPE_PRICE_ID`: identificador `price_...` del precio mensual.
- `SES_FROM_EMAIL`: remitente verificado en Amazon SES. Si se omite, la app devuelve un enlace para compartir manualmente.

## Publicación

```bash
npm install
npm run build
sam build
sam deploy --guided
```

Después del despliegue:

1. Copia `ApiUrl` a `VITE_API_BASE_URL` del frontend.
2. En Stripe crea un webhook hacia `ApiUrl/stripe/webhook`.
3. Suscribe los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
4. Copia el signing secret resultante a `STRIPE_WEBHOOK_SECRET` y vuelve a desplegar.
5. Cierra sesión e inicia nuevamente con un correo incluido en `ADMIN_EMAILS`; la Lambda asignará el custom claim `admin`.

No publiques el JSON de Firebase ni las claves de Stripe en el repositorio.
