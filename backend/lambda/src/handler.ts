import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createHash, randomBytes } from 'node:crypto'
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { type DecodedIdToken, getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import Stripe from 'stripe'

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n'))
  : null

if (!getApps().length) initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() })

const firestore = getFirestore()
const firebaseAuth = getAuth()
const stripe = new Stripe(requiredEnv('STRIPE_SECRET_KEY'))
const ses = new SESClient({})
const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
const adminEmails = new Set((process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable ${name}`)
  return value
}

function response(statusCode: number, body: unknown, origin = appUrl): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization,content-type,stripe-signature',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-credentials': 'true',
    },
    body: JSON.stringify(body),
  }
}

function parseBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  return JSON.parse(raw)
}

function rawBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return ''
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
}

async function currentUser(event: APIGatewayProxyEventV2) {
  const header = event.headers.authorization || event.headers.Authorization
  const token = header?.replace(/^Bearer\s+/i, '')
  if (!token) throw httpError(401, 'Inicia sesión para continuar.')
  return firebaseAuth.verifyIdToken(token)
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

function isPlatformAdmin(user: DecodedIdToken) {
  return user.admin === true || Boolean(user.email && adminEmails.has(user.email.toLowerCase()))
}

async function requirePlatformAdmin(user: DecodedIdToken) {
  if (!isPlatformAdmin(user)) throw httpError(403, 'No tienes permisos de administrador de plataforma.')
}

async function requireBusinessAdmin(user: DecodedIdToken, businessId: string) {
  const snapshot = await firestore.doc(`businesses/${businessId}`).get()
  if (!snapshot.exists) throw httpError(404, 'La libreta no existe.')
  const data = snapshot.data()!
  const allowed = isPlatformAdmin(user) || data.ownerId === user.uid || (data.adminIds || []).includes(user.uid)
  if (!allowed) throw httpError(403, 'No puedes administrar esta libreta.')
  return { snapshot, data }
}

async function sendInvitation(email: string, businessName: string, inviteUrl: string) {
  const from = process.env.SES_FROM_EMAIL
  if (!from) return false
  await ses.send(new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Charset: 'UTF-8', Data: `Te invitaron a administrar ${businessName}` },
      Body: {
        Html: { Charset: 'UTF-8', Data: `<h2>Te invitaron a Mi Libreta</h2><p>Ahora puedes ayudar a administrar <strong>${businessName}</strong>.</p><p><a href="${inviteUrl}">Aceptar invitación</a></p>` },
        Text: { Charset: 'UTF-8', Data: `Te invitaron a administrar ${businessName}. Acepta aquí: ${inviteUrl}` },
      },
    },
  }))
  return true
}

async function syncAdmin(user: DecodedIdToken) {
  const allowed = Boolean(user.email && adminEmails.has(user.email.toLowerCase()))
  if (!allowed) return { admin: user.admin === true }
  const account = await firebaseAuth.getUser(user.uid)
  await firebaseAuth.setCustomUserClaims(user.uid, { ...(account.customClaims || {}), admin: true })
  await firestore.doc(`users/${user.uid}`).set({ platformAdmin: true, updatedAt: new Date().toISOString() }, { merge: true })
  return { admin: true }
}

async function syncLegacyProfile(user: DecodedIdToken) {
  const userRef = firestore.doc(`users/${user.uid}`)
  const profile = await userRef.get()
  if (profile.data()?.defaultBusinessId) return { migrated: false, businessId: profile.data()!.defaultBusinessId }
  const legacyRef = firestore.doc(`businesses/${user.uid}`)
  const legacy = await legacyRef.get()
  if (!legacy.exists) return { migrated: false, businessId: null }
  const now = new Date().toISOString()
  await legacyRef.set({ ownerId: user.uid, adminIds: FieldValue.arrayUnion(user.uid), memberIds: FieldValue.arrayUnion(user.uid), onboardingComplete: true, subscription: { status: 'none', accessOverride: null }, createdAt: legacy.data()?.createdAt || now, updatedAt: now }, { merge: true })
  await userRef.set({ email: user.email || '', displayName: user.name || '', defaultBusinessId: user.uid, businessIds: [user.uid], updatedAt: now }, { merge: true })
  return { migrated: true, businessId: user.uid }
}

async function createInvitation(user: DecodedIdToken, payload: Record<string, unknown>) {
  const businessId = String(payload.businessId || '')
  const email = String(payload.email || '').trim().toLowerCase()
  if (!businessId || !email) throw httpError(400, 'Faltan la libreta o el correo.')
  const { data: business } = await requireBusinessAdmin(user, businessId)

  try {
    const invited = await firebaseAuth.getUserByEmail(email)
    await firestore.runTransaction(async (transaction) => {
      const businessRef = firestore.doc(`businesses/${businessId}`)
      const userRef = firestore.doc(`users/${invited.uid}`)
      const userSnapshot = await transaction.get(userRef)
      transaction.update(businessRef, { adminIds: FieldValue.arrayUnion(invited.uid), memberIds: FieldValue.arrayUnion(invited.uid), updatedAt: new Date().toISOString() })
      transaction.set(userRef, { email, businessIds: FieldValue.arrayUnion(businessId), defaultBusinessId: userSnapshot.data()?.defaultBusinessId || businessId, updatedAt: new Date().toISOString() }, { merge: true })
    })
    return { status: 'accepted', message: 'La persona ya tiene acceso a la libreta.' }
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (!code.includes('user-not-found')) throw error
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const inviteRef = firestore.collection('businessInvites').doc()
  const inviteUrl = `${appUrl}/aceptar-invitacion?token=${token}`
  await inviteRef.set({ businessId, businessName: business.businessName || 'Mi Libreta', email, role: 'admin', tokenHash, status: 'pending', invitedBy: user.uid, createdAt: new Date().toISOString() })
  const delivered = await sendInvitation(email, business.businessName || 'Mi Libreta', inviteUrl)
  return { status: 'pending', delivered, inviteUrl: delivered ? undefined : inviteUrl }
}

async function acceptInvitation(user: DecodedIdToken, payload: Record<string, unknown>) {
  const token = String(payload.token || '')
  if (!token || !user.email) throw httpError(400, 'La invitación no es válida.')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const query = await firestore.collection('businessInvites').where('tokenHash', '==', tokenHash).limit(1).get()
  if (query.empty) throw httpError(404, 'La invitación no existe o ya venció.')
  const invite = query.docs[0]
  const data = invite.data()
  if (data.status !== 'pending' || data.email !== user.email.toLowerCase()) throw httpError(403, 'Esta invitación pertenece a otro correo o ya fue usada.')
  await firestore.runTransaction(async (transaction) => {
    const businessRef = firestore.doc(`businesses/${data.businessId}`)
    const userRef = firestore.doc(`users/${user.uid}`)
    const profile = await transaction.get(userRef)
    transaction.update(businessRef, { adminIds: FieldValue.arrayUnion(user.uid), memberIds: FieldValue.arrayUnion(user.uid), updatedAt: new Date().toISOString() })
    transaction.set(userRef, { email: user.email, businessIds: FieldValue.arrayUnion(data.businessId), defaultBusinessId: profile.data()?.defaultBusinessId || data.businessId, updatedAt: new Date().toISOString() }, { merge: true })
    transaction.update(invite.ref, { status: 'accepted', acceptedBy: user.uid, acceptedAt: new Date().toISOString() })
  })
  return { businessId: data.businessId }
}

async function checkout(user: DecodedIdToken, payload: Record<string, unknown>) {
  const businessId = String(payload.businessId || '')
  const { snapshot, data } = await requireBusinessAdmin(user, businessId)
  let customerId = data.subscription?.stripeCustomerId as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: data.businessName, metadata: { businessId, ownerId: data.ownerId } })
    customerId = customer.id
    await snapshot.ref.set({ subscription: { ...(data.subscription || {}), status: 'none', stripeCustomerId: customerId } }, { merge: true })
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', customer: customerId,
    line_items: [{ price: requiredEnv('STRIPE_PRICE_ID'), quantity: 1 }],
    success_url: `${appUrl}/dashboard/configuracion?checkout=success`,
    cancel_url: `${appUrl}/dashboard/configuracion?checkout=cancelled`,
    metadata: { businessId }, subscription_data: { metadata: { businessId } },
    allow_promotion_codes: true,
  })
  return { url: session.url }
}

async function billingPortal(user: DecodedIdToken, payload: Record<string, unknown>) {
  const businessId = String(payload.businessId || '')
  const { data } = await requireBusinessAdmin(user, businessId)
  const customerId = data.subscription?.stripeCustomerId as string | undefined
  if (!customerId) throw httpError(400, 'La libreta todavía no tiene un cliente de Stripe.')
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl}/dashboard/configuracion` })
  return { url: session.url }
}

