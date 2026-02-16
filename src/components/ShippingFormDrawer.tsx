import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
  country: string;
  phone: string;
}

interface ShippingFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coinsPrice: number;
  onConfirm: (shipping: ShippingInfo) => void;
  isPurchasing: boolean;
}

export const ShippingFormDrawer = ({ open, onOpenChange, coinsPrice, onConfirm, isPurchasing }: ShippingFormDrawerProps) => {
  const [form, setForm] = useState<ShippingInfo>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    zip: "",
    country: "FR",
    phone: "",
  });
  const [loaded, setLoaded] = useState(false);

  // Pre-fill from profile
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("first_name, last_name, address1, address2, city, zip, country, phone").eq("user_id", user.id).single();
      if (data) {
        setForm(prev => ({
          firstName: data.first_name || prev.firstName,
          lastName: data.last_name || prev.lastName,
          address1: data.address1 || prev.address1,
          address2: data.address2 || prev.address2,
          city: data.city || prev.city,
          zip: data.zip || prev.zip,
          country: data.country || prev.country,
          phone: data.phone || prev.phone,
        }));
      }
      setLoaded(true);
    })();
  }, [open, loaded]);

  const isValid = form.firstName && form.lastName && form.address1 && form.city && form.zip && form.country;

  const update = (field: keyof ShippingInfo, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Adresse de livraison</DrawerTitle>
          <DrawerDescription>Remplissez vos informations pour finaliser l'achat avec vos pièces.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="Jean" />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" value={form.lastName} onChange={e => update("lastName", e.target.value)} placeholder="Dupont" />
            </div>
          </div>
          <div>
            <Label htmlFor="address1">Adresse *</Label>
            <Input id="address1" value={form.address1} onChange={e => update("address1", e.target.value)} placeholder="12 rue de la Paix" />
          </div>
          <div>
            <Label htmlFor="address2">Complément</Label>
            <Input id="address2" value={form.address2} onChange={e => update("address2", e.target.value)} placeholder="Apt 4B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="zip">Code postal *</Label>
              <Input id="zip" value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="75001" />
            </div>
            <div>
              <Label htmlFor="city">Ville *</Label>
              <Input id="city" value={form.city} onChange={e => update("city", e.target.value)} placeholder="Paris" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="country">Pays *</Label>
              <Input id="country" value={form.country} onChange={e => update("country", e.target.value)} placeholder="FR" />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+33 6 12 34 56 78" />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button className="w-full h-12 text-base" disabled={!isValid || isPurchasing} onClick={() => onConfirm(form)}>
            {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : `🪙 Confirmer — ${coinsPrice} pièces`}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
