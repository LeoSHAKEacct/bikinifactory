# CareFlow — AI for hospitals: patients + staff

## 1. What's built (patient app, `hospital/`)

| Feature | What it does |
|---|---|
| Symptom check (self-triage) | 5-step wizard: age → main problem → danger signs → severity/duration → conditions. Gives a **Manchester Triage System colour**: 🔴 Red (immediate) · 🟠 Orange (10 min) · 🟡 Yellow (60 min) · 🟢 Green (2 h) · 🔵 Blue (4 h), with what to do next. A Red/Orange danger sign skips the rest of the questions. It's shown as an *estimate*; the triage nurse confirms the official colour on arrival. |
| Booking | Specialty → doctors ranked by earliest slot → 14-day calendar → time → details. Choice of in person or video. Urgent triage results show the earliest slots first. |
| My visits | Upcoming and past visits; check in on the day; reschedule; cancel (frees the slot); add to calendar (.ics). |
| Check-in → reception (WhatsApp) | After the symptom check (or from an appointment on the day), the patient enters their details: name, DOB, sex, phone, ID, insurance, allergies, medicines, emergency contact, arrival time. A WhatsApp button sends reception a ready-made message headed with the **triage colour** (🔴🟠🟡🟢🔵), complaint, danger signs and details. Set the number in `data.js` → `receptionWhatsApp`. Later this becomes the staff Triage inbox. |
| Pre-visit form | Concern, medicines, allergies, questions, consent. The doctor sees it before the visit. |
| AI assistant | Free-text chat (`/api/assistant`, Claude). Words that point to an emergency are caught *before* the AI is called. The AI can only make the advice more cautious, never less. If no API key is set, it falls back to keyword routing. |
| Emergency page | One tap to call, list of danger signs, ER info. |

**Demo limits:** doctors and slots are sample data and appointments are saved in the browser. Going live needs a backend connected to the hospital's scheduling/EHR system (section 4).

---

## 2. More AI ideas for patients (next)

1. **Voice and WhatsApp booking.** The same assistant on the phone line and on WhatsApp. Takes load off the call centre and helps older patients.
2. **Smart waitlist.** When someone cancels, the AI offers the slot to waitlisted patients by urgency, then by distance.
3. **No-show prediction and reminders.** Score the risk for each booking. High-risk visits get extra reminders and a "confirm or release" button.
4. **Live ER wait times.** Predicted wait per site, with directions to the least busy one.
5. **"Explain my results."** Turns lab results and discharge letters into plain language in the patient's own language, *after* a clinician has released them.
6. **Prep coach.** Step-by-step guidance before procedures (fasting, colonoscopy prep), with timed push messages.
7. **Medication reminders.** Reminders plus "I missed a dose, what do I do?" answers that follow the hospital's protocols.
8. **Post-discharge check-ins.** Daily symptom questions for 14 days. Red flags alert a nurse, which helps cut readmissions.
9. **Translation.** Every screen and chat in the patient's language. Live interpreter for video visits.
10. **Billing and insurance helper.** Cost estimates, pre-authorisation status, "why was I charged this?"
11. **Indoor wayfinding.** "Take me to Radiology" from the hospital entrance.
12. **Family accounts.** Manage children's and elderly parents' visits, with consent.

---

## 3. Plan for the staff side ("CareFlow Staff")

### Principle
AI **drafts, sorts and summarises**. A human **decides and signs**. Every AI output shows its sources, can be edited, and is logged.

### Modules, ranked by return ÷ difficulty

