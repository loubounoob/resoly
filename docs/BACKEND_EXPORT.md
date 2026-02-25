# Resoly — Export Backend Complet (Supabase)

> Ce document contient l'intégralité de l'infrastructure backend du projet Resoly.
> Il permet de recréer un environnement Supabase 100% identique.

---

## Table des matières

1. [Variables d'environnement](#1-variables-denvironnement)
2. [Schéma SQL complet](#2-schéma-sql-complet)
3. [Fonctions SQL](#3-fonctions-sql)
4. [Triggers](#4-triggers)
5. [Politiques RLS](#5-politiques-rls)
6. [Storage (Buckets + Policies)](#6-storage)
7. [Cron Jobs (pg_cron)](#7-cron-jobs)
8. [Edge Functions](#8-edge-functions)
9. [Configuration Auth](#9-configuration-auth)
10. [Dépendances](#10-dépendances)
11. [Instructions de déploiement](#11-instructions-de-déploiement)

---

## 1. Variables d'environnement

Les secrets suivants doivent être configurés dans le projet Supabase (Dashboard → Settings → Edge Functions → Secrets) :

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | URL du projet Supabase (auto-fourni) |
| `SUPABASE_ANON_KEY` | Clé publique anon (auto-fourni) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (auto-fourni) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (paiements) |
| `GOOGLE_AI_API_KEY` | Clé API Google AI (vérification photo Gemini) |
| `FCM_SERVICE_ACCOUNT_JSON` | JSON du service account Firebase (push notifications) |
| `GOOGLE_SHEETS_WEBHOOK_URL` | URL webhook Google Sheets (sync commandes) |
| `GOOGLE_SHEETS_CHALLENGE_WEBHOOK_URL` | URL webhook Google Sheets (sync défis) |
| `SHOPIFY_CLIENT_ID` | Client ID Shopify |
| `SHOPIFY_CLIENT_SECRET` | Client Secret Shopify |
| `SHOPIFY_ACCESS_TOKEN` | Token d'accès Shopify |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Token Storefront Shopify |

Variables côté frontend (`.env`) :
```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

---

## 2. Schéma SQL complet

```sql
-- ============================================================
-- EXTENSIONS REQUISES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username text UNIQUE,
  invite_code text UNIQUE,
  avatar_url text,
  first_name text,
  last_name text,
  age integer,
  gender text,
  phone text,
  address1 text,
  address2 text,
  city text,
  zip text,
  country text DEFAULT 'FR',
  gym_name text,
  gym_latitude double precision,
  gym_longitude double precision,
  iban text,
  coins integer NOT NULL DEFAULT 0,
  referred_by uuid REFERENCES public.profiles(user_id),
  referral_bonus_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index supplémentaire pour username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

-- ============================================================
-- TABLE: challenges
-- ============================================================
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sessions_per_week integer NOT NULL DEFAULT 3,
  duration_months integer NOT NULL DEFAULT 3,
  bet_per_month numeric NOT NULL DEFAULT 50,
  odds numeric NOT NULL DEFAULT 1.0,
  total_sessions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  coins_awarded integer NOT NULL DEFAULT 0,
  first_week_sessions integer,
  social_challenge_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul défi actif payé par utilisateur
CREATE UNIQUE INDEX idx_one_active_challenge_per_user 
  ON public.challenges (user_id) 
  WHERE status = 'active' AND payment_status = 'paid';

-- ============================================================
-- TABLE: check_ins
-- ============================================================
CREATE TABLE public.check_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  photo_url text,
  verified boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: social_challenges
-- ============================================================
CREATE TABLE public.social_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  target_user_id uuid,
  group_id uuid,
  type text NOT NULL,
  bet_amount numeric NOT NULL DEFAULT 100,
  sessions_per_week integer NOT NULL DEFAULT 3,
  duration_months integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: social_challenge_members
-- ============================================================
CREATE TABLE public.social_challenge_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_challenge_id uuid NOT NULL REFERENCES public.social_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id),
  bet_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  iban text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (social_challenge_id, user_id)
);

-- ============================================================
-- TABLE: friendships
-- ============================================================
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- ============================================================
-- TABLE: groups
-- ============================================================
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  photo_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: group_members
-- ============================================================
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: push_tokens
-- ============================================================
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- ============================================================
-- TABLE: rewards
-- ============================================================
CREATE TABLE public.rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  emoji text,
  value text,
  tier integer NOT NULL DEFAULT 1,
  unlocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: shop_products
-- ============================================================
CREATE TABLE public.shop_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  image_url text,
  price_coins integer NOT NULL,
  category text NOT NULL DEFAULT 'equipement',
  stock integer NOT NULL DEFAULT -1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: shop_orders
-- ============================================================
CREATE TABLE public.shop_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.shop_products(id),
  coins_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: coin_orders
-- ============================================================
CREATE TABLE public.coin_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_title text NOT NULL,
  variant_title text,
  variant_id text NOT NULL,
  selected_options jsonb DEFAULT '[]'::jsonb,
  coins_spent integer NOT NULL,
  price_amount numeric,
  price_currency text DEFAULT 'EUR',
  email text,
  shipping_first_name text,
  shipping_last_name text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_city text,
  shipping_zip text,
  shipping_country text DEFAULT 'FR',
  shipping_phone text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: pending_payouts
-- ============================================================
CREATE TABLE public.pending_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  social_challenge_id uuid NOT NULL,
  amount numeric NOT NULL,
  iban text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: shopify_tokens
-- ============================================================
CREATE TABLE public.shopify_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain text NOT NULL UNIQUE,
  access_token text NOT NULL,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign key pour social_challenges.group_id
ALTER TABLE public.social_challenges 
  ADD CONSTRAINT social_challenges_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES public.groups(id);

-- Foreign key pour challenges.social_challenge_id
ALTER TABLE public.challenges 
  ADD CONSTRAINT challenges_social_challenge_id_fkey 
  FOREIGN KEY (social_challenge_id) REFERENCES public.social_challenges(id);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_tokens ENABLE ROW LEVEL SECURITY;
```

---

## 3. Fonctions SQL

```sql
-- ============================================================
-- FUNCTION: update_updated_at_column
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FUNCTION: is_group_member
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- ============================================================
-- FUNCTION: is_social_challenge_member
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_social_challenge_member(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_challenge_members
    WHERE user_id = _user_id AND social_challenge_id = _challenge_id
  )
$$;

-- ============================================================
-- FUNCTION: handle_new_user (trigger sur auth.users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite_code text;
  _referrer_id uuid;
  _new_username text;
BEGIN
  _new_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'user_' || substr(md5(random()::text), 1, 6)
  );

  INSERT INTO public.profiles (user_id, display_name, username, invite_code, age, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    _new_username,
    upper(substr(md5(random()::text), 1, 8)),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender'
  );

  _invite_code := NEW.raw_user_meta_data->>'invite_code_used';
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT user_id INTO _referrer_id FROM public.profiles WHERE invite_code = upper(_invite_code) LIMIT 1;
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = NEW.id;

      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        _referrer_id,
        'referral_reward',
        'Nouveau filleul ! 🎉',
        '@' || _new_username || ' s''est inscrit grâce à toi. Récupère tes 50 pièces !',
        jsonb_build_object(
          'coins', 50,
          'referred_user_id', NEW.id::text,
          'reward_type', 'referral_signup',
          'claimed', false
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## 4. Triggers

```sql
-- Trigger: auto-update updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: auto-update updated_at sur challenges
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: auto-update updated_at sur shopify_tokens
CREATE TRIGGER update_shopify_tokens_updated_at
  BEFORE UPDATE ON public.shopify_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: création automatique de profil à l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Politiques RLS

```sql
-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can search profiles by username" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- CHALLENGES
-- ============================================================
CREATE POLICY "Users can view their own challenges" ON public.challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Friends can view challenges" ON public.challenges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = challenges.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = challenges.user_id))
    )
  );

CREATE POLICY "Users can create their own challenges" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON public.challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- CHECK_INS
-- ============================================================
CREATE POLICY "Users can view their own check_ins" ON public.check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Friends can view check_ins" ON public.check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = check_ins.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = check_ins.user_id))
    )
  );

CREATE POLICY "Users can create their own check_ins" ON public.check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check_ins" ON public.check_ins
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- SOCIAL_CHALLENGES
-- ============================================================
CREATE POLICY "Users can view their social challenges" ON public.social_challenges
  FOR SELECT USING (
    created_by = auth.uid() 
    OR target_user_id = auth.uid() 
    OR is_social_challenge_member(auth.uid(), id)
  );

CREATE POLICY "Users can create social challenges" ON public.social_challenges
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their social challenges" ON public.social_challenges
  FOR UPDATE USING (created_by = auth.uid());

-- ============================================================
-- SOCIAL_CHALLENGE_MEMBERS
-- ============================================================
CREATE POLICY "Users can view social challenge members" ON public.social_challenge_members
  FOR SELECT USING (
    is_social_challenge_member(auth.uid(), social_challenge_id) 
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join social challenges" ON public.social_challenge_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their membership" ON public.social_challenge_members
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================
-- GROUPS
-- ============================================================
CREATE POLICY "Group members can view groups" ON public.groups
  FOR SELECT USING (is_group_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ============================================================
-- GROUP_MEMBERS
-- ============================================================
CREATE POLICY "Group members can view members" ON public.group_members
  FOR SELECT USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users cannot insert notifications directly" ON public.notifications
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- PUSH_TOKENS
-- ============================================================
CREATE POLICY "Users can manage their own tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REWARDS
-- ============================================================
CREATE POLICY "Users can view their own rewards" ON public.rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rewards" ON public.rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards" ON public.rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- SHOP_PRODUCTS
-- ============================================================
CREATE POLICY "Authenticated users can view active products" ON public.shop_products
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- SHOP_ORDERS
-- ============================================================
CREATE POLICY "Users can view their own orders" ON public.shop_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.shop_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COIN_ORDERS
-- ============================================================
CREATE POLICY "Users can view their own coin orders" ON public.coin_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coin orders" ON public.coin_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PENDING_PAYOUTS
-- ============================================================
CREATE POLICY "Users can view their own payouts" ON public.pending_payouts
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 6. Storage

### Buckets

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('check-in-photos', 'check-in-photos', true);
```

### Storage Policies

> **Note :** Vérifie les policies existantes dans ton nouveau projet Supabase. Si des policies par défaut sont créées, adapte-les. Voici les policies recommandées :

```sql
-- Avatars : lecture publique
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Avatars : upload par l'utilisateur
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars : mise à jour par l'utilisateur
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Check-in photos : lecture publique
CREATE POLICY "Check-in photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'check-in-photos');

-- Check-in photos : upload par l'utilisateur
CREATE POLICY "Users can upload check-in photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'check-in-photos' AND auth.role() = 'authenticated');

-- Check-in photos : suppression par l'utilisateur
CREATE POLICY "Users can delete their check-in photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'check-in-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 7. Cron Jobs (pg_cron + pg_net)

```sql
-- 1. Vérification quotidienne des défis en péril (tous les jours à 10h UTC)
SELECT cron.schedule(
  'check-challenge-peril-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/check-challenge-peril',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. Nettoyage des photos de check-in > 24h (toutes les heures)
SELECT cron.schedule(
  'cleanup-old-check-in-photos',
  '0 * * * *',
  $$
    UPDATE public.check_ins
    SET photo_url = NULL
    WHERE photo_url IS NOT NULL
      AND checked_in_at < now() - interval '24 hours';
    
    DELETE FROM storage.objects
    WHERE bucket_id = 'check-in-photos'
      AND created_at < now() - interval '24 hours';
  $$
);

-- 3. Échec automatique des défis tous les jours à 23h UTC
SELECT cron.schedule(
  'fail-challenge-daily',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/fail-challenge',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

> **IMPORTANT :** Remplacez `<SUPABASE_URL>` et `<SUPABASE_ANON_KEY>` par les valeurs de votre nouveau projet.

---

## 8. Edge Functions

Toutes les Edge Functions sont dans `supabase/functions/`. Chaque dossier contient un `index.ts`.

### Configuration (`supabase/config.toml`)

```toml
[functions.create-challenge-payment]
verify_jwt = false

[functions.verify-payment]
verify_jwt = false

[functions.purchase-product]
verify_jwt = false

[functions.verify-photo]
verify_jwt = false

[functions.purchase-with-coins]
verify_jwt = false

[functions.send-notification]
verify_jwt = false

[functions.complete-challenge]
verify_jwt = false

[functions.buy-coins]
verify_jwt = false

[functions.verify-coin-purchase]
verify_jwt = false

[functions.check-challenge-peril]
verify_jwt = false

[functions.sync-order-sheet]
verify_jwt = false

[functions.sync-challenge-sheet]
verify_jwt = false

[functions.decline-boost-challenge]
verify_jwt = false

[functions.accept-boost-challenge]
verify_jwt = false

[functions.fail-challenge]
verify_jwt = false

[functions.claim-referral-reward]
verify_jwt = false
```

### Liste des 16 Edge Functions

| Fonction | Rôle |
|----------|------|
| `create-challenge-payment` | Crée une session Stripe Checkout pour payer un défi |
| `verify-payment` | Vérifie le paiement Stripe et active le défi |
| `complete-challenge` | Complète un défi réussi : remboursement Stripe + coins |
| `fail-challenge` | Marque les défis échoués (appelé par cron) |
| `check-challenge-peril` | Alerte les utilisateurs en risque d'échec (appelé par cron) |
| `buy-coins` | Crée une session Stripe pour acheter des pièces |
| `verify-coin-purchase` | Vérifie l'achat de pièces et crédite le compte |
| `verify-photo` | Vérifie une photo de check-in via Google AI (Gemini) |
| `send-notification` | Crée une notification in-app + push FCM |
| `accept-boost-challenge` | Accepte un défi offert (Boost) |
| `decline-boost-challenge` | Refuse un défi offert + remboursement Stripe |
| `purchase-product` | Achète un produit shop interne avec des pièces |
| `purchase-with-coins` | Achète un produit Shopify avec des pièces |
| `claim-referral-reward` | Réclame les pièces de parrainage |
| `sync-challenge-sheet` | Synchronise les données de défi vers Google Sheets |
| `sync-order-sheet` | Synchronise les commandes vers Google Sheets |

> Le code source complet de chaque fonction se trouve dans `supabase/functions/<nom>/index.ts`.

---

## 9. Configuration Auth

- **Mode :** Email / Password
- **Auto-confirm email :** Non (les utilisateurs doivent confirmer leur email)
- **Anonymous sign-ups :** Désactivé
- **Trigger d'inscription :** `on_auth_user_created` → `handle_new_user()` (crée automatiquement un profil)

---

## 10. Dépendances

### Frontend (package.json)

| Package | Usage |
|---------|-------|
| `@supabase/supabase-js` | Client Supabase |
| `@tanstack/react-query` | Cache & requêtes |
| `react-router-dom` | Routing |
| `zustand` | State management (panier) |
| `sonner` | Toast notifications |
| `recharts` | Graphiques |
| `lucide-react` | Icônes |
| `date-fns` | Manipulation de dates |
| `canvas-confetti` | Effets de célébration |
| `zod` + `react-hook-form` | Validation formulaires |
| `@capacitor/*` | App mobile native |
| Shadcn/ui (`@radix-ui/*`, `vaul`, etc.) | Composants UI |

### Backend (Edge Functions - imports Deno)

| Package | Version |
|---------|---------|
| `stripe` | `18.5.0` (via esm.sh) |
| `@supabase/supabase-js` | `2.57.2` (via npm:) ou `@2` (via esm.sh) |
| `deno std/http/server` | `0.190.0` / `0.168.0` |

---

## 11. Instructions de déploiement

### Étape 1 : Créer un projet Supabase
1. Créer un nouveau projet sur [supabase.com](https://supabase.com)
2. Activer les extensions `pg_cron` et `pg_net` (Database → Extensions)

### Étape 2 : Exécuter le SQL
1. Exécuter le schéma SQL complet (Section 2)
2. Exécuter les fonctions SQL (Section 3)
3. Exécuter les triggers (Section 4)
4. Exécuter les politiques RLS (Section 5)
5. Créer les buckets de stockage (Section 6)
6. Configurer les cron jobs (Section 7) — remplacer les URLs

### Étape 3 : Configurer les secrets
1. Dashboard → Settings → Edge Functions → Secrets
2. Ajouter tous les secrets listés en Section 1

### Étape 4 : Déployer les Edge Functions
```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref <project-id>

# Déployer toutes les fonctions
supabase functions deploy create-challenge-payment --no-verify-jwt
supabase functions deploy verify-payment --no-verify-jwt
supabase functions deploy complete-challenge --no-verify-jwt
supabase functions deploy fail-challenge --no-verify-jwt
supabase functions deploy check-challenge-peril --no-verify-jwt
supabase functions deploy buy-coins --no-verify-jwt
supabase functions deploy verify-coin-purchase --no-verify-jwt
supabase functions deploy verify-photo --no-verify-jwt
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy accept-boost-challenge --no-verify-jwt
supabase functions deploy decline-boost-challenge --no-verify-jwt
supabase functions deploy purchase-product --no-verify-jwt
supabase functions deploy purchase-with-coins --no-verify-jwt
supabase functions deploy claim-referral-reward --no-verify-jwt
supabase functions deploy sync-challenge-sheet --no-verify-jwt
supabase functions deploy sync-order-sheet --no-verify-jwt
```

### Étape 5 : Configurer le frontend
1. Mettre à jour `.env` avec les nouvelles valeurs Supabase
2. Mettre à jour `src/integrations/supabase/client.ts` avec la nouvelle URL et clé anon

### Étape 6 : Vérifier
- Tester l'inscription (trigger `handle_new_user`)
- Tester la création de défi + paiement Stripe
- Tester la vérification photo
- Tester les notifications push
- Vérifier que les cron jobs sont actifs (`SELECT * FROM cron.job;`)
