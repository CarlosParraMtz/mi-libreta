# Mi Libreta

Aplicación para que pequeños comercios administren fiados, apartados, pedidos, clientes y caja. Los datos autenticados se leen y escriben directamente en Firestore; no existen datos de demostración ni almacenamiento local como fuente de verdad.

## Desarrollo del frontend

```bash
npm install
npm run dev
```

Copia `.env.example` como `.env.local` y configura Firebase y `VITE_API_BASE_URL`.

## Firebase

1. Habilita **Correo/contraseña** y **Google** en Firebase Authentication.
2. Crea Cloud Firestore.
3. Publica `firestore.rules`.
4. Crea una cuenta de servicio para la Lambda y guarda su JSON únicamente como secreto de AWS.

Cada usuario tiene un perfil en `users/{uid}`. El campo `defaultBusinessId` señala la libreta activa y cada documento `businesses/{businessId}` contiene miembros, administradores, configuración, movimientos y estado de Stripe.

Una cuenta puede administrar varias libretas y cambiar la activa desde el selector del dashboard. El panel de plataforma también permite abrir cualquier libreta “como soporte” para trabajar directamente con sus clientes, pedidos, fiados, apartados y caja.

La API migra automáticamente el formato anterior `businesses/{uid}` la próxima vez que el usuario inicie sesión.

## AWS Lambda y Stripe

La implementación está en `backend/lambda`. Consulta su `README.md` para desplegarla con AWS SAM, configurar el correo administrador, Amazon SES, Stripe Checkout y el webhook.

Para que tu usuario sea administrador de plataforma, agrega el correo exacto con el que entras a Firebase en la variable `ADMIN_EMAILS` de la Lambda. Al volver a iniciar sesión se asignará el custom claim `admin` y aparecerá el panel `/admin`.

## Validación

```bash
npm run lint
npm run build
cd backend/lambda
npm run check
```
