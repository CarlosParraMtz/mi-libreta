export const authErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('invalid-credential')) return 'El correo o la contraseña no coinciden.'
  if (code.includes('email-already-in-use')) return 'Ese correo ya tiene una cuenta. Prueba iniciar sesión.'
  if (code.includes('weak-password')) return 'Usa una contraseña de al menos 6 caracteres.'
  if (code.includes('invalid-email')) return 'Escribe un correo válido.'
  if (code.includes('popup-closed')) return 'Cerraste la ventana de Google antes de terminar.'
  if (code.includes('too-many-requests')) return 'Hubo demasiados intentos. Espera un momento y vuelve a probar.'
  return 'No pudimos completar la solicitud. Inténtalo de nuevo.'
}
