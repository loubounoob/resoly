

## Correction du Dashboard Google Sheets

### Le probleme

Les formules du Dashboard affichent `#ERROR!` parce que le script Google Apps Script que tu as deploye ne place pas les donnees dans les bonnes colonnes, ou les formules du Dashboard referent les mauvaises colonnes. C'est un probleme uniquement cote Google Apps Script, pas cote Lovable.

### Ce qu'il faut faire (cote Google Apps Script uniquement)

Remplace **tout** le code de ton Google Apps Script par le script ci-dessous. Ce script est la version definitive et corrigee :

- Les colonnes du tab "Defis" correspondent exactement aux donnees envoyees par l'app
- Les formules du Dashboard referent les bonnes lettres de colonnes
- Le Dashboard se reconstruit automatiquement a chaque reception de donnees

### Script Google Apps Script complet a copier-coller

```text
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Défis");
  
  if (!sheet) {
    sheet = ss.insertSheet("Défis");
    sheet.appendRow([
      "ID Défi",        // A
      "Pseudo",          // B
      "Âge",             // C
      "Genre",           // D
      "Email",           // E
      "Type",            // F
      "Mise totale",     // G
      "Mise/mois",       // H
      "Séances/sem",     // I
      "Durée (mois)",    // J
      "Total séances",   // K
      "Pièces estimées", // L
      "Statut",          // M
      "Date création",   // N
      "Date fin estimée",// O
      "Stripe ID",       // P
      "Code promo",      // Q
      "Timestamp"        // R
    ]);
    sheet.getRange(1, 1, 1, 18).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  
  var data = JSON.parse(e.postData.contents);
  
  // Si c'est une mise a jour de statut
  if (data.update_only && data.challenge_id) {
    var lastRow = sheet.getLastRow();
    for (var i = 2; i <= lastRow; i++) {
      if (sheet.getRange(i, 1).getValue() == data.challenge_id) {
        sheet.getRange(i, 13).setValue(data.status); // col M = statut
        setupDashboard(ss);
        return ContentService.createTextOutput(
          JSON.stringify({success: true})
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  
  // Nouvelle ligne
  sheet.appendRow([
    data.challenge_id || "",
    data.username || "",
    data.age || "",
    data.gender || "",
    data.email || "",
    data.type || "",
    data.mise_totale || 0,
    data.mise_par_mois || 0,
    data.sessions_per_week || 0,
    data.duration_months || 0,
    data.total_sessions || 0,
    data.estimated_coins || 0,
    data.status || "",
    data.created_at || "",
    data.estimated_end_date || "",
    data.stripe_payment_intent_id || "",
    data.promo_code || "",
    new Date()
  ]);
  
  setupDashboard(ss);
  
  return ContentService.createTextOutput(
    JSON.stringify({success: true})
  ).setMimeType(ContentService.MimeType.JSON);
}

function setupDashboard(ss) {
  var dash = ss.getSheetByName("Dashboard");
  if (!dash) {
    dash = ss.insertSheet("Dashboard");
  }
  dash.clear();
  
  // Toutes les formules utilisent les colonnes correctes :
  // G=mise_totale, M=statut, D=gender, C=age, L=coins,
  // F=type, Q=promo, O=date_fin
  
  var rows = [];
  
  // --- TITRE ---
  rows.push(["TABLEAU DE BORD RESOLY", "", "", ""]);
  rows.push(["", "", "", ""]);
  
  // --- FINANCES ---
  rows.push(["FINANCES", "", "", ""]);
  rows.push(["Revenu total (défis perdus)",
    '=SUMPRODUCT((Défis!M2:M1000="failed")*Défis!G2:G1000)',
    "Cet argent t'appartient", ""]);
  rows.push(["Argent encore en jeu",
    '=SUMPRODUCT((Défis!M2:M1000="active")*Défis!G2:G1000)',
    "", ""]);
  rows.push(["Total encaissé via Stripe",
    '=SUM(Défis!G2:G1000)',
    "", ""]);
  rows.push(["Argent remboursé (défis réussis)",
    '=SUMPRODUCT((Défis!M2:M1000="completed")*Défis!G2:G1000)',
    "", ""]);
  rows.push(["Marge nette (perdu - remboursé)",
    '=B4-B7',
    "", ""]);
  rows.push(["", "", "", ""]);
  
  // --- STATISTIQUES ---
  rows.push(["STATISTIQUES", "", "", ""]);
  rows.push(["Nb défis total",
    '=COUNTA(Défis!A2:A1000)',
    "", ""]);
  rows.push(["Nb défis actifs",
    '=COUNTIF(Défis!M2:M1000,"active")',
    "", ""]);
  rows.push(["Nb défis complétés",
    '=COUNTIF(Défis!M2:M1000,"completed")',
    "", ""]);
  rows.push(["Nb défis perdus",
    '=COUNTIF(Défis!M2:M1000,"failed")',
    "", ""]);
  rows.push(["Taux de réussite",
    '=IFERROR(B13/(B13+B14),0)',
    "", ""]);
  rows.push(["Mise moyenne par défi",
    '=IFERROR(AVERAGE(Défis!G2:G1000),0)',
    "", ""]);
  rows.push(["Pièces totales estimées",
    '=SUM(Défis!L2:L1000)',
    "", ""]);
  rows.push(["", "", "", ""]);
  
  // --- DEMOGRAPHIE ---
  rows.push(["DÉMOGRAPHIE", "", "", ""]);
  rows.push(["Nb Hommes",
    '=COUNTIF(Défis!D2:D1000,"homme")',
    "% Hommes",
    '=IFERROR(B20/B11,0)']);
  rows.push(["Nb Femmes",
    '=COUNTIF(Défis!D2:D1000,"femme")',
    "% Femmes",
    '=IFERROR(B21/B11,0)']);
  rows.push(["Âge moyen",
    '=IFERROR(AVERAGE(Défis!C2:C1000),0)',
    "", ""]);
  rows.push(["", "", "", ""]);
  
  // --- PREVISIONS ---
  rows.push(["PRÉVISIONS REMBOURSEMENT", "", "", ""]);
  rows.push(["Pire cas (tout rembourser)",
    '=B5',
    "", ""]);
  rows.push(["Estimation réaliste",
    '=IFERROR(B5*B15,0)',
    "", ""]);
  rows.push(["Prochain défi qui se termine",
    '=IFERROR(MINIFS(Défis!O2:O1000,Défis!M2:M1000,"active"),"Aucun")',
    "", ""]);
  rows.push(["", "", "", ""]);
  
  // --- CODES PROMO ---
  rows.push(["CODES PROMO", "", "", ""]);
  rows.push(["Nb utilisation code loubou",
    '=COUNTIF(Défis!Q2:Q1000,"loubou")',
    "", ""]);
  rows.push(["Nb défis perso",
    '=COUNTIF(Défis!F2:F1000,"perso")',
    "", ""]);
  rows.push(["Nb défis sociaux",
    '=COUNTIF(Défis!F2:F1000,"social")',
    "", ""]);
  
  // Ecrire tout d'un coup
  dash.getRange(1, 1, rows.length, 4).setValues(rows);
  
  // Formatage
  dash.getRange(1, 1).setFontSize(14).setFontWeight("bold");
  dash.getRange("A3").setFontWeight("bold");
  dash.getRange("A10").setFontWeight("bold");
  dash.getRange("A19").setFontWeight("bold");
  dash.getRange("A24").setFontWeight("bold");
  dash.getRange("A29").setFontWeight("bold");
  dash.setColumnWidth(1, 300);
  dash.setColumnWidth(2, 150);
  dash.setColumnWidth(3, 150);
  dash.setColumnWidth(4, 100);
  
  // Format monétaire
  dash.getRange("B4:B8").setNumberFormat('#,##0.00 €');
  dash.getRange("B15").setNumberFormat('0%');
  dash.getRange("B16").setNumberFormat('#,##0.00 €');
  dash.getRange("B25:B26").setNumberFormat('#,##0.00 €');
  dash.getRange("D20:D21").setNumberFormat('0%');
}
```