async function updateSubscriptionRecord(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata.businessId
  let businessRef = businessId ? firestore.doc(`businesses/${businessId}`) : null
  if (!businessRef) {
    const result = await firestore.collection('businesses').where('subscription.stripeCustomerId', '==', String(subscription.customer)).limit(1).get()
    businessRef = result.empty ? null : result.docs[0].ref
  }
  if (!businessRef) return
  const periodEnd = subscription.items.data[0]?.current_period_end
  await businessRef.update({
    'subscription.status': subscription.status,
    'subscription.stripeCustomerId': String(subscription.customer),
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.stripePriceId': subscription.items.data[0]?.price.id || '',
    'subscription.currentPeriodEnd': periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  })
}

async function stripeWebhook(event: APIGatewayProxyEventV2) {
  const signature = event.headers['stripe-signature']
  if (!signature) throw httpError(400, 'Falta la firma de Stripe.')
  const stripeEvent = stripe.webhooks.constructEvent(rawBody(event), signature, requiredEnv('STRIPE_WEBHOOK_SECRET'))
  if (stripeEvent.type.startsWith('customer.subscription.')) await updateSubscriptionRecord(stripeEvent.data.object as Stripe.Subscription)
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    if (session.metadata?.businessId) await firestore.doc(`businesses/${session.metadata.businessId}`).update({
      'subscription.stripeCustomerId': String(session.customer),
      'subscription.stripeSubscriptionId': String(session.subscription),
      'subscription.status': 'active',
      updatedAt: new Date().toISOString(),
    })
  }
  return { received: true }
}

