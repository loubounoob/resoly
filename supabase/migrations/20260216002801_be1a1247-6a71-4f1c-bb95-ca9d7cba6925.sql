
-- Table shop_products
CREATE TABLE public.shop_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_coins INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipement',
  stock INTEGER NOT NULL DEFAULT -1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active products"
ON public.shop_products FOR SELECT
USING (auth.role() = 'authenticated');

-- Table shop_orders
CREATE TABLE public.shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.shop_products(id),
  coins_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
ON public.shop_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.shop_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed products
INSERT INTO public.shop_products (name, description, image_url, price_coins, category) VALUES
('Bande de résistance', 'Bande élastique pour renforcement musculaire, 3 niveaux de résistance inclus.', 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop', 150, 'accessoires'),
('Shaker protéine', 'Shaker 700ml avec compartiment pour poudre et grille anti-grumeaux.', 'https://images.unsplash.com/photo-1593095948071-474c5cc2c903?w=400&h=400&fit=crop', 200, 'accessoires'),
('Gants de musculation', 'Gants rembourrés avec grip anti-dérapant pour une prise en main optimale.', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop', 350, 'vetements'),
('Serviette microfibre', 'Serviette ultra-absorbante et compacte, séchage rapide.', 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=400&fit=crop', 250, 'accessoires'),
('Corde à sauter', 'Corde à sauter réglable avec poignées ergonomiques et compteur de tours.', 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&h=400&fit=crop', 300, 'equipement'),
('Tapis de yoga', 'Tapis antidérapant 6mm, idéal pour yoga, stretching et exercices au sol.', 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=400&h=400&fit=crop', 500, 'equipement'),
('Sac de sport', 'Sac de sport 40L avec compartiment chaussures et poche étanche.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 800, 'accessoires'),
('Écouteurs sport Bluetooth', 'Écouteurs sans fil résistants à la sueur, autonomie 8h, son premium.', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop', 1200, 'equipement');
