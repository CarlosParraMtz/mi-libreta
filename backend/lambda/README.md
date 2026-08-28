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
- `ADMIN_USER_IDS`: UIDs de Firebase Authentication de los administradores de plataforma, separados por coma. Esta es la opción recomendada.
- `ADMIN_EMAILS`: compatibilidad temporal con la configuración anterior; puede dejarse vacío.
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
5. Copia tu UID desde **Firebase Authentication → Users**, vuelve a desplegar con ese valor en `AdminUserIds`, cierra sesión e inicia nuevamente. La Lambda asignará el custom claim `admin` y te llevará directamente a `/admin`.

## Modelo de libretas y pruebas

- Un usuario puede ser propietario o administrador de varias libretas.
- Una invitación agrega acceso exclusivamente a la libreta que la originó.
- Cada libreta tiene su propio cliente y suscripción de Stripe.
- Al crearla, la Lambda fija una prueba gratuita de 30 días que el navegador no puede modificar.
- Si el usuario configura Stripe durante la prueba, Checkout conserva únicamente los días restantes; no concede una segunda prueba.

No publiques el JSON de Firebase ni las claves de Stripe en el repositorio.
