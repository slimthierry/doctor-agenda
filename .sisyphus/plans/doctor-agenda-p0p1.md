# Plan — Doctor Agenda P0+P1 : améliorations métier & business

## Objectif

Rendre l'app crédible pour un **praticien libéral (cabinet)** en implémentant 5 fonctionnalités :

1. **Anti-chevauchement + disponibilités réelles** (cohérence app ↔ backend)
2. **Réservation patient par lien** (page web publique servie par le backend)
3. **Patients récurrents + historique** (dérivés des rendez-vous)
4. **Rendez-vous récurrents** (séries hebdo/bimensuel/mensuel)
5. **Rappels serveur automatiques** (SMS/WhatsApp même téléphone éteint)

## Périmètre

- App mobile : `/Users/thierrysessou/Developer/Projects/mobile/doctor-agenda`
- Backend : `/Users/thierrysessou/Developer/Projects/backend/agenda-central` (hors répertoire de travail courant, chemin absolu)

## Décisions de conception (validées)

| Sujet                  | Décision                                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moteur de créneaux app | Portage exact de `app/slots.py` + `app/utils.py` (`overlaps`, `weekday_of` 0=dim, `free_slots`) — une seule vérité métier                                                                                                                                                               |
| Disponibilités         | Local-first : règles stockées localement, `PUT /api/availability` au save si serveur configuré, pull au sync. Fallback lun-sam 08:00–18:00 si aucune règle (comportement seed)                                                                                                          |
| Récurrence             | Champ `series_id` nullable ajouté au modèle `Appointment` (migration `0002`). Création en lot côté app, IDs clients → upsert sync existant OK                                                                                                                                           |
| Page booking           | HTML autonome servie par FastAPI sur `GET /b/{slug}` (JS inline, zéro infra). Nouveau `GET /booking/{slug}` public (doctor + establishments) pour alimenter la page                                                                                                                     |
| Patients               | **Dérivés** des rendez-vous agrégés par `patient_phone` (nom = dernière valeur) — pas d'entité à migrer, couvre aussi les RDV `source:patient` après pull                                                                                                                               |
| Rappels serveur        | Tâche de fond FastAPI (lifespan) toutes les ~45 s + table colonnes `reminder_sent_at` (+ reset si date/heure modifiée). Sender abstrait : Twilio SMS si `TWILIO_*` présent, sinon sender log (marque envoyé pour éviter les boucles). Lead configurable `REMINDER_LEAD_MIN` (défaut 60) |
| Hors périmètre         | No-show, statistiques, onboarding, plans d'abonnement (étapes P2/P3 reportées)                                                                                                                                                                                                          |

---

## Phase 1 — Backend : modèle étendu + page booking

**Fichiers :**

- `app/models.py` : `Appointment.series_id: str | None`, `Appointment.reminder_sent_at: str | None`
- `alembic/versions/0002_series_reminders.py` : `op.add_column` × 2 (nullable, style 0001)
- `app/schemas.py` : inclure `series_id`, `reminder_sent_at` dans `appointment_dict`
- `app/routes/sync.py` : valider/accepter `series_id` (`optional_string`) dans le push ; à la mise à jour, si `date`/`time`/`duration_min` change → `reminder_sent_at = None`
- `app/routes/doctor.py` : accepter `series_id` optionnel sur POST/PATCH ; même reset reminder si le slot bouge
- `app/routes/booking.py` :
  - `GET /booking/{slug}` → JSON `{doctor, establishments}` (public, pour la page)
  - `GET /b/{slug}` → HTML autonome (FR, mobile-first) : choix date (7 jours glissants), créneaux via `/booking/{slug}/slots`, formulaire nom/téléphone/motif, POST appointment, confirmation. Durée par défaut 30 min, établissement unique pré-sélectionné (liste si >1)
- `app/config.py` : `reminder_lead_min: int = 60`, `twilio_account_sid/sid_key/from_number: str = ""`
- `app/reminders.py` (nouveau) : `send_reminder(appt) -> bool` (Twilio ou log), boucle `asyncio` démarrée dans le lifespan de `app/main.py`, requête : status ∈ (draft, confirmed), `patient_phone` non vide, `reminder_sent_at IS NULL`, `now >= start - lead`, `now < start`
- `tests/test_smoke.py` : étendre — série + champs reminder dans sync, `GET /b/{slug}` 200 HTML, `GET /booking/{slug}` 200, reminder idempotent (2e appel ne renvoie rien)

