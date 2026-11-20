// Motor de autotriaje basado en reglas.
// Es determinista a propósito: las señales de alarma siempre mandan, y el asistente de IA
// solo puede hacer la recomendación MÁS prudente, nunca menos. Las reglas deben ser
// revisadas y aprobadas por el equipo clínico del hospital antes de usarse con pacientes.
(function () {
  // Niveles del Sistema de Triaje Manchester (STM), los colores usados en Urgencias:
  // 1 ROJO inmediato · 2 NARANJA muy urgente (10 min) · 3 AMARILLO urgente (60 min)
  // 4 VERDE estándar (120 min) · 5 AZUL no urgente (240 min)
  // Es una ESTIMACIÓN del paciente; el color oficial lo asigna la enfermera de triaje al llegar.
  const COMPLAINTS = [
    { id: 'chest', label: 'Dolor u opresión en el pecho', spec: 'cardio', flags: [
      { q: '¿Te falta el aire, estás pálido/sudoroso o a punto de desmayarte?', level: 1 },
      { q: '¿El dolor se extiende al brazo, la mandíbula, el cuello o la espalda?', level: 2 },
      { q: '¿El dolor empezó de repente en las últimas horas?', level: 2 },
      { q: '¿El corazón late muy rápido o de forma irregular ahora mismo?', level: 3 },
      { q: '¿Solo duele al presionar el pecho o al moverte?', level: 0 }
    ]},
    { id: 'breath', label: 'Dificultad para respirar', spec: 'gp', flags: [
      { q: '¿Labios o cara azulados o grisáceos?', level: 1 },
      { q: '¿Solo puedes decir unas pocas palabras seguidas?', level: 2 },
      { q: '¿Pitos al respirar que no mejoran con tu inhalador?', level: 3 }
    ]},
    { id: 'head', label: 'Dolor de cabeza', spec: 'neuro', flags: [
      { q: '¿Cara caída, debilidad en un brazo o habla arrastrada?', level: 2 },
      { q: '¿El peor dolor de cabeza de tu vida, de aparición brusca?', level: 2 },
      { q: '¿Rigidez de cuello con fiebre o manchas en la piel?', level: 2 },
      { q: '¿Después de un golpe en la cabeza?', level: 3 },
      { q: '¿Cambios en la visión o confusión?', level: 3 }
    ]},
    { id: 'fever', label: 'Fiebre / gripe', spec: 'gp', flags: [
      { q: '¿Muy somnoliento, confuso o cuesta despertarlo?', level: 1 },
      { q: '¿Manchas en la piel que no desaparecen al presionar con un vaso?', level: 2 },
      { q: '¿En quimioterapia o con las defensas bajas?', level: 2 },
      { q: '¿Fiebre de más de 39,5 °C que no baja con medicación?', level: 3 }
    ]},
    { id: 'belly', label: 'Dolor de estómago / abdominal', spec: 'gastro', flags: [
      { q: '¿Vómitos con sangre o heces negras?', level: 2 },
      { q: '¿Dolor intenso con el abdomen duro como una tabla?', level: 2 },
      { q: '¿Podrías estar embarazada?', level: 3 },
      { q: '¿Dolor en la parte baja derecha que va a más?', level: 3 },
      { q: '¿No toleras ningún líquido desde hace 24 horas?', level: 3 }
    ]},
    { id: 'injury', label: 'Lesión, caída o herida', spec: 'ortho', flags: [
      { q: '¿Sangrado abundante que no para al presionar?', level: 1 },
      { q: '¿Se ve el hueso o la extremidad está claramente deformada?', level: 2 },
      { q: '¿No puedes apoyar nada de peso o no puedes moverlo?', level: 3 },
      { q: '¿Corte profundo que puede necesitar puntos?', level: 4 }
    ]},
    { id: 'skin', label: 'Erupción o problema de piel', spec: 'derm', flags: [
      { q: '¿Hinchazón de labios, lengua o garganta?', level: 1 },
      { q: '¿Erupción que se extiende rápido con fiebre?', level: 3 },
      { q: '¿Un lunar que ha cambiado de forma o color, o que sangra?', level: 4 }
    ]},
    { id: 'throat', label: 'Garganta, oído o sinusitis', spec: 'ent', flags: [
      { q: '¿Babeas o no puedes tragar la saliva?', level: 1 },
      { q: '¿No puedes abrir bien la boca / voz apagada?', level: 3 },
      { q: '¿Dolor de oído con hinchazón detrás de la oreja?', level: 3 }
    ]},
    { id: 'urine', label: 'Problema al orinar', spec: 'uro', flags: [
      { q: '¿No puedes orinar nada?', level: 3 },
      { q: '¿Dolor en el costado/espalda con fiebre y escalofríos?', level: 3 },
      { q: '¿Sangre en la orina?', level: 4 }
    ]},
    { id: 'eye', label: 'Problema en los ojos', spec: 'ophth', flags: [
      { q: '¿Pérdida brusca de visión?', level: 2 },
      { q: '¿Salpicadura de un producto químico en el ojo?', level: 2 },
      { q: '¿Dolor de ojo intenso con enrojecimiento y dolor de cabeza?', level: 3 },
      { q: '¿Algo clavado en el ojo?', level: 3 }
    ]},
    { id: 'mental', label: 'Ansiedad, tristeza o estrés', spec: 'psych', flags: [
      { q: '¿Sientes que ahora mismo no puedes mantenerte a salvo?', level: 1 },
      { q: '¿Tienes pensamientos de hacerte daño o quitarte la vida?', level: 2 },
      { q: '¿Llevas varios días sin dormir o sin comer?', level: 4 }
    ]},
    { id: 'pregnancy', label: 'Consulta sobre el embarazo', spec: 'gyn', flags: [
      { q: '¿Sangrado vaginal abundante?', level: 1 },
      { q: '¿Pérdida de líquido o contracciones regulares antes de la semana 37?', level: 2 },
      { q: '¿Dolor de cabeza fuerte, hinchazón de cara o manos?', level: 2 },
      { q: '¿El bebé se mueve menos de lo normal?', level: 3 }
    ]},
    { id: 'other', label: 'Otra cosa', spec: 'gp', flags: [
      { q: '¿Inconsciente, con convulsiones o sin responder con normalidad?', level: 1 },
      { q: '¿Se ha desmayado o ha perdido el conocimiento?', level: 2 },
      { q: '¿Debilidad, adormecimiento o confusión repentinos?', level: 2 }
    ]}
  ];

  const LEVELS = {
    1: { key: 'l1', color: 'Rojo', name: 'Inmediato', target: 'Atención inmediata', emergency: true,
      title: 'ROJO — Inmediato',
      action: 'Llama ahora al número de emergencias. No conduzcas. Si puedes, quédate con la persona hasta que llegue la ayuda.' },
    2: { key: 'l2', color: 'Naranja', name: 'Muy urgente', target: 'Atención en 10 minutos', emergency: true,
      title: 'NARANJA — Muy urgente',
      action: 'Ve ahora a Urgencias o llama al número de emergencias. No esperes a una cita.' },
    3: { key: 'l3', color: 'Amarillo', name: 'Urgente', target: 'Atención en 60 minutos', urgent: true,
      title: 'AMARILLO — Urgente',
      action: 'Ve hoy a Urgencias o a un centro de atención urgente, o coge la primera cita disponible de hoy.' },
    4: { key: 'l4', color: 'Verde', name: 'Estándar', target: 'Atención en 2 horas',
      title: 'VERDE — Estándar',
      action: 'No es una emergencia. Pide cita en los próximos 1–3 días; una videoconsulta puede ser suficiente.' },
    5: { key: 'l5', color: 'Azul', name: 'No urgente', target: 'Atención en 4 horas',
      title: 'AZUL — No urgente',
      action: 'Probablemente basta con cuidados en casa. Pide una cita normal si no mejora en unos días o empeora.' }
  };

  const SELF_CARE = {
    fever: ['Bebe mucho líquido', 'Descansa', 'Paracetamol/ibuprofeno según el prospecto', 'Vuelve a consultar si la fiebre dura más de 3 días'],
    throat: ['Bebidas templadas, miel, pastillas para la garganta', 'Gárgaras con agua y sal', 'Vuelve a consultar si no mejora en una semana'],
    head: ['Agua y descanso en una habitación oscura', 'Analgésicos simples según el prospecto', 'Apunta cuándo te duele la cabeza'],
    skin: ['No te rasques, usa crema hidratante sin perfume', 'Fíjate en productos o alimentos nuevos'],
    belly: ['Pequeños sorbos de agua o suero oral', 'Dieta blanda', 'Evita el alcohol y las grasas'],
    injury: ['Reposo, hielo, compresión y elevación', 'Analgésicos según el prospecto'],
    mental: ['Habla con alguien de confianza', 'Mantén un horario de sueño regular', 'Paseos cortos y luz del día ayudan'],
    default: ['Descansa y bebe líquidos', 'Vigila tus síntomas', 'Repite la revisión si algo cambia']
  };

  const AGE_NAME = { senior: 'mayor de 75 años' };
  function assess(a) {
    // a = { complaint, flags:[bool], age, severity, days, conditions:[...], pregnant }
    const c = COMPLAINTS.find(x => x.id === a.complaint) || COMPLAINTS[COMPLAINTS.length - 1];
    const reasons = [];
    let level = 5;
    const bump = (l, why) => { if (l && l < level) level = l; if (why) reasons.push(why); };

    c.flags.forEach((f, i) => { if (a.flags[i] && f.level) bump(f.level, f.q.replace(/^¿|\?$/g, '')); });

    const sev = Number(a.severity) || 0;
    if (sev >= 8) bump(3, 'Dolor/malestar intenso (' + sev + '/10)');
    else if (sev >= 5) bump(4, 'Síntomas moderados (' + sev + '/10)');

    if (a.age === 'infant' && a.complaint === 'fever') bump(2, 'Fiebre en un bebé menor de 3 meses');
    if (a.age === 'infant') bump(4, 'Los bebés deben ser valorados por un profesional');
    if (a.age === 'senior' && sev >= 5) bump(3, 'Edad ' + AGE_NAME.senior + ' con síntomas moderados');
    if ((a.conditions || []).length && sev >= 4) bump(4, 'Enfermedad previa: ' + a.conditions.join(', '));
    if (a.pregnant) bump(4, 'Embarazo');
    if (a.days === 'weeks') bump(4, 'Síntomas desde hace más de 2 semanas');

    const spec = a.age === 'child' || a.age === 'infant' ? 'peds' : c.spec;
    return {
      level, info: LEVELS[level], reasons, spec, complaint: c,
      selfCare: SELF_CARE[c.id] || SELF_CARE.default
    };
  }

  // Enrutador por palabras clave, usado cuando el asistente de IA no está disponible.
  const KEYWORDS = [
    [/pecho|coraz[oó]n|palpita/i, 'chest'], [/respir|ahog|asma|pitos/i, 'breath'], [/cabeza|migra[ñn]a|jaqueca/i, 'head'],
    [/fiebre|gripe|resfriad|temperatura|catarro/i, 'fever'], [/est[oó]mago|barriga|vientre|abdom|v[oó]mit|diarrea|tripa/i, 'belly'],
    [/ca[ií]da|golpe|lesi[oó]n|herida|corte|rot|esguince|torcedura/i, 'injury'], [/piel|erupci[oó]n|picor|granos|lunar|acn[eé]|ronchas/i, 'skin'],
    [/garganta|o[ií]do|sinusitis|nariz|anginas/i, 'throat'], [/orina|orinar|pis|vejiga|ri[ñn][oó]n/i, 'urine'], [/ojo|vista|visi[oó]n|veo/i, 'eye'],
    [/ansiedad|depres|estr[eé]s|p[aá]nico|triste|dormir|insomnio|suicid|hacerme da[ñn]o/i, 'mental'], [/embaraz/i, 'pregnancy']
  ];
  const EMERGENCY_WORDS = /no puedo respirar|no respira|inconsciente|desmayad|suicid|quitarme la vida|matarme|convulsi|ictus|derrame cerebral|sangra mucho|sangrado abundante|sobredosis|dolor (en el|de) pecho/i;
  function guessComplaint(text) {
    const hit = KEYWORDS.find(([re]) => re.test(text));
    return hit ? hit[1] : 'other';
  }

  window.Triage = { COMPLAINTS, LEVELS, assess, guessComplaint, EMERGENCY_WORDS };
})();
