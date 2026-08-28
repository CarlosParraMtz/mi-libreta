# Mi Libreta

Aplicación para que pequeños comercios administren fiados, apartados, pedidos, clientes y caja. Los datos autenticados se leen y escriben directamente en Firestore; no existen datos de demostración ni almacenamiento local como fuente de verdad.

## Desarrollo del frontend

```bash
npm install
npm run dev
```

Copia `.env.example` como `.env.local` y configura Firebase y `VITE_API_BASE_URL`.

## Publicación del frontend

El target de Firebase Hosting está configurado para `https://milibreta.web.app`.

```bash
npm run build
firebase deploy --only hosting:milibreta
```

Las rutas de React Router se resuelven mediante el rewrite de Hosting hacia `index.html`.

## Firebase

1. Habilita **Correo/contraseña** y **Google** en Firebase Authentication.
2. En **Authentication → Settings → Authorized domains**, confirma que aparezca `milibreta.web.app`.
3. Crea Cloud Firestore.
4. Publica `firestore.rules`.
5. Crea una cuenta de servicio para la Lambda y guarda su JSON únicamente como secreto de AWS.

Cada usuario tiene un perfil en `users/{uid}`. El campo `defaultBusinessId` señala la libreta activa y `businessIds` contiene únicamente las libretas que puede ver. Cada documento `businesses/{businessId}` tiene nombre, administradores propios, configuración, movimientos, 30 días de prueba y una suscripción de Stripe independiente.

Una cuenta puede administrar varias libretas y cambiar la activa desde el selector del dashboard. El panel de plataforma puede inspeccionar y configurar cualquier libreta sin agregar al administrador de plataforma como miembro ni mezclar sus datos con los de los usuarios.

La API migra automáticamente el formato anterior `businesses/{uid}` la próxima vez que el usuario inicie sesión.

## AWS Lambda y Stripe

La implementación está en `backend/lambda`. Consulta su `README.md` para desplegarla con AWS SAM, configurar el correo administrador, Amazon SES, Stripe Checkout y el webhook.

Para que tu usuario sea administrador de plataforma, copia su UID desde Firebase Authentication y agrégalo a `ADMIN_USER_IDS` en la Lambda. Al volver a iniciar sesión se asignará el custom claim `admin` y entrarás directamente a `/admin`. Una cuenta de plataforma no abre ninguna libreta como propia ni necesita formar parte de las que supervisa.

## Validación

```bash
npm run lint
npm run build
cd backend/lambda
npm run check
```
