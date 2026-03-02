

## Plan: Images plus hautes, vidéos Shopify autoplay, suppression du prix fiat

### 1. Images moins coupées (Shop + Product Detail)

**Shop.tsx** — Changer l'aspect ratio des cards de `1:1` (carré) à `3/4` (portrait) pour montrer plus de hauteur :
- Ligne 46 : `<AspectRatio ratio={1}>` → `<AspectRatio ratio={3/4}>`

**ShopifyProductDetail.tsx** — Changer l'image produit de `aspect-square` à `aspect-[3/4]` :
- Ligne 187 : `className="w-full aspect-square object-cover"` → `className="w-full aspect-[3/4] object-cover"`

### 2. Support vidéos Shopify (autoplay, sans bouton play)

Actuellement, la query GraphQL ne récupère que les `images`. Il faut aussi récupérer les `media` qui incluent les vidéos.

**shopify.ts** — Ajouter un champ `media` à la query GraphQL et à l'interface :
```graphql
media(first: 10) {
  edges {
    node {
      mediaContentType
      ... on Video {
        sources { url mimeType }
      }
      ... on ExternalVideo {
        embedUrl
        host
      }
      ... on MediaImage {
        image { url altText }
      }
    }
  }
}
```

Ajouter l'interface `ShopifyMedia` au type `ShopifyProduct`.

**ShopifyProductDetail.tsx** — Construire un tableau de "slides" (images + vidéos) à partir de `media`. Pour chaque slide :
- Si `mediaContentType === "VIDEO"` : afficher un `<video autoPlay muted loop playsInline>` avec les sources
- Si `mediaContentType === "EXTERNAL_VIDEO"` : afficher un `<iframe>` avec autoplay (YouTube/Vimeo embed)
- Si `mediaContentType === "IMAGE"` : afficher un `<img>` comme actuellement
- Fallback sur `images.edges` si `media` est vide

**Shop.tsx** — Même logique pour la card : si le premier media est une vidéo, afficher `<video autoPlay muted loop playsInline>` au lieu de `<img>`.

### 3. Supprimer le prix fiat sur la page détail

**ShopifyProductDetail.tsx** — Retirer la `<span>` qui affiche `formatCurrency(...)` à la ligne 223.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/lib/shopify.ts` | Ajouter `media` à la query GQL + interface `ShopifyMedia` |
| `src/pages/Shop.tsx` | Ratio 3/4 + support vidéo autoplay en card |
| `src/pages/ShopifyProductDetail.tsx` | Ratio 3/4, slides media (vidéo autoplay), supprimer prix fiat |

