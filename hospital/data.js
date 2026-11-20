// Datos de demostración del hospital. En producción vienen del sistema de citas
// del hospital (HIS / historia clínica) a través de una API.
window.HOSPITAL = {
  name: 'Hospital General CareFlow',
  emergencyNumber: '112',
  // WhatsApp de recepción, formato internacional, solo dígitos (p. ej. '34612345678').
  // Si se deja vacío, WhatsApp pedirá al paciente que elija el contacto.
  receptionWhatsApp: '',
  phone: '+000 000 0000',
  specialties: [
    { id: 'gp', name: 'Medicina General', icon: '🩺', desc: 'Revisiones, enfermedades comunes, derivaciones' },
    { id: 'cardio', name: 'Cardiología', icon: '❤️', desc: 'Corazón, tensión arterial, palpitaciones' },
    { id: 'derm', name: 'Dermatología', icon: '🧴', desc: 'Piel, erupciones, lunares, acné' },
    { id: 'ortho', name: 'Traumatología', icon: '🦴', desc: 'Huesos, articulaciones, lesiones deportivas' },
    { id: 'peds', name: 'Pediatría', icon: '🧸', desc: 'Niños y adolescentes' },
    { id: 'gyn', name: 'Ginecología y Obstetricia', icon: '🌸', desc: 'Salud de la mujer, embarazo' },
    { id: 'ent', name: 'Otorrinolaringología', icon: '👂', desc: 'Oído, nariz, garganta, senos nasales' },
    { id: 'neuro', name: 'Neurología', icon: '🧠', desc: 'Dolores de cabeza, nervios, mareos' },
    { id: 'gastro', name: 'Aparato Digestivo', icon: '🫃', desc: 'Estómago, intestino, hígado' },
    { id: 'psych', name: 'Salud Mental', icon: '💬', desc: 'Ansiedad, estado de ánimo, sueño, estrés' },
    { id: 'ophth', name: 'Oftalmología', icon: '👁️', desc: 'Ojos y visión' },
    { id: 'uro', name: 'Urología', icon: '💧', desc: 'Vías urinarias, riñones, próstata' }
  ],
  doctors: [
    { id: 'd1', name: 'Dr. Ana Ribeiro', spec: 'gp', langs: ['ES', 'EN', 'PT'], rating: 4.9, tele: true },
    { id: 'd2', name: 'Dr. Omar Haddad', spec: 'gp', langs: ['ES', 'EN', 'AR'], rating: 4.8, tele: true },
    { id: 'd3', name: 'Dr. Priya Nair', spec: 'cardio', langs: ['ES', 'EN', 'HI'], rating: 4.9, tele: false },
    { id: 'd4', name: 'Dr. Lucas Martin', spec: 'cardio', langs: ['ES', 'EN', 'FR'], rating: 4.7, tele: true },
    { id: 'd5', name: 'Dr. Sofia Costa', spec: 'derm', langs: ['ES', 'EN', 'PT'], rating: 4.8, tele: true },
    { id: 'd6', name: 'Dr. James Okafor', spec: 'ortho', langs: ['ES', 'EN'], rating: 4.6, tele: false },
    { id: 'd7', name: 'Dr. Mei Lin', spec: 'peds', langs: ['ES', 'EN', 'ZH'], rating: 5.0, tele: true },
    { id: 'd8', name: 'Dr. Fatima Al-Sayed', spec: 'gyn', langs: ['ES', 'EN', 'AR'], rating: 4.9, tele: true },
    { id: 'd9', name: 'Dr. Tomás Silva', spec: 'ent', langs: ['ES', 'EN', 'PT'], rating: 4.7, tele: false },
    { id: 'd10', name: 'Dr. Hannah Weber', spec: 'neuro', langs: ['ES', 'EN', 'DE'], rating: 4.8, tele: true },
    { id: 'd11', name: 'Dr. Rahul Mehta', spec: 'gastro', langs: ['ES', 'EN', 'HI'], rating: 4.6, tele: true },
    { id: 'd12', name: 'Dr. Clara Jensen', spec: 'psych', langs: ['ES', 'EN'], rating: 4.9, tele: true },
    { id: 'd13', name: 'Dr. Yusuf Demir', spec: 'ophth', langs: ['ES', 'EN', 'TR'], rating: 4.7, tele: false },
    { id: 'd14', name: 'Dr. Marta Novak', spec: 'uro', langs: ['ES', 'EN'], rating: 4.6, tele: false }
  ]
};
