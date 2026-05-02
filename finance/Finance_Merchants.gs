// ════════════════════════════════════════════════════════════════════
// 🏪 Finance_Merchants.gs — SMART MERCHANT DATABASE v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   Eliminates the #1 transaction logging error class:
//   wrong PRA flag, wrong category, wrong account.
//
//   When you log a transaction (via /intl, Quick Entry, or bank
//   reconciler), system looks up the merchant by name → applies
//   correct profile automatically:
//     - default account
//     - default category
//     - PRA tax flag (yes/no)
//     - FX fee flag (intl vs domestic)
//
//   Closes Bug 2 (phantom PRA on YouTube) permanently.
//
// PUBLIC API:
//   - lookupMerchant(name)       → returns profile or null
//   - learnMerchant(name, prof)  → save user-added merchant
//   - listMerchants()            → see what system knows
//   - cmdMerchantAdd(args)       → Telegram /merchant add
// ════════════════════════════════════════════════════════════════════

const FIN_MERCH_LEARNED_KEY = 'fin2_merchant_learned';

// ─── 50+ pre-mapped merchants ───
// account: where it usually charges
// category: default category in FIN2_CATEGORIES
// pra: 5% PRA IT Tax (Punjab, applies to specific intl services)
// fxFee: 4.5% Foreign Transaction Fee (intl only)
// excise: 16% on FX fee (always true if fxFee true)
// advTax: 5% Adv Tax 236Y (always true if fxFee true)
const FIN_MERCH_HARDCODED = {
  // ═══════════════════════════════════════════════════
  // 🌐 INTERNATIONAL SUBSCRIPTIONS (FX fees apply)
  // ═══════════════════════════════════════════════════

  // ─── Google services (NO PRA) ───
  'youtube':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'youtube premium':{ account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'youtube music':  { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'google one':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'google':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'google ads':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'google play':    { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'gcp':            { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google Cloud · no PRA' },
  'google cloud':   { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'google workspace': { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google · no PRA' },
  'gemini':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Google AI · no PRA' },

  // ─── Streaming/entertainment (PRA YES) ───
  'netflix':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'spotify':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'disney':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'disney+':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'apple music':    { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'apple tv':       { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'apple':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'icloud':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'Apple cloud · PRA' },
  'hbo':            { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'hulu':           { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'amazon prime':   { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'crunchyroll':    { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'tidal':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },

  // ─── AI tools (PRA YES) ───
  'openai':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'chatgpt':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'anthropic':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'claude':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'midjourney':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'perplexity':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'cursor':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'elevenlabs':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'replit':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'huggingface':    { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },

  // ─── Dev/cloud infra (NO PRA) ───
  'github':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'aws':            { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'amazon web services': { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'cloudflare':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'digitalocean':   { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'vercel':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'netlify':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'heroku':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'linode':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'azure':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Infra · no PRA' },
  'mongodb':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'supabase':       { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },

  // ─── Microsoft / productivity (PRA YES) ───
  'microsoft':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'office 365':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'office':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'notion':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'figma':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'canva':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'adobe':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'creative cloud': { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'Adobe · PRA' },
  'dropbox':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'evernote':       { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'slack':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'zoom':           { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'linkedin':       { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'grammarly':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },

  // ─── Online learning (PRA YES) ───
  'udemy':          { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'coursera':       { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'edx':            { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'pluralsight':    { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'masterclass':    { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'skillshare':     { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'datacamp':       { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'duolingo':       { account: 'Alfalah CC', category: '📚 Learning', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },

  // ─── Other intl services ───
  'fiverr':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'upwork':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'shopify':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'shutterstock':   { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'envato':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'namecheap':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Domain · no PRA' },
  'godaddy':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true, intl: true, notes: 'Domain · no PRA' },
  'tailscale':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'PRA applies' },
  'nordvpn':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'VPN · PRA' },
  'expressvpn':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true, fxFee: true, intl: true, notes: 'VPN · PRA' },

  // ═══════════════════════════════════════════════════
  // 🍔 LOCAL FOOD DELIVERY (PKR · no FX)
  // ═══════════════════════════════════════════════════
  'foodpanda':      { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Food delivery' },
  'cheetay':        { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Food delivery' },
  'eat mubarak':    { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Food delivery' },
  'kfc':            { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Fast food' },
  'mcdonalds':      { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Fast food' },
  "mcdonald's":     { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Fast food' },
  'pizza hut':      { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Pizza chain' },
  'dominos':        { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Pizza chain' },
  'subway':         { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Sub chain' },
  'hardees':        { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Burger chain' },
  'burger king':    { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Burger chain' },
  'optp':           { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'OPTP local' },
  'johnny and jugnu': { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local food' },
  'salt n pepper':  { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },
  'monal':          { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },
  'cafe aylanto':   { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },
  'arcadian':       { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },
  'cinnabon':       { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Bakery' },
  'gloria jeans':   { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  'second cup':     { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  'dunkin':         { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  "dunkin'":        { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  "dunkin' donuts": { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  'tim hortons':    { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Coffee chain' },
  'haleem ghar':    { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local food' },
  'student biryani':{ account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local food' },
  'bbq tonight':    { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },
  'kababjees':      { account: 'Alfalah CC', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Restaurant' },

  // ═══════════════════════════════════════════════════
  // 🚗 TRANSPORT (PKR · no FX)
  // ═══════════════════════════════════════════════════
  'careem':         { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Ride hailing' },
  'uber':           { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Ride hailing' },
  'indrive':        { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Ride hailing' },
  'in drive':       { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Ride hailing' },
  'bykea':          { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Bike hailing' },
  'yango':          { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Ride hailing' },
  'swyft':          { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Bus' },
  'airlift':        { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Bus (defunct)' },
  'daewoo':         { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Intercity bus' },
  'speedo':         { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Bus' },
  'metro bus':      { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Public transit' },
  'orange line':    { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Public transit' },
  'pso':            { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },
  'shell':          { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },
  'total parco':    { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },
  'attock petroleum': { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },
  'go fuel':        { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },
  'caltex':         { account: 'Cash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Fuel' },

  // ═══════════════════════════════════════════════════
  // 👕 SHOPPING (PKR · no FX)
  // ═══════════════════════════════════════════════════
  'daraz':          { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Marketplace' },
  'priceoye':       { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Electronics' },
  'telemart':       { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Electronics' },
  'dawlance':       { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Appliances' },
  'haier':          { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Appliances' },
  'symbios':        { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Electronics' },
  'czone':          { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'PC parts' },
  'ishopping':      { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Shopping' },
  'goto':           { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Shopping' },
  'naheed':         { account: 'Alfalah CC', category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery online' },
  'krave mart':     { account: 'Alfalah CC', category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery online' },
  'panda mart':     { account: 'Alfalah CC', category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery online' },
  'imtiaz':         { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery store' },
  'metro':          { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery store' },
  'al fatah':       { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery store' },
  'hyperstar':      { account: 'Alfalah CC', category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Hypermarket' },
  'carrefour':      { account: 'Alfalah CC', category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Hypermarket' },
  'chase up':       { account: 'Cash',       category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'gul ahmed':      { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'khaadi':         { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'sapphire':       { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'nishat linen':   { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'breakout':       { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'outfitters':     { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'beechtree':      { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'maria b':        { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'bonanza':        { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Apparel' },
  'minnie minors':  { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Kids apparel' },
  'borjan':         { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Footwear' },
  'service shoes':  { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Footwear' },
  'metro shoes':    { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Footwear' },

  // ═══════════════════════════════════════════════════
  // 📞 TELECOM
  // ═══════════════════════════════════════════════════
  'zong':           { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },
  'jazz':           { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },
  'telenor':        { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },
  'ufone':          { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },
  'warid':          { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },
  'scom':           { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile' },

  // ═══════════════════════════════════════════════════
  // 🌐 INTERNET ISPs
  // ═══════════════════════════════════════════════════
  'ptcl':           { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'nayatel':        { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'storm fiber':    { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'transworld':     { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'wateen':         { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'fiberlink':      { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'cybernet':       { account: 'Meezan', category: '🌐 Internet', pra: false, fxFee: false, intl: false, notes: 'ISP' },
  'starlink':       { account: 'Alfalah CC', category: '🌐 Internet', pra: false, fxFee: true, intl: true, notes: 'Sat ISP intl' },

  // ═══════════════════════════════════════════════════
  // 🏠 UTILITIES
  // ═══════════════════════════════════════════════════
  'lesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Lahore electricity' },
  'iesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Islamabad electricity' },
  'k-electric':     { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Karachi electricity' },
  'kelectric':      { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Karachi electricity' },
  'gepco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Gujranwala electricity' },
  'mepco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Multan electricity' },
  'fesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Faisalabad electricity' },
  'pesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Peshawar electricity' },
  'qesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Quetta electricity' },
  'tesco':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Tribal area electricity' },
  'sui northern':   { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Gas Punjab/KPK' },
  'sngpl':          { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Gas Punjab/KPK' },
  'sui southern':   { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Gas Sindh/Balochistan' },
  'ssgc':           { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Gas Sindh/Balochistan' },
  'wasa':           { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Water utility' },
  'kwsb':           { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Karachi water' },

  // ═══════════════════════════════════════════════════
  // 💊 HEALTH
  // ═══════════════════════════════════════════════════
  'shaukat khanum': { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'aga khan':       { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'aku':            { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Aga Khan Univ' },
  'liaquat national': { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'doctors hospital': { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'hameed latif':   { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'national hospital': { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'chughtai lab':   { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'chughtai':       { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'idc':            { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'excel labs':     { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'agha khan lab':  { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'sehat sahulat':  { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Health card' },
  'sehat kahani':   { account: 'Meezan', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Telehealth' },
  'pharmacy':       { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Medicine' },
  'd watson':       { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Pharmacy' },
  'fazal din':      { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Pharmacy' },
  'dvago':          { account: 'JazzCash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Online pharmacy' },
  'sehat':          { account: 'JazzCash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Online pharmacy' },
  'oladoc':         { account: 'JazzCash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Doctor booking' },
  'marham':         { account: 'JazzCash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Doctor booking' },
  'insulin':        { account: 'Cash', category: '💊 Health', pra: false, fxFee: false, intl: false, notes: 'Medicine for family' },

  // ═══════════════════════════════════════════════════
  // 🏦 BANK FEES & SERVICES
  // ═══════════════════════════════════════════════════
  '1-biller':       { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC fee' },
  '1biller':        { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC fee' },
  'biller':         { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC fee' },
  'easypaisa':      { account: 'Easypaisa', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Wallet fee' },
  'ift':            { account: 'Meezan', category: '💱 Transfer', pra: false, fxFee: false, intl: false, notes: 'Inter-bank transfer' },
  'iban':           { account: 'Meezan', category: '💱 Transfer', pra: false, fxFee: false, intl: false, notes: 'Account transfer' },
  'raast':          { account: 'Meezan', category: '💱 Transfer', pra: false, fxFee: false, intl: false, notes: 'SBP instant transfer' },

  // ═══════════════════════════════════════════════════
  // 🏛️ GOVERNMENT
  // ═══════════════════════════════════════════════════
  'fbr':            { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Federal tax' },
  'pra':            { account: 'Meezan', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Punjab revenue' },
  'nadra':          { account: 'Cash', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'CNIC/passport' },
  'passport':       { account: 'Cash', category: '🏠 Bills', pra: false, fxFee: false, intl: false, notes: 'Passport office' },
  'excise':         { account: 'Meezan', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Vehicle tax' },
  'token tax':      { account: 'Meezan', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Vehicle tax' },
  'mtmis':          { account: 'Meezan', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Vehicle registration' },

  // ═══════════════════════════════════════════════════
  // 🎓 EDUCATION
  // ═══════════════════════════════════════════════════
  'lums':           { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'iba':            { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'fast':           { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'nust':           { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'comsats':        { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'pu':             { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'Punjab University' },
  'uet':            { account: 'Meezan', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'University' },
  'fbise':          { account: 'Cash', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'Federal board' },
  'bise':           { account: 'Cash', category: '📚 Learning', pra: false, fxFee: false, intl: false, notes: 'Board' },

  // ═══════════════════════════════════════════════════
  // 🎁 SADQAH/CHARITY
  // ═══════════════════════════════════════════════════
  'edhi':           { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'shahid afridi':  { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'transparent hands': { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'akhuwat':        { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'al-shifa':       { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'lrbt':           { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'alkhidmat':      { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'shaukat khanum donation': { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Hospital charity' },
  'jdc':            { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' },
  'saylani':        { account: 'Meezan', category: '🎁 Sadqah/Zakat', pra: false, fxFee: false, intl: false, notes: 'Charity' }
};

const FIN_MERCH_HARDCODED_ORIGINAL = {
  // ─── Google services (NO PRA per user memory) ───
  'youtube':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google service · no PRA' },
  'youtube premium':{ account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google service · no PRA' },
  'google one':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google service · no PRA' },
  'google':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google service · no PRA' },
  'google ads':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google service · no PRA' },
  'gcp':            { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Google Cloud · no PRA' },

  // ─── Streaming + entertainment (PRA YES) ───
  'netflix':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'spotify':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'disney':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'disney+':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'apple music':    { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'apple tv':       { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },

  // ─── AI tools (PRA YES) ───
  'openai':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'chatgpt':        { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'anthropic':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'claude':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'midjourney':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'perplexity':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'cursor':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },

  // ─── Dev tools (mixed PRA) ───
  'github':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'No PRA per user memory' },
  'aws':            { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'No PRA per user memory' },
  'vercel':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'cloudflare':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Infrastructure · no PRA' },
  'digitalocean':   { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: false, fxFee: true,  intl: true,  notes: 'Infrastructure · no PRA' },

  // ─── Microsoft / productivity ───
  'microsoft':      { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'office 365':     { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'notion':         { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'figma':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },
  'canva':          { account: 'Alfalah CC', category: '🌐 Intl Subscription', pra: true,  fxFee: true,  intl: true,  notes: 'PRA applies' },

  // ─── Local food delivery (PKR · no FX) ───
  'foodpanda':      { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },
  'cheetay':        { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },
  'eat mubarak':    { account: 'JazzCash', category: '🍔 Food', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },

  // ─── Local transport (PKR · no FX) ───
  'careem':         { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },
  'uber':           { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },
  'indrive':        { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },
  'bykea':          { account: 'JazzCash', category: '🚗 Transport', pra: false, fxFee: false, intl: false, notes: 'Local · no fees' },

  // ─── Local shopping ───
  'daraz':          { account: 'Alfalah CC', category: '👕 Personal',  pra: false, fxFee: false, intl: false, notes: 'Local CC' },
  'priceoye':       { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Local CC' },
  'telemart':       { account: 'Alfalah CC', category: '📱 Tech',      pra: false, fxFee: false, intl: false, notes: 'Local CC' },
  'imtiaz':         { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery cash' },
  'metro':          { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery cash' },
  'al fatah':       { account: 'Cash',       category: '🍔 Food',      pra: false, fxFee: false, intl: false, notes: 'Grocery cash' },

  // ─── Telecom / utilities ───
  'zong':           { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile bill' },
  'jazz':           { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile bill' },
  'telenor':        { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile bill' },
  'ufone':          { account: 'JazzCash', category: '📞 Mobile Plan', pra: false, fxFee: false, intl: false, notes: 'Mobile bill' },
  'ptcl':           { account: 'Meezan',   category: '🌐 Internet',    pra: false, fxFee: false, intl: false, notes: 'Internet bill' },
  'nayatel':        { account: 'Meezan',   category: '🌐 Internet',    pra: false, fxFee: false, intl: false, notes: 'Internet bill' },
  'storm fiber':    { account: 'Meezan',   category: '🌐 Internet',    pra: false, fxFee: false, intl: false, notes: 'Internet bill' },
  'transworld':     { account: 'Meezan',   category: '🌐 Internet',    pra: false, fxFee: false, intl: false, notes: 'Internet bill' },
  'lesco':          { account: 'Meezan',   category: '🏠 Bills',       pra: false, fxFee: false, intl: false, notes: 'Electricity bill' },
  'sui northern':   { account: 'Meezan',   category: '🏠 Bills',       pra: false, fxFee: false, intl: false, notes: 'Gas bill' },
  'sngpl':          { account: 'Meezan',   category: '🏠 Bills',       pra: false, fxFee: false, intl: false, notes: 'Gas bill' },
  'wasa':           { account: 'Meezan',   category: '🏠 Bills',       pra: false, fxFee: false, intl: false, notes: 'Water bill' },

  // ─── Health ───
  'shaukat khanum': { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'aga khan':       { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Hospital' },
  'chughtai lab':   { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Lab tests' },
  'sehat sahulat':  { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Health' },
  'pharmacy':       { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Medicine' },
  'insulin':        { account: 'Cash',     category: '💊 Health',      pra: false, fxFee: false, intl: false, notes: 'Medicine for family' },

  // ─── Bank fees ───
  '1-biller':       { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC payment fee' },
  '1biller':        { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC payment fee' },
  'biller':         { account: 'Alfalah CC', category: '🏦 Biller Charge', pra: false, fxFee: false, intl: false, notes: 'Cross-bank CC payment fee' }
};

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _merchAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _merchLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _merchNormalize(name) {
  if (!name) return '';
  return String(name).toLowerCase().trim().replace(/\s+/g, ' ');
}

function _getLearnedMerchants() {
  try {
    const raw = PropertiesService.getDocumentProperties().getProperty(FIN_MERCH_LEARNED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function _saveLearnedMerchants(map) {
  try {
    PropertiesService.getDocumentProperties().setProperty(FIN_MERCH_LEARNED_KEY, JSON.stringify(map));
    return true;
  } catch(e) { return false; }
}

// ──────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────

/**
 * Lookup a merchant by name. Returns profile object or null.
 * Checks learned DB first, then hardcoded.
 * Supports partial matching (e.g. "youtube premium subscription" → matches "youtube premium").
 */
function lookupMerchant(name) {
  const key = _merchNormalize(name);
  if (!key) return null;

  // Check learned first (user overrides hardcoded)
  const learned = _getLearnedMerchants();
  if (learned[key]) return _withSource(learned[key], 'learned');

  // Exact hardcoded match
  if (FIN_MERCH_HARDCODED[key]) return _withSource(FIN_MERCH_HARDCODED[key], 'hardcoded');

  // Partial match — find longest hardcoded key that's contained in input
  let bestMatch = null;
  let bestLen = 0;
  Object.keys(FIN_MERCH_HARDCODED).forEach(hkey => {
    if (key.indexOf(hkey) !== -1 && hkey.length > bestLen) {
      bestMatch = FIN_MERCH_HARDCODED[hkey];
      bestLen = hkey.length;
    }
  });
  if (bestMatch) return _withSource(bestMatch, 'hardcoded-partial');

  // Partial match in learned
  Object.keys(learned).forEach(lkey => {
    if (key.indexOf(lkey) !== -1 && lkey.length > bestLen) {
      bestMatch = learned[lkey];
      bestLen = lkey.length;
    }
  });
  if (bestMatch) return _withSource(bestMatch, 'learned-partial');

  return null;
}

function _withSource(profile, source) {
  return Object.assign({}, profile, { _source: source });
}

/**
 * Save a user-defined merchant profile.
 * profile shape: { account, category, pra, fxFee, intl, notes }
 */
function learnMerchant(name, profile) {
  const key = _merchNormalize(name);
  if (!key) return { ok: false, error: 'empty_name' };

  const learned = _getLearnedMerchants();
  learned[key] = {
    account:  profile.account  || 'Alfalah CC',
    category: profile.category || '🎯 Other',
    pra:      profile.pra      === true,
    fxFee:    profile.fxFee    === true,
    intl:     profile.intl     === true,
    notes:    profile.notes    || 'User-added'
  };
  const ok = _saveLearnedMerchants(learned);
  if (ok) _merchLog('MERCHANT_LEARNED', key + ' · ' + JSON.stringify(learned[key]));
  return { ok: ok, key: key, profile: learned[key] };
}

/**
 * List all known merchants (hardcoded + learned).
 */
function listMerchants() {
  const learned = _getLearnedMerchants();
  const hardKeys = Object.keys(FIN_MERCH_HARDCODED);
  const learnedKeys = Object.keys(learned);
  return {
    hardcodedCount: hardKeys.length,
    learnedCount: learnedKeys.length,
    totalCount: hardKeys.length + learnedKeys.length,
    hardcoded: hardKeys.sort(),
    learned: learnedKeys.sort()
  };
}

/**
 * UI: show all merchants in popup.
 */
function showMerchantsList() {
  const stats = listMerchants();
  let msg = '🏪 MERCHANT DATABASE\n\n';
  msg += 'Hardcoded: ' + stats.hardcodedCount + '\n';
  msg += 'Learned: ' + stats.learnedCount + '\n';
  msg += 'Total: ' + stats.totalCount + '\n\n';

  msg += '── HARDCODED (built-in) ──\n';
  stats.hardcoded.slice(0, 30).forEach(k => {
    const p = FIN_MERCH_HARDCODED[k];
    msg += '• ' + k + ' → ' + p.category + (p.intl ? ' (intl)' : '') + (p.pra ? ' +PRA' : '') + '\n';
  });
  if (stats.hardcoded.length > 30) msg += '... +' + (stats.hardcoded.length - 30) + ' more\n';

  if (stats.learnedCount > 0) {
    msg += '\n── LEARNED (your custom) ──\n';
    const learned = _getLearnedMerchants();
    stats.learned.forEach(k => {
      const p = learned[k];
      msg += '• ' + k + ' → ' + p.category + (p.intl ? ' (intl)' : '') + (p.pra ? ' +PRA' : '') + '\n';
    });
  }
  _merchAlert(msg);
}

// ──────────────────────────────────────────────────────────
// TELEGRAM /merchant COMMAND
// ──────────────────────────────────────────────────────────

function cmdMerchantAdd(args) {
  const parts = (args || '').split(' ').filter(p => p.length > 0);
  if (parts.length < 2) {
    if (typeof sendTelegram === 'function') {
      sendTelegram('How to add a merchant:\n\n' +
        '/merchant add netflix +pra cc\n' +
        '/merchant add daraz cc personal\n' +
        '/merchant add foodpanda jazzcash food\n' +
        '/merchant lookup youtube\n' +
        '/merchant list\n\n' +
        'Flags: +pra (5% PRA tax), +intl (FX fees apply)\n' +
        'Accounts: cash · jazzcash · easypaisa · ubl · meezan · cc');
    }
    return;
  }

  const action = parts[0].toLowerCase();

  if (action === 'list') {
    const stats = listMerchants();
    if (typeof sendTelegram === 'function') {
      sendTelegram('🏪 ' + stats.totalCount + ' merchants known (' + stats.hardcodedCount + ' built-in + ' + stats.learnedCount + ' learned). Open sheet → 🎛️ Sovereign → 🏪 Merchants for full list.');
    }
    return;
  }

  if (action === 'lookup') {
    const name = parts.slice(1).join(' ');
    const p = lookupMerchant(name);
    if (typeof sendTelegram === 'function') {
      if (p) {
        sendTelegram('🏪 ' + name + '\n\n' +
          'Account: ' + p.account + '\n' +
          'Category: ' + p.category + '\n' +
          'PRA: ' + (p.pra ? 'yes' : 'no') + '\n' +
          'FX Fee: ' + (p.fxFee ? 'yes' : 'no') + '\n' +
          'Source: ' + p._source);
      } else {
        sendTelegram('🤷 ' + name + ' not in database. Add it: /merchant add ' + name + ' [account] [category] [+pra] [+intl]');
      }
    }
    return;
  }

  if (action === 'add') {
    const remaining = parts.slice(1);
    let pra = false, intl = false;
    let filtered = [];
    remaining.forEach(p => {
      if (p === '+pra') pra = true;
      else if (p === '+intl') intl = true;
      else filtered.push(p);
    });

    const name = filtered[0];
    const acctInput = (filtered[1] || 'cc').toLowerCase();
    const catInput = filtered.slice(2).join(' ') || 'other';

    const ACCOUNT_MAP = {
      'cash': 'Cash', 'jazzcash': 'JazzCash', 'jazz': 'JazzCash',
      'easypaisa': 'Easypaisa', 'easy': 'Easypaisa',
      'ubl': 'UBL', 'meezan': 'Meezan', 'mz': 'Meezan',
      'mashreq': 'Mashreq Bank', 'js': 'JS Bank',
      'naya': 'Naya Pay', 'alfalah': 'Bank Alfalah',
      'cc': 'Alfalah CC'
    };

    const CATEGORY_MAP = {
      'food': '🍔 Food', 'transport': '🚗 Transport', 'bills': '🏠 Bills',
      'health': '💊 Health', 'learning': '📚 Learning', 'personal': '👕 Personal',
      'tech': '📱 Tech', 'family': '💝 Family', 'sadqah': '🎁 Sadqah/Zakat',
      'mobile': '📞 Mobile Plan', 'internet': '🌐 Internet', 'rent': '🏘️ Rent',
      'intl': '🌐 Intl Subscription', 'subscription': '🌐 Intl Subscription',
      'other': '🎯 Other'
    };

    const account = ACCOUNT_MAP[acctInput] || 'Alfalah CC';
    const category = CATEGORY_MAP[catInput.toLowerCase()] || (intl ? '🌐 Intl Subscription' : '🎯 Other');

    const result = learnMerchant(name, {
      account: account, category: category,
      pra: pra, fxFee: intl, intl: intl,
      notes: 'User-added via Telegram'
    });

    if (typeof sendTelegram === 'function') {
      if (result.ok) {
        sendTelegram('✅ Merchant added\n\n' +
          name + ' → ' + account + ' · ' + category +
          (intl ? ' (intl, FX fees auto)' : '') +
          (pra ? ' +PRA' : ''));
      } else {
        sendTelegram('Couldn\'t save: ' + (result.error || 'unknown'));
      }
    }
    return;
  }

  if (typeof sendTelegram === 'function') {
    sendTelegram('Unknown action. Try: /merchant add | lookup | list');
  }
}

// ──────────────────────────────────────────────────────────
// CC PAYMENT VALIDATION
// Called from submitTxnFromQuickEntry before write
// Returns warning string or null (null = no issue)
// ──────────────────────────────────────────────────────────

function validateCCPayment(account, type, category) {
  // Guard: only check Alfalah CC + Expense combinations
  if (account !== 'Alfalah CC') return null;
  if (type !== 'Expense') return null;

  // These categories ARE legitimate expenses on CC (charges, fees, taxes)
  const VALID_CC_EXPENSE_CATEGORIES = [
    '💰 Opening Balance',
    '💳 CC Spend',
    '🪁 CC Kite Withdraw',
    '🪁 CC Kite Fee',
    '🌐 Intl Subscription',
    '🏦 FX Fee (4.5%)',
    '🏛️ Excise Duty (16% on FX)',
    '🏛️ Adv Tax 236Y (5%)',
    '🏛️ PRA IT Tax (5%)',
    '🏦 Biller Charge',
    '📱 Tech',
    '👕 Personal',
    '🍔 Food',
    '💊 Health',
    '🚗 Transport',
    '🎯 Other'
  ];

  if (VALID_CC_EXPENSE_CATEGORIES.indexOf(category) !== -1) return null;

  // Suspicious — likely a payment misclassified as expense
  return '⚠️ This looks like a CC PAYMENT, not a charge.\n\n' +
         'Category "' + (category || '(empty)') + '" with Expense to Alfalah CC will INCREASE your CC outstanding.\n\n' +
         'If you meant to PAY DOWN the CC:\n' +
         '  Go to 🏦 Accounts tab → Transfer form\n' +
         '  From: your bank account\n' +
         '  To: Alfalah CC\n\n' +
         'Continue logging as Expense anyway?';
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendMerchantsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🏪 Merchants')
      .addItem('📋 Show All Merchants', 'showMerchantsList')
      .addItem('🔍 Lookup (popup)', 'cmdLookupMerchantUI')
      .addToUi();
  } catch (e) { Logger.log('Merchants menu add failed: ' + e); }
}

function cmdLookupMerchantUI() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('🔍 Lookup Merchant', 'Type merchant name (e.g. youtube, netflix, foodpanda):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const name = r.getResponseText().trim();
  if (!name) return;
  const p = lookupMerchant(name);
  if (!p) {
    _merchAlert('🤷 "' + name + '" not in database.\n\nAdd via Telegram: /merchant add ' + name + ' [account] [category] [+pra] [+intl]');
    return;
  }
  _merchAlert('🏪 ' + name + '\n\n' +
    'Account: ' + p.account + '\n' +
    'Category: ' + p.category + '\n' +
    'PRA tax: ' + (p.pra ? 'YES' : 'no') + '\n' +
    'FX fee: ' + (p.fxFee ? 'YES (4.5%)' : 'no') + '\n' +
    'Notes: ' + (p.notes || '—') + '\n' +
    'Source: ' + p._source);
}
