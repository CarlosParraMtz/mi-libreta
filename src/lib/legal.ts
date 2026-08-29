const configured = (value: string | undefined, fallback: string) => value?.trim() || fallback

export const legalConfig = {
  responsibleName: configured(import.meta.env.VITE_LEGAL_RESPONSIBLE_NAME, '[Nombre o razón social pendiente]'),
  address: configured(import.meta.env.VITE_LEGAL_ADDRESS, '[Domicilio legal pendiente]'),
  privacyEmail: configured(import.meta.env.VITE_LEGAL_PRIVACY_EMAIL, '[Correo de privacidad pendiente]'),
  supportEmail: configured(import.meta.env.VITE_LEGAL_SUPPORT_EMAIL, '[Correo de soporte pendiente]'),
  phone: configured(import.meta.env.VITE_LEGAL_PHONE, '[Teléfono pendiente]'),
  taxId: configured(import.meta.env.VITE_LEGAL_TAX_ID, '[RFC pendiente]'),
  jurisdiction: configured(import.meta.env.VITE_LEGAL_JURISDICTION, '[Ciudad y estado pendientes]'),
  effectiveDate: configured(import.meta.env.VITE_LEGAL_EFFECTIVE_DATE, '29 de agosto de 2026'),
}

export const legalConfigurationPending = Object.values(legalConfig).some((value) => value.startsWith('['))

export const legalLinks = [
  { to: '/aviso-de-privacidad', label: 'Privacidad' },
  { to: '/terminos', label: 'Términos' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/pagos-y-cancelaciones', label: 'Pagos y cancelaciones' },
]
