import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { t, country } = useLocale();
  const [form, setForm] = useState<ShippingInfo>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    zip: "",
    country: country,
    phone: "",
  });
  const [loaded, setLoaded] = useState(false);

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
          <DrawerTitle>{t('shipping.title')}</DrawerTitle>
          <DrawerDescription>{t('shipping.subtitle')}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">{t('shipping.firstName')} *</Label>
              <Input id="firstName" value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="Jean" />
            </div>
            <div>
              <Label htmlFor="lastName">{t('shipping.lastName')} *</Label>
              <Input id="lastName" value={form.lastName} onChange={e => update("lastName", e.target.value)} placeholder="Dupont" />
            </div>
          </div>
          <div>
            <Label htmlFor="address1">{t('shipping.address')} *</Label>
            <Input id="address1" value={form.address1} onChange={e => update("address1", e.target.value)} placeholder="12 rue de la Paix" />
          </div>
          <div>
            <Label htmlFor="address2">{t('shipping.complement')}</Label>
            <Input id="address2" value={form.address2} onChange={e => update("address2", e.target.value)} placeholder="Apt 4B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="zip">{t('shipping.zip')} *</Label>
              <Input id="zip" value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="75001" />
            </div>
            <div>
              <Label htmlFor="city">{t('shipping.city')} *</Label>
              <Input id="city" value={form.city} onChange={e => update("city", e.target.value)} placeholder="Paris" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="country">{t('shipping.country')} *</Label>
              <Input id="country" value={form.country} onChange={e => update("country", e.target.value)} placeholder="FR" />
            </div>
            <div>
              <Label htmlFor="phone">{t('shipping.phone')}</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+33 6 12 34 56 78" />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button className="w-full h-12 text-base" disabled={!isValid || isPurchasing} onClick={() => onConfirm(form)}>
            {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CoinIcon size={16} /> {t('shipping.confirmCoins', { coins: coinsPrice })}</>}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
