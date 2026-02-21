

# Parcours de motivation avant creation de defi

## Concept
Quand l'utilisateur clique sur "Creer un defi", au lieu d'arriver directement sur la page de configuration, il passe d'abord par un parcours de 5-6 slides motivationnelles. Ce parcours cerne ses objectifs, lui explique le concept de l'app (miser sur soi) et le met dans un etat d'esprit engage avant de configurer son defi.

## Flow des slides

| Slide | Type | Contenu |
|-------|------|---------|
| 1 | Choix unique | **"Quel est ton objectif ?"** - Perdre du poids / Prendre du muscle / Etre plus regulier / Me sentir mieux |
| 2 | Choix multiple | **"Qu'est-ce qui t'a freine jusqu'ici ?"** - Manque de motivation / Pas de regularite / Personne pour me pousser / Trop de flemme |
| 3 | Info percutante | **"Le seul secret, c'est la regularite."** - 90% des gens abandonnent avant 3 mois. Pas toi. |
| 4 | Info concept | **"Mise sur toi-meme."** - Tu mets de l'argent en jeu. Si tu tiens, tu recuperes tout + des recompenses. Ce systeme provoque 7x plus de regularite. |
| 5 | Choix unique | **"A quel point es-tu determine ?"** - Je vais essayer / Je suis motive / Rien ne m'arretera |
| 6 | Transition finale | **"Parfait. Cree ton defi."** - Message personnalise selon les reponses + bouton vers la config du defi |

## Design
- Plein ecran, fond sombre, texte centre
- Barre de progression en haut (dots ou barre fine)
- Animations de transition entre slides (fade/slide)
- Boutons de choix style cartes cliquables avec feedback visuel (bordure primary)
- Phrases courtes, percutantes, une idee par slide
- Bouton "Continuer" en bas apres selection

## Implementation technique

### Fichier cree
- **`src/pages/OnboardingChallenge.tsx`** : Page complete avec gestion des slides, etat des reponses, animations et redirection vers `/create` a la fin

### Fichiers modifies
- **`src/pages/Dashboard.tsx`** : Le bouton "Creer un defi" redirige vers `/onboarding-challenge` au lieu de `/create`
- **`src/App.tsx`** : Ajouter la route `/onboarding-challenge` (protegee)

### Details techniques
- Etat local avec `useState` pour le slide actif et les reponses
- Chaque slide est un objet dans un tableau (type, question, options, texte)
- Transition CSS entre slides (opacity + translateX)
- A la derniere slide, navigation vers `/create` avec `useNavigate`
- Le composant adapte le message final selon le niveau de determination choisi
- Pas de sauvegarde en base des reponses (donnees ephemeres, uniquement pour l'experience)

