import { LegalLayout, LegalSection } from '../components/LegalLayout'

export function Cookies() {
  return <LegalLayout eyebrow="Tecnologías del navegador" title="Política de cookies" summary="Mi Libreta utiliza almacenamiento local y tecnologías similares únicamente para iniciar sesión, proteger y operar la aplicación.">
    <LegalSection title="1. Qué tecnologías usamos"><p>Las cookies son archivos pequeños guardados por el navegador. También existen tecnologías similares, como almacenamiento local e IndexedDB. Firebase Authentication puede utilizarlas para recordar tu sesión y mantenerla segura; Stripe puede usar cookies propias cuando visitas su página de pago o portal de facturación.</p></LegalSection>
    <LegalSection title="2. Uso estrictamente necesario"><ul><li>Mantener la sesión iniciada y recordar la cuenta autenticada.</li><li>Proteger el acceso y prevenir abuso.</li><li>Conservar temporalmente el estado necesario para completar autenticación o pagos.</li><li>Recordar preferencias técnicas indispensables para mostrar la aplicación.</li></ul><p>Actualmente Mi Libreta no instala cookies propias de publicidad ni de analítica conductual.</p></LegalSection>
    <LegalSection title="3. Proveedores"><p>Google Firebase y Stripe pueden aplicar sus propias tecnologías bajo sus políticas. Al abrir Stripe, el tratamiento ocurre también en sus dominios. Consulta las políticas de esos proveedores desde sus sitios oficiales para conocer duración y controles específicos.</p></LegalSection>
    <LegalSection title="4. Cómo controlarlas"><p>Puedes borrar o bloquear cookies y almacenamiento desde la configuración de tu navegador. Si bloqueas tecnologías esenciales, es posible que no puedas iniciar sesión, mantener la sesión o completar pagos. Si incorporamos cookies opcionales en el futuro, solicitaremos tu elección antes de activarlas.</p></LegalSection>
  </LegalLayout>
}