**Vérification :** `cd backend/agenda-central && .venv/bin/python -m pytest` (ou `python -m pytest`), `alembic upgrade head` sur base docker.

---

## Phase 2 — App : moteur de créneaux + disponibilités

**Fichiers :**

- `src/types/index.ts` : `AvailabilityRule {id, establishmentId?, weekday, start, end}`, `Appointment.seriesId?`, `Settings.doctorSlug?`, `Settings.availabilityUpdatedAt?`
- `src/utils/slots.ts` (nouveau) : `minutesOf`, `hhmm`, `overlaps`, `weekdayOf` (JS `getDay()`), `defaultRules()` (lun-sam 08:00–18:00), `rulesForDay(rules, date, establishmentId)`, `freeSlots(rules, appointments, date, durationMin, establishmentId, nowMinutes?)` — logique identique à `free_slots` backend
- `src/services/storage.ts` : clé `@doctor-agenda/availability` + load/save
- `src/services/api.ts` : `fetchAvailability`, `putAvailability` (PUT remplace tout), `fetchBookingInfo` (GET /api/me → slug déjà présent)
- `src/store/StoreContext.tsx` : état `availability`, `saveAvailability` (local + PUT si serveur), au `syncNow` : pull `GET /api/availability` → remplace si serveur plus récent que `availabilityUpdatedAt`
- `src/screens/NewAppointmentScreen.tsx` :
  - remplacer `timeSlots(7,18,30)` par `freeSlots(...)` avec durée courante, règles du jour, et **désactivation par chevauchement durée** (fin de l'ancien `taken` exact-match)
  - régénérer les créneaux quand `durationMin` change
  - garde-fou local avant save : si chevauchement (par sécurité), message d'erreur
- `src/screens/AvailabilityScreen.tsx` (nouveau) : éditeur de règles — 7 lignes de jours (lun→dim), start/end par jour (time picker simple chips 07:00…22:00 ou TextInput HH:mm), toggle "consultation", sauvegarde
- `src/navigation/RootNavigator.tsx` : route stack `Availability` (accessible depuis Réglages)
- `src/screens/SettingsScreen.tsx` : section « Mes horaires » → bouton vers AvailabilityScreen

**Vérification :** `npm run typecheck` ; test manuel : un RDV 60 min à 09:00 désactive 09:00–09:59.

---

## Phase 3 — App : rendez-vous récurrents

- `src/types/index.ts` : `Appointment.seriesId?: string`
- `src/screens/NewAppointmentScreen.tsx` : section « Récurrent » — chips : Une fois / Hebdo / Bimensuel / Mensuel + « occurrences » (2–12, défaut 4). À la création : boucle `addAppointment` avec dates via `addDays` (7k / 14k) ou `addMonths` (nouveau dans `src/utils/date.ts`, clamp fin de mois), même `seriesId` (`uid()`), même heure/durée/lieu/motif. Pré-vérifier chaque date avec `freeSlots`/`overlaps` ; en cas de conflit sur une occurrence → Alert (« Ignorer les créneaux pris » / « Annuler »), création des occurrences libres uniquement
- `src/screens/AppointmentDetailScreen.tsx` : si `seriesId`, badge « Série » + bouton « Annuler les prochains de la série » (statut `canceled` sur les futurs de la même série, historique conservé)
- `src/components/AppointmentCard.tsx` : petit indicateur icône série si `seriesId` (optionnel)

---

## Phase 4 — App : patients récurrents + historique

- `src/store/StoreContext.tsx` : `usePatients` dérivé — regroupe `appointments` par `patientPhone ?? name`, agrège `{id, name, phone, visits, lastDate}`, trié par dernière date desc
- `src/screens/NewAppointmentScreen.tsx` : quand 3+ caractères saisis dans téléphone ou nom → liste « Patients connus » (FlatList sous le champ), tap = pré-remplissage nom+téléphone
- `src/screens/PatientsScreen.tsx` (nouveau, tab « Patients ») : recherche + liste (nom, téléphone, nb visites, dernière visite)
- `src/screens/PatientDetailScreen.tsx` (nouveau, stack) : historique complet (passés + à venir), réutilise `AppointmentCard`, tap → détail RDV existant
- `src/navigation/RootNavigator.tsx` : 4ᵉ tab `Patients` + route stack `PatientDetail`

---

## Phase 5 — App : lien de réservation

- `src/store/StoreContext.tsx` : après `fetchMe` réussi dans `syncNow`, mémoriser `settings.doctorSlug`
- `src/screens/SettingsScreen.tsx` : section « Réservation en ligne » — affiche `{serverUrl}/b/{slug}`, boutons **Copier** (Clipboard) et **Partager** (Share API). Si slug manquant : bouton « Récupérer le lien » qui appelle `fetchMe`. Si serveur non configuré : état vide avec CTA vers config sync

---

## Phase 6 — Rappels serveur (finition app)

- `src/types/index.ts` : `Appointment.reminderSentAt?: string` (remonté par sync)
- `src/services/api.ts` : champs `series_id` / `reminder_sent_at` dans `ServerAppointment` + `toServer`/`fromServer`
- `src/screens/AppointmentDetailScreen.tsx` : si `reminderSentAt` → ligne d'info « Rappel envoyé par le serveur le … » ; le rappel push local reste actionnable en complément
- Le lead des rappels serveur est piloté côté serveur (env) — pas de UI app supplémentaire

---

## Phase 7 — Tests, docs, vérification finale

- Backend : pytest vert (smoke étendu + booking page + reminders)
- Mobile : `npm run typecheck` vert
- `README.md` (mobile) : ajouter les 5 fonctionnalités, section « Réservation patient » (`/b/dr-kpatcha`), configuration rappels serveur (`TWILIO_*`, `REMINDER_LEAD_MIN`)
- `backend/agenda-central/API.md` : documenter `GET /booking/{slug}`, `GET /b/{slug}` (HTML), champs `series_id`/`reminder_sent_at`
- `backend/agenda-central/.env.example` : ajouter `REMINDER_LEAD_MIN`, `TWILIO_*`

## Ordre d'exécution

1 → 2 → 3 → 4 → 5 → 6 → 7 (chaque phase indépendamment typecheckable ; la phase 1 pose les champs consommés ensuite par 3 et 6).

## Risques / pièges

- Ne **pas** casser la synchro LWW : `series_id` et `reminder_sent_at` sont optionnels dans le push, jamais exigés
- `weekday_of` backend : 0 = dimanche — le portage JS `getDay()` (0 = dimanche) est naturellement compatible, ne pas utiliser le `weekDays()` lundi=0 de l'app
- La boucle reminders ne doit tourner qu'une fois par process (guard dans lifespan), et le sender log **marque** `reminder_sent_at` (sinon boucle infinie de logs)
- La page `/b/{slug}` est publique : n'exposer que doctor.name, slug, establishments (pas d'email/api_key)
- `docker-compose` applique `alembic upgrade head` au démarrage → migration 0002 suffit, pas de `create_all` en prod

## Critères d'acceptation

- [ ] Créer un RDV 60 min rend indisponibles les créneaux qui chevauchent (y compris depuis une réservation patient)
- [ ] Les horaires édités dans « Mes horaires » pilotent les créneaux proposés, avec/sans serveur
- [ ] « Hebdo ×4 » crée 4 RDV ; annuler la série annule les futurs
- [ ] Saisir un téléphone déjà connu pré-remplit et retrouve l'historique dans l'onglet Patients
- [ ] Réglages affiche/copie/partage le lien `/b/{slug}` ; ouvrir ce lien dans un navigateur permet de réserver un créneau libre
- [ ] Un RDV `confirmed` avec téléphone reçoit (ou journalise en dev) un rappel serveur à T-lead ; ne jamais deux fois ; un décalage de date renvoie le rappel
- [ ] `pytest` et `npm run typecheck` verts