### Etapes a suivre

1. Va dans ton Google Apps Script
2. Supprime TOUT le code existant
3. Colle le script ci-dessus a la place
4. Clique sur "Deployer" > "Gerer les deploiements" > clique sur l'icone crayon (modifier) > selectionne "Nouvelle version" > "Deployer"
5. **Important** : si l'URL de deploiement change, il faudra mettre a jour le secret `GOOGLE_SHEETS_CHALLENGE_WEBHOOK_URL` dans Lovable
6. Supprime manuellement les onglets "Defis" et "Dashboard" existants dans ton Google Sheet (le script les recreera proprement)
7. Reviens me dire "relance le test" et je renverrai des donnees de test pour verifier que tout fonctionne

### Pourquoi ca ne marchait pas

Les formules du Dashboard utilisaient des references de colonnes (comme `Défis!M2:M` ou `Défis!G2:G`) qui ne correspondaient pas a l'endroit reel ou les donnees etaient ecrites. Ce nouveau script garantit que les en-tetes, les donnees, et les formules sont parfaitement alignes.

### Changements cote Lovable

Aucun changement de code n'est necessaire cote Lovable. L'edge function `sync-challenge-sheet` fonctionne correctement (elle retourne `success: true`). Le probleme est uniquement dans le script Google Apps Script.

