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
const adminUserIds = new Set((process.env.ADMIN_USER_IDS || '').split(',').map((uid) => uid.trim()).filter(Boolean))
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
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
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
  return user.admin === true || adminUserIds.has(user.uid) || Boolean(user.email && adminEmails.has(user.email.toLowerCase()))
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
  const allowed = adminUserIds.has(user.uid) || Boolean(user.email && adminEmails.has(user.email.toLowerCase()))
  const account = await firebaseAuth.getUser(user.uid)
  if (!allowed) {
    if (account.customClaims?.admin === true) {
      const remainingClaims = { ...account.customClaims }
      delete remainingClaims.admin
      await firebaseAuth.setCustomUserClaims(user.uid, remainingClaims)
      await firestore.doc(`users/${user.uid}`).set({ platformAdmin: false, updatedAt: new Date().toISOString() }, { merge: true })
    }
    return { admin: false }
  }
  await firebaseAuth.setCustomUserClaims(user.uid, { ...(account.customClaims || {}), admin: true })
  await firestore.doc(`users/${user.uid}`).set({
    platformAdmin: true,
    defaultBusinessId: FieldValue.delete(),
    businessIds: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  }, { merge: true })
  return { admin: true }
}

async function syncLegacyProfile(user: DecodedIdToken) {
  if (isPlatformAdmin(user)) return { migrated: false, businessId: null, platformAdmin: true }
  const userRef = firestore.doc(`users/${user.uid}`)
  const profile = await userRef.get()
  if (profile.data()?.defaultBusinessId) {
    const businessId = String(profile.data()!.defaultBusinessId)
    const businessRef = firestore.doc(`businesses/${businessId}`)
    const business = await businessRef.get()
    const now = new Date()
    if (business.exists) {
      const data = business.data()!
      const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const updates: Record<string, unknown> = {}
      if (!data.ledgerName) updates.ledgerName = data.businessName || 'Mi libreta'
      if (!data.administrators) updates.administrators = [{ uid: user.uid, email: user.email || '', displayName: user.name || data.ownerName || '', role: 'owner', addedAt: data.createdAt || now.toISOString() }]
      if (!data.subscription?.trialEndsAt && !data.subscription?.stripeSubscriptionId) updates.subscription = { ...(data.subscription || {}), status: 'trialing', trialStartedAt: now.toISOString(), trialEndsAt, trialEndsAtMs: new Date(trialEndsAt).getTime(), accessOverride: data.subscription?.accessOverride ?? null }
      else if (data.subscription?.trialEndsAt && !data.subscription?.trialEndsAtMs) updates.subscription = { ...(data.subscription || {}), trialEndsAtMs: new Date(String(data.subscription.trialEndsAt)).getTime() }
      if (Object.keys(updates).length) await businessRef.set({ ...updates, updatedAt: now.toISOString() }, { merge: true })
    }
    await userRef.set({ businessIds: FieldValue.arrayUnion(businessId), updatedAt: now.toISOString() }, { merge: true })
    return { migrated: false, businessId }
  }
  const legacyRef = firestore.doc(`businesses/${user.uid}`)
  const legacy = await legacyRef.get()
  if (!legacy.exists) return { migrated: false, businessId: null }
  const now = new Date().toISOString()
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await legacyRef.set({ ledgerName: legacy.data()?.ledgerName || legacy.data()?.businessName || 'Mi libreta', ownerId: user.uid, adminIds: FieldValue.arrayUnion(user.uid), memberIds: FieldValue.arrayUnion(user.uid), administrators: [{ uid: user.uid, email: user.email || '', displayName: user.name || legacy.data()?.ownerName || '', role: 'owner', addedAt: legacy.data()?.createdAt || now }], onboardingComplete: true, subscription: { status: 'trialing', trialStartedAt: now, trialEndsAt, trialEndsAtMs: new Date(trialEndsAt).getTime(), accessOverride: null }, createdAt: legacy.data()?.createdAt || now, updatedAt: now }, { merge: true })
  await userRef.set({ email: user.email || '', displayName: user.name || '', defaultBusinessId: user.uid, businessIds: [user.uid], updatedAt: now }, { merge: true })
  return { migrated: true, businessId: user.uid }
}

