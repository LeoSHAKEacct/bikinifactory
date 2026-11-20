// Rule-based self-triage engine.
// Deterministic on purpose: red flags always win, and the AI assistant can only
// make the advice MORE cautious, never less. Rules must be reviewed and signed
// off by the hospital's clinical team before going live.
(function () {
  // Levels follow the Manchester Triage System (MTS) colours used in hospital ERs:
  // 1 RED immediate · 2 ORANGE very urgent (10 min) · 3 YELLOW urgent (60 min)
  // 4 GREEN standard (120 min) · 5 BLUE non-urgent (240 min)
  // This is a patient-side ESTIMATE; the official colour is given by the triage nurse on arrival.
  const COMPLAINTS = [
    { id: 'chest', label: 'Chest pain or pressure', spec: 'cardio', flags: [
      { q: 'Short of breath, grey/sweaty or about to faint?', level: 1 },
      { q: 'Pain spreading to arm, jaw, neck or back?', level: 2 },
      { q: 'Pain started suddenly in the last few hours?', level: 2 },
      { q: 'Heart racing or irregular right now?', level: 3 },
      { q: 'Pain only when you press on the chest or move?', level: 0 }
    ]},
    { id: 'breath', label: 'Trouble breathing', spec: 'gp', flags: [
      { q: 'Lips or face turning blue or grey?', level: 1 },
      { q: 'Can you only speak a few words at a time?', level: 2 },
      { q: 'Wheezing that your inhaler is not helping?', level: 3 }
    ]},
    { id: 'head', label: 'Headache', spec: 'neuro', flags: [
      { q: 'Face drooping, arm weakness or slurred speech?', level: 2 },
      { q: 'Worst headache of your life, came on suddenly?', level: 2 },
      { q: 'Stiff neck with fever or a rash?', level: 2 },
      { q: 'After a head injury?', level: 3 },
      { q: 'Vision changes or confusion?', level: 3 }
    ]},
    { id: 'fever', label: 'Fever / flu-like', spec: 'gp', flags: [
      { q: 'Very drowsy, confused or hard to wake?', level: 1 },
      { q: 'Rash that does not fade when pressed with a glass?', level: 2 },
      { q: 'Undergoing chemotherapy or immunosuppressed?', level: 2 },
      { q: 'Fever above 39.5°C (103°F) not coming down with medicine?', level: 3 }
    ]},
    { id: 'belly', label: 'Stomach / abdominal pain', spec: 'gastro', flags: [
      { q: 'Vomiting blood or black, tarry stools?', level: 2 },
      { q: 'Severe pain with a hard, rigid belly?', level: 2 },
      { q: 'Could you be pregnant?', level: 3 },
      { q: 'Pain in the lower right side that keeps getting worse?', level: 3 },
      { q: 'Unable to keep any fluids down for 24 hours?', level: 3 }
    ]},
    { id: 'injury', label: 'Injury, fall or wound', spec: 'ortho', flags: [
      { q: 'Heavy bleeding that will not stop with pressure?', level: 1 },
      { q: 'Bone visible or limb clearly deformed?', level: 2 },
      { q: 'Cannot put any weight on it / cannot move it?', level: 3 },
      { q: 'Deep cut that may need stitches?', level: 4 }
    ]},
    { id: 'skin', label: 'Rash or skin problem', spec: 'derm', flags: [
      { q: 'Swelling of lips, tongue or throat?', level: 1 },
      { q: 'Rash spreading fast with fever?', level: 3 },
      { q: 'A mole that changed shape, colour or bleeds?', level: 4 }
    ]},
    { id: 'throat', label: 'Sore throat, ear or sinus', spec: 'ent', flags: [
      { q: 'Drooling or unable to swallow saliva?', level: 1 },
      { q: 'Cannot open your mouth fully / muffled voice?', level: 3 },
      { q: 'Ear pain with swelling behind the ear?', level: 3 }
    ]},
    { id: 'urine', label: 'Urinary problem', spec: 'uro', flags: [
      { q: 'Unable to pass urine at all?', level: 3 },
      { q: 'Pain in your side/back with fever and shivering?', level: 3 },
      { q: 'Blood in urine?', level: 4 }
    ]},
    { id: 'eye', label: 'Eye problem', spec: 'ophth', flags: [
      { q: 'Sudden loss of vision?', level: 2 },
      { q: 'Chemical splash in the eye?', level: 2 },
      { q: 'Severe eye pain with redness and headache?', level: 3 },
      { q: 'Object stuck in the eye?', level: 3 }
    ]},
    { id: 'mental', label: 'Anxiety, low mood or stress', spec: 'psych', flags: [
      { q: 'Feeling unable to keep yourself safe right now?', level: 1 },
      { q: 'Having thoughts of harming yourself or ending your life?', level: 2 },
      { q: 'Not sleeping or eating for several days?', level: 4 }
    ]},
    { id: 'pregnancy', label: 'Pregnancy concern', spec: 'gyn', flags: [
      { q: 'Heavy vaginal bleeding?', level: 1 },
      { q: 'Fluid leaking or regular contractions before 37 weeks?', level: 2 },
      { q: 'Severe headache, swelling of face or hands?', level: 2 },
      { q: 'Baby moving less than usual?', level: 3 }
    ]},
    { id: 'other', label: 'Something else', spec: 'gp', flags: [
      { q: 'Unconscious, fitting or not responding normally?', level: 1 },
      { q: 'Fainted or collapsed?', level: 2 },
      { q: 'Sudden weakness, numbness or confusion?', level: 2 }
    ]}
  ];

  const LEVELS = {
    1: { key: 'l1', color: 'Red', name: 'Immediate', target: 'Seen immediately', emergency: true,
      title: 'RED — Immediate',
      action: 'Call the emergency number now. Do not drive yourself. If possible, stay with the person until help arrives.' },
    2: { key: 'l2', color: 'Orange', name: 'Very urgent', target: 'Seen within 10 minutes', emergency: true,
      title: 'ORANGE — Very urgent',
      action: 'Go to the Emergency Department now or call the emergency number. Do not wait for an appointment.' },
    3: { key: 'l3', color: 'Yellow', name: 'Urgent', target: 'Seen within 60 minutes', urgent: true,
      title: 'YELLOW — Urgent',
      action: 'Go to the Emergency Department or Urgent Care today, or take the earliest same-day slot.' },
    4: { key: 'l4', color: 'Green', name: 'Standard', target: 'Seen within 2 hours', 
      title: 'GREEN — Standard',
      action: 'Not an emergency. Book an appointment in the next 1–3 days — a video consultation may be enough.' },
    5: { key: 'l5', color: 'Blue', name: 'Non-urgent', target: 'Seen within 4 hours',
      title: 'BLUE — Non-urgent',
      action: 'Self-care is likely fine. Book a routine visit if it does not improve in a few days or gets worse.' }
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
    let level = 5;
    const bump = (l, why) => { if (l && l < level) level = l; if (why) reasons.push(why); };

    c.flags.forEach((f, i) => { if (a.flags[i] && f.level) bump(f.level, f.q.replace(/\?$/, '')); });

    const sev = Number(a.severity) || 0;
    if (sev >= 8) bump(3, 'Severe pain/discomfort (' + sev + '/10)');
    else if (sev >= 5) bump(4, 'Moderate symptoms (' + sev + '/10)');

    if (a.age === 'infant' && a.complaint === 'fever') bump(2, 'Fever in a baby under 3 months');
    if (a.age === 'infant') bump(4, 'Babies should be checked by a clinician');
    if (a.age === 'senior' && sev >= 5) bump(3, 'Age over 75 with moderate symptoms');
    if ((a.conditions || []).length && sev >= 4) bump(4, 'Existing condition: ' + a.conditions.join(', '));
    if (a.pregnant) bump(4, 'Pregnancy');
    if (a.days === 'weeks') bump(4, 'Symptoms lasting more than 2 weeks');

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
