// Rule-based self-triage engine.
// Deterministic on purpose: red flags always win, and the AI assistant can only
// make the advice MORE cautious, never less. Rules must be reviewed and signed
// off by the hospital's clinical team before going live.
(function () {
  // level: 1 = emergency now, 2 = urgent (within hours), 3 = book a visit, 4 = self-care
  const COMPLAINTS = [
    { id: 'chest', label: 'Chest pain or pressure', spec: 'cardio', flags: [
      { q: 'Pain spreading to arm, jaw, neck or back?', level: 1 },
      { q: 'Short of breath, sweating or feeling faint?', level: 1 },
      { q: 'Pain started suddenly in the last few hours?', level: 1 },
      { q: 'Pain only when you press on the chest or move?', level: 0 }
    ]},
    { id: 'breath', label: 'Trouble breathing', spec: 'gp', flags: [
      { q: 'Can you only speak a few words at a time?', level: 1 },
      { q: 'Lips or face turning blue or grey?', level: 1 },
      { q: 'Wheezing that your inhaler is not helping?', level: 2 }
    ]},
    { id: 'head', label: 'Headache', spec: 'neuro', flags: [
      { q: 'Worst headache of your life, came on suddenly?', level: 1 },
      { q: 'Face drooping, arm weakness or slurred speech?', level: 1 },
      { q: 'Stiff neck with fever or a rash?', level: 1 },
      { q: 'After a head injury?', level: 2 },
      { q: 'Vision changes or confusion?', level: 2 }
    ]},
    { id: 'fever', label: 'Fever / flu-like', spec: 'gp', flags: [
      { q: 'Rash that does not fade when pressed with a glass?', level: 1 },
      { q: 'Very drowsy, confused or hard to wake?', level: 1 },
      { q: 'Fever above 39.5°C (103°F) not coming down with medicine?', level: 2 },
      { q: 'Undergoing chemotherapy or immunosuppressed?', level: 2 }
    ]},
    { id: 'belly', label: 'Stomach / abdominal pain', spec: 'gastro', flags: [
      { q: 'Vomiting blood or black, tarry stools?', level: 1 },
      { q: 'Severe pain with a hard, rigid belly?', level: 1 },
      { q: 'Pain in the lower right side that keeps getting worse?', level: 2 },
      { q: 'Could you be pregnant?', level: 2 },
      { q: 'Unable to keep any fluids down for 24 hours?', level: 2 }
    ]},
    { id: 'injury', label: 'Injury, fall or wound', spec: 'ortho', flags: [
      { q: 'Heavy bleeding that will not stop with pressure?', level: 1 },
      { q: 'Bone visible or limb clearly deformed?', level: 1 },
      { q: 'Cannot put any weight on it / cannot move it?', level: 2 },
      { q: 'Deep cut that may need stitches?', level: 2 }
    ]},
    { id: 'skin', label: 'Rash or skin problem', spec: 'derm', flags: [
      { q: 'Swelling of lips, tongue or throat?', level: 1 },
      { q: 'Rash spreading fast with fever?', level: 2 },
      { q: 'A mole that changed shape, colour or bleeds?', level: 3 }
    ]},
    { id: 'throat', label: 'Sore throat, ear or sinus', spec: 'ent', flags: [
      { q: 'Drooling or unable to swallow saliva?', level: 1 },
      { q: 'Cannot open your mouth fully / muffled voice?', level: 2 },
      { q: 'Ear pain with swelling behind the ear?', level: 2 }
    ]},
    { id: 'urine', label: 'Urinary problem', spec: 'uro', flags: [
      { q: 'Unable to pass urine at all?', level: 2 },
      { q: 'Pain in your side/back with fever and shivering?', level: 2 },
      { q: 'Blood in urine?', level: 3 }
    ]},
    { id: 'eye', label: 'Eye problem', spec: 'ophth', flags: [
      { q: 'Sudden loss of vision?', level: 1 },
      { q: 'Chemical splash or object in the eye?', level: 2 },
      { q: 'Severe eye pain with redness and headache?', level: 2 }
    ]},
    { id: 'mental', label: 'Anxiety, low mood or stress', spec: 'psych', flags: [
      { q: 'Having thoughts of harming yourself or ending your life?', level: 1 },
      { q: 'Feeling unable to keep yourself safe today?', level: 1 },
      { q: 'Not sleeping or eating for several days?', level: 3 }
    ]},
    { id: 'pregnancy', label: 'Pregnancy concern', spec: 'gyn', flags: [
      { q: 'Heavy vaginal bleeding?', level: 1 },
      { q: 'Fluid leaking or regular contractions before 37 weeks?', level: 1 },
      { q: "Baby moving less than usual?", level: 2 },
      { q: 'Severe headache, swelling of face or hands?', level: 2 }
    ]},
    { id: 'other', label: 'Something else', spec: 'gp', flags: [
      { q: 'Fainted or collapsed?', level: 1 },
      { q: 'Sudden weakness, numbness or confusion?', level: 1 }
    ]}
  ];

  const LEVELS = {
    1: { key: 'l1', title: 'Emergency — get help now',
      action: 'Call the emergency number or go to the Emergency Department immediately. Do not drive yourself.',
      wait: 'Now' },
    2: { key: 'l2', title: 'Urgent — be seen within a few hours',
      action: 'Go to Urgent Care / the Emergency Department today, or request an urgent same-day slot.',
      wait: 'Within 2–4 hours' },
    3: { key: 'l3', title: 'See a doctor soon',
      action: 'Book an appointment in the next 1–3 days. A video consultation may be enough.',
      wait: '1–3 days' },
    4: { key: 'l4', title: 'Self-care is likely fine',
      action: 'Rest, fluids and over-the-counter remedies. Book a routine visit if it does not improve in a few days or gets worse.',
      wait: 'Routine' }
  };

  const SELF_CARE = {
    fever: ['Drink plenty of fluids', 'Rest', 'Paracetamol/ibuprofen as per the label', 'Re-check if fever lasts more than 3 days'],
    throat: ['Warm drinks, honey, lozenges', 'Salt-water gargle', 'Re-check if not better in a week'],
    head: ['Water, rest in a dark room', 'Simple painkillers as per label', 'Keep a headache diary'],
    skin: ['Avoid scratching, use fragrance-free moisturiser', 'Note any new products or foods'],
    belly: ['Small sips of water or oral rehydration', 'Bland food', 'Avoid alcohol and fatty food'],
    injury: ['Rest, Ice, Compression, Elevation (RICE)', 'Painkillers as per label'],
    mental: ['Talk to someone you trust', 'Keep a regular sleep routine', 'Short walks and daylight help'],
    default: ['Rest and stay hydrated', 'Monitor your symptoms', 'Run the check again if anything changes']
  };

  function assess(a) {
    // a = { complaint, flags:[bool], age, severity, days, conditions:[...], pregnant }
    const c = COMPLAINTS.find(x => x.id === a.complaint) || COMPLAINTS[COMPLAINTS.length - 1];
    const reasons = [];
    let level = 4;
    const bump = (l, why) => { if (l && l < level) level = l; if (why) reasons.push(why); };

    c.flags.forEach((f, i) => { if (a.flags[i] && f.level) bump(f.level, f.q.replace(/\?$/, '')); });

    const sev = Number(a.severity) || 0;
    if (sev >= 8) bump(2, 'Severe pain/discomfort (' + sev + '/10)');
    else if (sev >= 5) bump(3, 'Moderate symptoms (' + sev + '/10)');

    if (a.age === 'infant' && a.complaint === 'fever') bump(2, 'Fever in a baby under 3 months');
    if (a.age === 'infant') bump(3, 'Babies should be checked by a clinician');
    if (a.age === 'senior' && sev >= 5) bump(2, 'Age over 75 with moderate symptoms');
    if ((a.conditions || []).length && sev >= 4) bump(3, 'Existing condition: ' + a.conditions.join(', '));
    if (a.pregnant && level > 3) bump(3, 'Pregnancy');
    if (a.days === 'weeks') bump(3, 'Symptoms lasting more than 2 weeks');

    const spec = a.age === 'child' || a.age === 'infant' ? 'peds' : c.spec;
    return {
      level, info: LEVELS[level], reasons, spec, complaint: c,
      selfCare: SELF_CARE[c.id] || SELF_CARE.default
    };
  }

  // Very small keyword router used when the AI endpoint is unavailable.
  const KEYWORDS = [
    [/chest|heart|palpit/i, 'chest'], [/breath|asthma|wheez/i, 'breath'], [/head|migraine/i, 'head'],
    [/fever|flu|cold|temperature/i, 'fever'], [/stomach|belly|abdom|vomit|diarr/i, 'belly'],
    [/fall|injur|cut|broke|sprain|wound/i, 'injury'], [/rash|skin|itch|mole|acne/i, 'skin'],
    [/throat|ear|sinus|nose/i, 'throat'], [/urin|pee|bladder|kidney/i, 'urine'], [/eye|vision|see/i, 'eye'],
    [/anx|depress|stress|panic|sad|sleep|suicid|self.?harm/i, 'mental'], [/pregnan/i, 'pregnancy']
  ];
  const EMERGENCY_WORDS = /can'?t breathe|unconscious|not breathing|suicid|kill myself|seizure|stroke|heavy bleeding|overdose|chest pain/i;
  function guessComplaint(text) {
    const hit = KEYWORDS.find(([re]) => re.test(text));
    return hit ? hit[1] : 'other';
  }

  window.Triage = { COMPLAINTS, LEVELS, assess, guessComplaint, EMERGENCY_WORDS };
})();