async function listBusinesses(user: DecodedIdToken) {
  await requirePlatformAdmin(user)
  const query = await firestore.collection('businesses').orderBy('createdAt', 'desc').limit(100).get()
  return { businesses: query.docs.map((item) => { const data = item.data(); return { id: item.id, businessName: data.businessName, ownerName: data.ownerName, businessType: data.businessType, createdAt: data.createdAt, subscription: data.subscription || { status: 'none' }, counts: { customers: data.customers?.length || 0, orders: data.orders?.length || 0, credits: data.credits?.length || 0, layaways: data.layaways?.length || 0 } } }) }
}

async function getBusiness(user: DecodedIdToken, businessId: string) {
  await requirePlatformAdmin(user)
  const snapshot = await firestore.doc(`businesses/${businessId}`).get()
  if (!snapshot.exists) throw httpError(404, 'La libreta no existe.')
  return { business: { id: snapshot.id, ...snapshot.data() } }
}

async function patchBusiness(user: DecodedIdToken, businessId: string, payload: Record<string, unknown>) {
  await requirePlatformAdmin(user)
  const allowed = ['businessName', 'ownerName', 'businessType', 'phone', 'enabledModules']
  const updates = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)))
  await firestore.doc(`businesses/${businessId}`).set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true })
  return { updated: true }
}

async function manageSubscription(user: DecodedIdToken, businessId: string, payload: Record<string, unknown>) {
  await requirePlatformAdmin(user)
  const ref = firestore.doc(`businesses/${businessId}`)
  const snapshot = await ref.get()
  if (!snapshot.exists) throw httpError(404, 'La libreta no existe.')
  const data = snapshot.data()!
  const action = String(payload.action || '')
  const subscriptionId = data.subscription?.stripeSubscriptionId as string | undefined
  if (action === 'suspend') await ref.set({ subscription: { ...(data.subscription || {}), accessOverride: 'suspended' } }, { merge: true })
  else if (action === 'restore') await ref.set({ subscription: { ...(data.subscription || {}), accessOverride: null } }, { merge: true })
  else if (action === 'cancel' && subscriptionId) await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  else if (action === 'resume' && subscriptionId) await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })
  else throw httpError(400, 'La acción no es válida para esta suscripción.')
  return { updated: true }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const origin = event.headers.origin && event.headers.origin === appUrl ? event.headers.origin : appUrl
  if (event.requestContext.http.method === 'OPTIONS') return response(204, {}, origin)
  try {
    const path = event.rawPath
    const method = event.requestContext.http.method
    if (path === '/stripe/webhook' && method === 'POST') return response(200, await stripeWebhook(event), origin)
    const user = await currentUser(event)
    const body = parseBody(event) as Record<string, unknown>
    if (path === '/auth/sync-admin' && method === 'POST') return response(200, await syncAdmin(user), origin)
    if (path === '/auth/sync-profile' && method === 'POST') return response(200, await syncLegacyProfile(user), origin)
    if (path === '/invitations' && method === 'POST') return response(200, await createInvitation(user, body), origin)
    if (path === '/invitations/accept' && method === 'POST') return response(200, await acceptInvitation(user, body), origin)
    if (path === '/billing/checkout' && method === 'POST') return response(200, await checkout(user, body), origin)
    if (path === '/billing/portal' && method === 'POST') return response(200, await billingPortal(user, body), origin)
    if (path === '/admin/businesses' && method === 'GET') return response(200, await listBusinesses(user), origin)
    const adminMatch = path.match(/^\/admin\/businesses\/([^/]+)$/)
    if (adminMatch && method === 'GET') return response(200, await getBusiness(user, adminMatch[1]), origin)
    if (adminMatch && method === 'PATCH') return response(200, await patchBusiness(user, adminMatch[1], body), origin)
    const subscriptionMatch = path.match(/^\/admin\/businesses\/([^/]+)\/subscription$/)
    if (subscriptionMatch && method === 'POST') return response(200, await manageSubscription(user, subscriptionMatch[1], body), origin)
    return response(404, { error: 'Ruta no encontrada.' }, origin)
  } catch (error) {
    console.error(error)
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
    return response(status, { error: error instanceof Error ? error.message : 'Error interno.' }, origin)
  }
}
