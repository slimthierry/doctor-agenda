# Doctor Agenda

Application mobile d'**agenda médecin multi-établissements** avec rappels
(push / SMS / WhatsApp) et **synchro vers l'agenda central** — LIKSOFT.

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript (strict)
- React Navigation 7 (bottom tabs + native stack)
- AsyncStorage (persistance locale — mode local-first)
- expo-notifications (rappels push locaux)
- API centrale : `backend/agenda-central` (Python/FastAPI + Docker, contrat `backend/agenda-central/API.md`)

## Fonctionnalités

- **Agenda journalier** : bandeau de jours, navigation jour précédent/suivant,
  stats du jour (total / confirmés / à confirmer)
- **Multi-établissements** : création de lieux d'exercice avec couleur,
  filtrage de l'agenda par établissement, établissement par défaut
- **Rendez-vous** : patient, téléphone, créneau (07h–18h, pas de 30 min,
  créneaux occupés et heures passées désactivés), durée, motif
- **Statuts** : à confirmer → confirmé → terminé / annulé
- **Rappels patient** :
  - WhatsApp : ouverture de `wa.me` avec message pré-rempli
  - SMS : ouverture de l'app SMS avec message pré-rempli
  - Push local programmable (15 min / 30 min / 1 h / 2 h avant le RDV)
- **Réglages** : nom du médecin (utilisé dans les messages), établissement
  par défaut, délai de rappel, test de notification, données de démonstration
- **Synchro agenda central** (local-first) :
  - Réglages → « Agenda central » : URL serveur + clé API médecin
  - Bouton **Synchroniser** : push des RDV locaux puis pull des changements
    serveur, fusion **last-write-wins** sur `updatedAt`
  - Identifiants générés côté client → upsert idempotent

## Démarrage

```bash
# 1. API centrale (Python + Docker)
cd backend/agenda-central && docker compose up -d

# 2. App mobile
cd mobile/doctor-agenda
npm install
npm start          # puis i / a selon la plateforme
```

> Émulateur Android : utilisez `http://10.0.2.2:4400` comme URL du serveur.
> Appareil réel : `http://<IP-de-votre-machine>:4400` (même Wi-Fi).
> Clé de démonstration : `demo-key-kpatcha`.

## Structure

```
doctor-agenda/
├── App.tsx                     # Providers + navigation
├── index.ts
├── app.json
├── src/
│   ├── navigation/RootNavigator.tsx   # Tabs + stack (modal création, détail)
│   ├── screens/
│   │   ├── AgendaScreen.tsx           # Vue jour + filtres + stats + FAB
│   │   ├── NewAppointmentScreen.tsx   # Formulaire de création
│   │   ├── AppointmentDetailScreen.tsx# Détail + actions + rappels
│   │   ├── EstablishmentsScreen.tsx   # Gestion des établissements
│   │   └── SettingsScreen.tsx         # Profil, rappels, démo
│   ├── components/
│   │   ├── DayStrip.tsx               # Bandeau de jours
│   │   └── AppointmentCard.tsx        # Carte de rendez-vous
│   ├── services/
│   │   ├── storage.ts                 # Persistance AsyncStorage
│   │   ├── api.ts                     # Client agenda central (push/pull)
│   │   └── notifications.ts           # Push + WhatsApp + SMS
│   ├── store/StoreContext.tsx         # État global + syncNow()
│   ├── types/index.ts
│   ├── theme.ts                       # Couleurs (vert LIKMED #179F4E)
│   └── utils/date.ts                  # Dates FR, créneaux
└── package.json
```

## Évolutions prévues

- Sync automatique (arrière-plan) + synchro des établissements
- Rappels distants (SMS/WhatsApp automatiques via l'API serveur)
- Vue semaine, récurrence des rendez-vous
- Lien de réservation patient (endpoints `/booking` déjà disponibles)
