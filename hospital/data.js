// Demo data for the hospital. In production this comes from the hospital's
// scheduling system (HIS / EHR) through an API.
window.HOSPITAL = {
  name: 'CareFlow General Hospital',
  emergencyNumber: '112',
  phone: '+000 000 0000',
  specialties: [
    { id: 'gp', name: 'General Practice', icon: '🩺', desc: 'Check-ups, common illness, referrals' },
    { id: 'cardio', name: 'Cardiology', icon: '❤️', desc: 'Heart, blood pressure, palpitations' },
    { id: 'derm', name: 'Dermatology', icon: '🧴', desc: 'Skin, rashes, moles, acne' },
    { id: 'ortho', name: 'Orthopedics', icon: '🦴', desc: 'Bones, joints, sports injuries' },
    { id: 'peds', name: 'Pediatrics', icon: '🧸', desc: 'Children and teens' },
    { id: 'gyn', name: 'Gynecology & Obstetrics', icon: '🌸', desc: "Women's health, pregnancy" },
    { id: 'ent', name: 'ENT', icon: '👂', desc: 'Ear, nose, throat, sinuses' },
    { id: 'neuro', name: 'Neurology', icon: '🧠', desc: 'Headaches, nerves, dizziness' },
    { id: 'gastro', name: 'Gastroenterology', icon: '🫃', desc: 'Stomach, bowel, liver' },
    { id: 'psych', name: 'Mental Health', icon: '💬', desc: 'Anxiety, mood, sleep, stress' },
    { id: 'ophth', name: 'Ophthalmology', icon: '👁️', desc: 'Eyes and vision' },
    { id: 'uro', name: 'Urology', icon: '💧', desc: 'Urinary tract, kidneys, prostate' }
  ],
  doctors: [
    { id: 'd1', name: 'Dr. Ana Ribeiro', spec: 'gp', langs: ['EN', 'PT'], rating: 4.9, tele: true },
    { id: 'd2', name: 'Dr. Omar Haddad', spec: 'gp', langs: ['EN', 'AR'], rating: 4.8, tele: true },
    { id: 'd3', name: 'Dr. Priya Nair', spec: 'cardio', langs: ['EN', 'HI'], rating: 4.9, tele: false },
    { id: 'd4', name: 'Dr. Lucas Martin', spec: 'cardio', langs: ['EN', 'FR'], rating: 4.7, tele: true },
    { id: 'd5', name: 'Dr. Sofia Costa', spec: 'derm', langs: ['EN', 'PT', 'ES'], rating: 4.8, tele: true },
    { id: 'd6', name: 'Dr. James Okafor', spec: 'ortho', langs: ['EN'], rating: 4.6, tele: false },
    { id: 'd7', name: 'Dr. Mei Lin', spec: 'peds', langs: ['EN', 'ZH'], rating: 5.0, tele: true },
    { id: 'd8', name: 'Dr. Fatima Al-Sayed', spec: 'gyn', langs: ['EN', 'AR'], rating: 4.9, tele: true },
    { id: 'd9', name: 'Dr. Tomás Silva', spec: 'ent', langs: ['EN', 'PT'], rating: 4.7, tele: false },
    { id: 'd10', name: 'Dr. Hannah Weber', spec: 'neuro', langs: ['EN', 'DE'], rating: 4.8, tele: true },
    { id: 'd11', name: 'Dr. Rahul Mehta', spec: 'gastro', langs: ['EN', 'HI'], rating: 4.6, tele: true },
    { id: 'd12', name: 'Dr. Clara Jensen', spec: 'psych', langs: ['EN'], rating: 4.9, tele: true },
    { id: 'd13', name: 'Dr. Yusuf Demir', spec: 'ophth', langs: ['EN', 'TR'], rating: 4.7, tele: false },
    { id: 'd14', name: 'Dr. Marta Novak', spec: 'uro', langs: ['EN'], rating: 4.6, tele: false }
  ]
};
