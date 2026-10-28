# Instructions pour importer dans Google Sheets

## Étape 1 : Importer le fichier CSV

1. Ouvrez Google Sheets (sheets.google.com)
2. Créez un nouveau spreadsheet
3. Cliquez sur **Fichier** > **Importer**
4. Sélectionnez **Importer** depuis l'onglet "Télécharger"
5. Choisissez le fichier `applications_likmed_complet.csv`
6. Cochez "Remplacer la feuille actuelle"
7. Cliquez sur **Importer**

## Étape 2 : Formater les colonnes

### Largeur des colonnes recommandées :
- N° : 40px
- Catégorie : 120px
- Nom de l'application : 250px
- Nom technique : 200px
- Statut : 120px
- État : 100px
- Priorité : 100px
- Version : 80px
- Date installation : 130px
- Dernière mise à jour : 150px
- Concepteur : 120px
- Notes : 300px

### Méthode :
1. Sélectionnez toute la feuille (Ctrl+A ou Cmd+A)
2. Cliquez sur **Format** > **Retour à la ligne automatique**
3. Ajustez manuellement les largeurs ou utilisez **Format** > **Dimensionnement** > **Ajuster les colonnes**

## Étape 3 : Ajouter un formatage conditionnel

### Pour la colonne "Statut" (colonne E) :
1. Sélectionnez la colonne E (Statut)
2. Cliquez sur **Format** > **Formatage conditionnel**
3. Ajoutez les règles suivantes :

**Règle 1 - Actif (Vert) :**
- Cellule vide : Non
- Contient : "Actif"
- Style de mise en forme : Vert clair, texte vert foncé

**Règle 2 - Installé (Jaune) :**
- Cellule vide : Non
- Contient : "Installé"
- Style de mise en forme : Jaune clair, texte orange foncé

**Règle 3 - À activer (Rouge) :**
- Cellule vide : Non
- Contient : "À activer"
- Style de mise en forme : Rouge clair, texte rouge foncé

**Règle 4 - Inactif (Gris) :**
- Cellule vide : Non
- Contient : "Inactif"
- Style de mise en forme : Gris clair, texte gris foncé

### Pour la colonne "Priorité" (colonne F) :
1. Sélectionnez la colonne F (Priorité)
2. Cliquez sur **Format** > **Formatage conditionnel**
3. Ajoutez les règles :

**Règle 1 - Haute (Rouge) :**
- Contient : "Haute"
- Style : Fond rouge clair, texte rouge

**Règle 2 - Moyenne (Orange) :**
- Contient : "Moyenne"
- Style : Fond orange clair, texte orange

**Règle 3 - Basse (Vert) :**
- Contient : "Basse"
- Style : Fond vert clair, texte vert

## Étape 4 : Créer des menus déroulants (Validation des données)

### Pour la colonne "Statut" (E) :
1. Sélectionnez E2:E45
2. Cliquez sur **Données** > **Validation des données**
3. Critère : "Liste déroulante dans une plage"
4. Liste : Écrivez : `Actif,Installé,À activer,Désactivé,En maintenance`
5. Cochez "Afficher une aide à la saisie"
6. Cliquez sur **Terminé**

### Pour la colonne "Priorité" (F) :
1. Sélectionnez F2:F45
2. Cliquez sur **Données** > **Validation des données**
3. Critère : "Liste déroulante dans une plage"
4. Liste : Écrivez : `Haute,Moyenne,Basse`
5. Cliquez sur **Terminé**

### Pour la colonne "Catégorie" (B) :
1. Sélectionnez B2:B45
2. Cliquez sur **Données** > **Validation des données**
3. Critère : "Liste déroulante dans une plage"
4. Liste : Écrivez : `Chirurgie,Médecine Interne,Pédiatrie,Médecine Dentaire,Dermatologie,Urgences,Médecine Générale,Génétique,Gériatrie,Gynécologie,Rééducation,Neurologie,Psychiatrie,Laboratoire,Nutrition,Oncologie,Ophtalmologie,ORL,Pneumologie,Radiologie,Radiothérapie,Rhumatologie,Traumatologie,Urologie,Psychologie`
5. Cliquez sur **Terminé**

## Étape 5 : Ajouter des filtres

1. Sélectionnez la ligne d'en-tête (ligne 1)
2. Cliquez sur **Données** > **Créer un filtre**
3. Vous pouvez maintenant filtrer par :
   - Catégorie
   - Statut
   - Priorité
   - Concepteur

## Étape 6 : Protéger le résumé (lignes 46-54)

1. Sélectionnez les lignes 46 à 54 (le résumé)
2. Cliquez sur **Format** > **Verrouiller les cellules**
3. Cliquez sur **Données** > **Protéger la feuille**
4. Cliquez sur **Configurer les autorisations**
5. Cochez "Afficher un avertissement lors de la modification"

## Étape 7 : Geler la ligne d'en-tête

1. Cliquez sur la ligne 2
2. Cliquez sur **Affichage** > **Geler** > **1 ligne**

## Étape 8 : Personnaliser l'apparence

### Titre du document :
1. Sélectionnez la ligne 1
2. Cliquez sur **Format** > **Texte** > **Gras**
3. Couleur de fond : Bleu clair (#E3F2FD)
4. Couleur du texte : Bleu foncé (#1565C0)
5. Alignement : Centré

### Bordures :
1. Sélectionnez tout le tableau (A1:L45)
2. Cliquez sur **Format** > **Bordures**
3. Choisissez "Toutes les bordures"

## Étape 9 : Ajouter un graphique de résumé (optionnel)

1. Sélectionnez les données du résumé (G47:I52)
2. Cliquez sur **Insertion** > **Graphique**
3. Type de graphique : Camembert ou Barres
4. Personnalisez les couleurs selon les catégories

## Étape 10 : Partager et collaborer

1. Cliquez sur **Partager** en haut à droite
2. Ajoutez les emails de votre équipe
3. Définissez les permissions :
   - Éditeur : Peut modifier
   - Commentateur : Peut commenter
   - Lecteur : Peut seulement voir

## Astuces supplémentaires

### Raccourcis clavier utiles :
- **Ctrl/Cmd + F** : Rechercher dans la feuille
- **Ctrl/Cmd + H** : Remplacer
- **Ctrl/Cmd + Z** : Annuler
- **Ctrl/Cmd + Y** : Rétablir

### Formules utiles :
- `=COUNTIF(E2:E45, "Actif")` : Compter les apps actives
- `=COUNTIF(F2:F45, "Haute")` : Compter les priorités hautes
- `=FILTER(A2:L45, B2:B45="Chirurgie")` : Filtrer par catégorie

### Notification de modifications :
1. Cliquez sur **Outils** > **Règles de notification**
2. Configurez pour recevoir un email quand quelqu'un modifie

## Sauvegarde

N'oubliez pas de :
- Télécharger régulièrement en CSV (Fichier > Télécharger > CSV)
- Créer une copie de sauvegarde (Fichier > Créer une copie)
- Activer l'historique des versions (Fichier > Historique des versions)