async function createBusiness(user: DecodedIdToken, payload: Record<string, unknown>) {
  if (isPlatformAdmin(user)) throw httpError(403, 'Los administradores de plataforma no crean libretas propias.')
  const ledgerName = String(payload.ledgerName || '').trim()
  const businessName = String(payload.businessName || '').trim()
  const ownerName = String(payload.ownerName || user.name || '').trim()
  const businessType = String(payload.businessType || '').trim()
  const phone = String(payload.phone || '').trim()
  const allowedModules = new Set(['credits', 'layaways', 'cash', 'orders'])
  const enabledModules = Array.isArray(payload.enabledModules) ? payload.enabledModules.map(String).filter((item) => allowedModules.has(item)) : []
  if (!ledgerName || !businessName || !ownerName || !businessType || !enabledModules.length) throw httpError(400, 'Completa el nombre de la libreta, negocio, encargado, giro y al menos una herramienta.')
  const now = new Date()
  const nowIso = now.toISOString()
  const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const businessRef = firestore.collection('businesses').doc()
  const business = {
    ledgerName, businessName, ownerName, businessType, phone, enabledModules,
    ownerId: user.uid,
    adminIds: [user.uid],
    memberIds: [user.uid],
    administrators: [{ uid: user.uid, email: user.email || '', displayName: ownerName, role: 'owner', addedAt: nowIso }],
    onboardingComplete: true,
    subscription: { status: 'trialing', trialStartedAt: nowIso, trialEndsAt, trialEndsAtMs: new Date(trialEndsAt).getTime(), accessOverride: null },
    customers: [], orders: [], credits: [], layaways: [], cash: [],
    createdAt: nowIso, updatedAt: nowIso,
  }
  await firestore.runTransaction(async (transaction) => {
    transaction.create(businessRef, business)
    transaction.set(firestore.doc(`users/${user.uid}`), {
      email: user.email || '', displayName: ownerName,
      defaultBusinessId: businessRef.id,
      businessIds: FieldValue.arrayUnion(businessRef.id),
      createdAt: nowIso, updatedAt: nowIso,
    }, { merge: true })
  })
  return { business: { id: businessRef.id, ...business } }
}

async function createInvitation(user: DecodedIdToken, payload: Record<string, unknown>) {
  const businessId = String(payload.businessId || '')
  const email = String(payload.email || '').trim().toLowerCase()
  if (!businessId || !email) throw httpError(400, 'Faltan la libreta o el correo.')
  const { data: business } = await requireBusinessAdmin(user, businessId)

  try {
    const invited = await firebaseAuth.getUserByEmail(email)
    if (adminUserIds.has(invited.uid) || invited.customClaims?.admin === true || Boolean(invited.email && adminEmails.has(invited.email.toLowerCase()))) throw httpError(400, 'Un administrador de plataforma no se agrega a libretas particulares.')
    if ((business.adminIds || []).includes(invited.uid)) return { status: 'accepted', message: 'La persona ya administra esta libreta.' }
    const addedAt = new Date().toISOString()
    await firestore.runTransaction(async (transaction) => {
      const businessRef = firestore.doc(`businesses/${businessId}`)
      const userRef = firestore.doc(`users/${invited.uid}`)
      const userSnapshot = await transaction.get(userRef)
      transaction.update(businessRef, { adminIds: FieldValue.arrayUnion(invited.uid), memberIds: FieldValue.arrayUnion(invited.uid), administrators: FieldValue.arrayUnion({ uid: invited.uid, email, displayName: invited.displayName || '', role: 'admin', addedAt }), updatedAt: addedAt })
      transaction.set(userRef, { email, businessIds: FieldValue.arrayUnion(businessId), defaultBusinessId: userSnapshot.data()?.defaultBusinessId || businessId, updatedAt: addedAt }, { merge: true })
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
  if (isPlatformAdmin(user)) throw httpError(400, 'Los administradores de plataforma no se agregan a libretas particulares.')
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
    const addedAt = new Date().toISOString()
    transaction.update(businessRef, { adminIds: FieldValue.arrayUnion(user.uid), memberIds: FieldValue.arrayUnion(user.uid), administrators: FieldValue.arrayUnion({ uid: user.uid, email: user.email, displayName: user.name || '', role: 'admin', addedAt }), updatedAt: addedAt })
    transaction.set(userRef, { email: user.email, businessIds: FieldValue.arrayUnion(data.businessId), defaultBusinessId: profile.data()?.defaultBusinessId || data.businessId, updatedAt: new Date().toISOString() }, { merge: true })
    transaction.update(invite.ref, { status: 'accepted', acceptedBy: user.uid, acceptedAt: new Date().toISOString() })
  })
  return { businessId: data.businessId }
}

async function removeBusinessAdministrator(user: DecodedIdToken, businessId: string, administratorId: string) {
  const { snapshot, data } = await requireBusinessAdmin(user, businessId)
  if (administratorId === data.ownerId) throw httpError(400, 'No puedes quitar al propietario de la libreta.')
  if (!(data.adminIds || []).includes(administratorId)) throw httpError(404, 'Ese administrador no pertenece a la libreta.')
  const userRef = firestore.doc(`users/${administratorId}`)
  await firestore.runTransaction(async (transaction) => {
    const profile = await transaction.get(userRef)
    const remainingBusinessIds = ((profile.data()?.businessIds as string[] | undefined) || []).filter((id) => id !== businessId)
    const profileUpdates: Record<string, unknown> = { businessIds: remainingBusinessIds, updatedAt: new Date().toISOString() }
    if (profile.data()?.defaultBusinessId === businessId) profileUpdates.defaultBusinessId = remainingBusinessIds[0] || FieldValue.delete()
    transaction.update(snapshot.ref, {
      adminIds: FieldValue.arrayRemove(administratorId),
      memberIds: FieldValue.arrayRemove(administratorId),
      administrators: (data.administrators || []).filter((item: { uid?: string }) => item.uid !== administratorId),
      updatedAt: new Date().toISOString(),
    })
    transaction.set(userRef, profileUpdates, { merge: true })
  })
  return { removed: true }
}

async function checkout(user: DecodedIdToken, payload: Record<string, unknown>) {
  const businessId = String(payload.businessId || '')
  const { snapshot, data } = await requireBusinessAdmin(user, businessId)
  let customerId = data.subscription?.stripeCustomerId as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: data.businessName, metadata: { businessId, ownerId: data.ownerId } })
    customerId = customer.id
    await snapshot.ref.set({ subscription: { ...(data.subscription || {}), stripeCustomerId: customerId } }, { merge: true })
  }
  const trialEndsAt = data.subscription?.trialEndsAt ? new Date(String(data.subscription.trialEndsAt)).getTime() : 0
  const remainingTrialSeconds = Math.floor((trialEndsAt - Date.now()) / 1000)
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = { metadata: { businessId } }
  if (!data.subscription?.stripeSubscriptionId && remainingTrialSeconds >= 48 * 60 * 60) subscriptionData.trial_end = Math.floor(trialEndsAt / 1000)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', customer: customerId,
    line_items: [{ price: requiredEnv('STRIPE_PRICE_ID'), quantity: 1 }],
    success_url: `${appUrl}/dashboard/configuracion?checkout=success`,
    cancel_url: `${appUrl}/dashboard/configuracion?checkout=cancelled`,
    metadata: { businessId }, subscription_data: subscriptionData,
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
    'subscription.currentPeriodEndMs': periodEnd ? periodEnd * 1000 : null,
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
      updatedAt: new Date().toISOString(),
    })
  }
  return { received: true }
}