| # | Module | Users | What it does | Why first |
|---|---|---|---|---|
| 1 | **Triage inbox** | Front desk, triage nurses | All symptom checks, chats and pre-visit forms in one queue, sorted by Manchester colour; the nurse confirms or changes the colour on arrival. One-click actions: call back, book urgent, send to ER. | Already fed by the patient app. Safety value from day one. |
| 2 | **Pre-visit brief** | Doctors | One screen per patient: reason, triage answers, medicines, allergies, recent results, open questions. Ready before the visit. | Saves 3–5 minutes per visit. Low risk because it's read-only. |
| 3 | **Ambient scribe** | Doctors, nurses | Records the visit (with consent) and drafts the SOAP note, orders, referral letter and patient summary. The clinician edits and signs. | The biggest time-saver in healthcare AI today. Reduces burnout. |
| 4 | **Scheduling optimiser** | Admin, ops | Fills gaps from the waitlist, overbooks based on no-show risk, balances doctors' lists, forecasts demand by specialty and week. | Direct revenue: fewer empty slots. |
| 5 | **Bed and flow command centre** | Bed managers, ER leads | Live bed board, predicted discharges in the next 24h, ER arrival forecast, alerts for long boarders. | Shorter ER waits. Needs good ADT data. |
| 6 | **Nurse handover and shift summary** | Nurses | Auto-drafts the SBAR handover from the chart and the last shift's notes. Flags vitals that are getting worse (early-warning scores). | Safety plus time saved at every shift change. |
| 7 | **Coding and billing assistant** | Billing, coders | Suggests ICD/CPT codes from notes, finds missing documentation before claims go out, drafts appeals for denied claims. | Clear return on investment. Easy for the finance team to approve. |
| 8 | **Policy and protocol copilot** | All staff | "What's our sepsis protocol?" or "How do I order X in the system?" Answers come only from the hospital's own documents, with citations. | Cheap to build. Everyone uses it. |
| 9 | **Staff rostering** | Managers | Builds rosters within rules (hours, skills, preferences, fairness). Handles swap requests. | Saves nurse-manager time. Helps keep staff. |
| 10 | **Supply and pharmacy forecasting** | Pharmacy, supply chain | Predicts stock use, alerts on expiry and shortages, flags unusual use of controlled drugs. | Less waste. Better compliance. |
| 11 | **Quality and incident analysis** | Quality team | Groups incident reports and complaints, finds trends, drafts reports. | Turns unstructured text into actions. |
| 12 | **Training and onboarding tutor** | New staff | Practice cases, quizzes on protocols, simulated patient conversations. | Faster onboarding. |

### Roadmap

**Phase 0: Foundations (weeks 0–6)**
- Staff login with single sign-on (Microsoft Entra / Google) and role-based access (doctor, nurse, front desk, admin, billing).
- Backend: Postgres with an audit log on every read and write, encryption, hosting in the hospital's region.
- Connect to the EHR/HIS through **HL7 FHIR** (Patient, Appointment, Schedule, Slot, Encounter, Observation, MedicationStatement, AllergyIntolerance). Start by reading only.
- Move the patient app from saving in the browser to this backend. Add patient accounts with OTP login.
- Governance: a clinical safety officer signs off the triage rules. Get a data protection impact assessment and a signed data processing agreement with the AI provider (no training on hospital data).

**Phase 1: Front-door pilot (weeks 6–14)**: modules 1, 2 and 8
- Pilot with 1 clinic and 1 front-desk team.
- Measure: time to callback for urgent triages, call-centre volume, minutes saved per visit, staff satisfaction.

**Phase 2: Clinical documentation (weeks 14–26)**: modules 3 and 6
- Ambient scribe pilot with 10–20 volunteer clinicians, under explicit patient consent rules.
- Measure: documentation time, time spent after hours, note quality (audit a sample), edit rate.

**Phase 3: Operations (months 6–12)**: modules 4, 5, 7 and 9
- Needs 6–12 months of historical schedule and admissions data for forecasting.
- Measure: no-show rate, slot use, ER door-to-doctor time, length of stay, claim denial rate.

**Phase 4: Scale (12+ months)**: modules 10, 11 and 12, more sites and languages.

### Architecture (simple version)

```
Patient app ─┐                      ┌─ EHR / HIS (FHIR)
Staff app  ──┼─ API (auth, audit) ──┼─ Postgres (appointments, triage, forms)
WhatsApp/voice┘        │            └─ Document store (protocols, for the policy copilot)
                       └─ AI layer: Claude API with guardrails
                          (rules-first triage, PHI redaction in logs, human sign-off, eval set)
```

### Safety and compliance checklist
- Triage rules are versioned and signed off by clinicians. Test them against a set of 200+ cases before every release, with **zero missed emergencies** as a hard gate.
- The AI can never lower a rules-based triage level.
- Every AI draft is labelled as such and needs a human signature to enter the medical record.
- Comply with local law: GDPR/LGPD/HIPAA depending on country. Software that triages may count as a **medical device** (EU MDR / ANVISA / FDA SaMD), so check with regulatory early.
- Audit logs, data minimisation, data stays in-region, a business associate agreement / DPA with every vendor.
- Bias checks: compare triage results by age, sex and language.

### Business model (if selling to hospitals)
- SaaS per site: patient app + triage inbox as the entry product.
- Add-ons: scribe charged per clinician per month, operations suite charged per bed.
- Pilot: 90 days at a fixed price with agreed KPIs, then convert to an annual contract.

---

## 4. To take the patient app to production
1. Backend plus FHIR connection for real slots and bookings (replace `data.js` and saving in the browser).
2. Patient accounts (phone OTP) and consent records.
3. SMS/WhatsApp reminders (24h and 2h before), and a waitlist.
4. Clinical sign-off of `triage.js` rules and translation into the local language(s).
5. Set `ANTHROPIC_API_KEY` in the Vercel project to turn on the AI assistant.
6. Hospital branding: name, logo, emergency number and address in `data.js`.