async function listBusinesses(user: DecodedIdToken) {
  await requirePlatformAdmin(user)
  const query = await firestore.collection('businesses').orderBy('createdAt', 'desc').limit(100).get()
  return { businesses: query.docs.map((item) => { const data = item.data(); return { id: item.id, ledgerName: data.ledgerName || data.businessName, businessName: data.businessName, ownerName: data.ownerName, businessType: data.businessType, createdAt: data.createdAt, subscription: data.subscription || { status: 'none' }, counts: { customers: data.customers?.length || 0, orders: data.orders?.length || 0, credits: data.credits?.length || 0, layaways: data.layaways?.length || 0 } } }) }
}

async function getBusiness(user: DecodedIdToken, businessId: string) {
  await requirePlatformAdmin(user)
  const snapshot = await firestore.doc(`businesses/${businessId}`).get()
  if (!snapshot.exists) throw httpError(404, 'La libreta no existe.')
  return { business: { id: snapshot.id, ...snapshot.data() } }
}

async function patchBusiness(user: DecodedIdToken, businessId: string, payload: Record<string, unknown>) {
  await requirePlatformAdmin(user)
  const allowed = ['ledgerName', 'businessName', 'ownerName', 'businessType', 'phone', 'enabledModules']
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
    if (path === '/businesses' && method === 'POST') return response(201, await createBusiness(user, body), origin)
    if (path === '/invitations' && method === 'POST') return response(200, await createInvitation(user, body), origin)
    if (path === '/invitations/accept' && method === 'POST') return response(200, await acceptInvitation(user, body), origin)
    if (path === '/billing/checkout' && method === 'POST') return response(200, await checkout(user, body), origin)
    if (path === '/billing/portal' && method === 'POST') return response(200, await billingPortal(user, body), origin)
    if (path === '/admin/businesses' && method === 'GET') return response(200, await listBusinesses(user), origin)
    const adminMatch = path.match(/^\/admin\/businesses\/([^/]+)$/)
    if (adminMatch && method === 'GET') return response(200, await getBusiness(user, adminMatch[1]), origin)
    if (adminMatch && method === 'PATCH') return response(200, await patchBusiness(user, adminMatch[1], body), origin)
    const administratorMatch = path.match(/^\/businesses\/([^/]+)\/administrators\/([^/]+)$/)
    if (administratorMatch && method === 'DELETE') return response(200, await removeBusinessAdministrator(user, administratorMatch[1], administratorMatch[2]), origin)
    const subscriptionMatch = path.match(/^\/admin\/businesses\/([^/]+)\/subscription$/)
    if (subscriptionMatch && method === 'POST') return response(200, await manageSubscription(user, subscriptionMatch[1], body), origin)
    return response(404, { error: 'Ruta no encontrada.' }, origin)
  } catch (error) {
    console.error(error)
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
    return response(status, { error: error instanceof Error ? error.message : 'Error interno.' }, origin)
  }
}
