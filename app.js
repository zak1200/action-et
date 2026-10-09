const form = document.querySelector('#booking-form');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');
const bookingStatus = document.querySelector('#booking-status');
const slotStatus = document.querySelector('#slot-status');
const admin = document.querySelector('#admin');
const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const parisFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
function parisNow() {
  const parts = Object.fromEntries(parisFormatter.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
function isWeekday(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.getUTCDay() > 0 && value.getUTCDay() < 6;
}
function nextDay(date) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
function nextAvailableDate() {
  const now = parisNow();
  let date = now.date;
  if (now.time >= timeSlots.at(-1)) date = nextDay(date);
  while (!isWeekday(date)) date = nextDay(date);
  return date;
}
function initialAppointments() {
  // The sample is on the next working day, so today's first slot remains usable.
  let date = nextDay(nextAvailableDate());
  while (!isWeekday(date)) date = nextDay(date);
  return [{ id: 'sample', name: 'Camille Martin (exemple)', email: 'camille@example.com',
    service: 'Titre de séjour', date, time: '10:00', status: 'À confirmer' }];
}
let appointments = initialAppointments();
dateInput.min = parisNow().date;
dateInput.value = nextAvailableDate();
document.querySelector('#year').textContent = parisNow().date.slice(0, 4);
function isSlotAvailable(date, time, now = parisNow()) {
  return isWeekday(date) && date >= now.date && timeSlots.includes(time)
    && (date !== now.date || time > now.time)
    && !appointments.some(a => a.date === date && a.time === time);
}
function renderSlots() {
  const now = parisNow();
  dateInput.min = now.date;
  const date = dateInput.value;
  dateInput.setCustomValidity('');
  if (date && !isWeekday(date)) dateInput.setCustomValidity('Choisissez une date du lundi au vendredi.');
  const available = timeSlots.filter(time => isSlotAvailable(date, time, now));
  if (!available.includes(timeInput.value)) timeInput.value = available[0] || '';
  for (const [containerId, times] of [['morning-slots', timeSlots.slice(0, 3)], ['afternoon-slots', timeSlots.slice(3)]]) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    times.forEach(time => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'time-slot'; button.textContent = time;
      button.disabled = !available.includes(time);
      button.setAttribute('aria-pressed', String(time === timeInput.value));
      button.setAttribute('aria-label', `${time} heure de Paris${button.disabled ? ', indisponible' : ''}`);
      button.addEventListener('click', () => { timeInput.value = time; renderSlots(); });
      container.append(button);
    });
  }
  slotStatus.textContent = !date ? 'Choisissez une date.'
    : !isWeekday(date) ? 'L’agence reçoit du lundi au vendredi. Choisissez un jour de semaine.'
    : date < now.date ? 'Choisissez une date à partir d’aujourd’hui.'
    : !available.length ? 'Aucun créneau disponible pour cette date. Essayez le prochain jour ouvré.'
    : 'Créneaux de démonstration · aucun rendez-vous réel';
}
function renderAppointments() {
  document.querySelector('#appointment-count').textContent = appointments.length;
  const container = document.querySelector('#appointments');
  container.replaceChildren();
  if (!appointments.length) container.textContent = 'Aucun rendez-vous de démonstration.';
  appointments.forEach(a => {
    const row = document.createElement('article'); row.className = 'appointment';
    const info = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = a.name;
    const desc = document.createElement('p');
    const prettyDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' })
      .format(new Date(`${a.date}T12:00:00Z`));
    desc.textContent = `${a.service} · ${prettyDate} à ${a.time} (Paris) · ${a.email}`;
    info.append(name, desc);
    const action = document.createElement('button'); action.className = 'status-button';
    action.textContent = a.status; action.disabled = a.status === 'Confirmé (démo)';
    action.addEventListener('click', () => { a.status = 'Confirmé (démo)'; renderAppointments(); });
    row.append(info, action); container.append(row);
  });
}
dateInput.addEventListener('change', () => { bookingStatus.textContent = ''; renderSlots(); });
form.addEventListener('submit', e => {
  e.preventDefault();
  dateInput.min = parisNow().date;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  if (!isSlotAvailable(values.date, values.time)) {
    bookingStatus.textContent = 'Ce créneau n’est plus disponible. Choisissez un jour de semaine et un horaire à venir.';
    renderSlots(); return;
  }
  if (!values.name.trim()) {
    bookingStatus.textContent = 'Indiquez un prénom et un nom fictifs pour la simulation.'; return;
  }
  appointments.push({ ...values, name: values.name.trim(), id: crypto.randomUUID(), status: 'À confirmer' });
  renderAppointments();
  bookingStatus.textContent = `Simulation enregistrée pour le ${values.date} à ${values.time}, heure de Paris. Retrouvez-la dans l’espace admin en bas de page. Aucun e-mail envoyé, aucun paiement effectué. Les données seront effacées au rechargement.`;
  form.reset(); dateInput.value = values.date; timeInput.value = ''; renderSlots();
});
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#service').value = link.dataset.service;
}));
document.querySelector('#open-admin').addEventListener('click', () => { renderAppointments(); admin.showModal(); });
document.querySelector('#close-admin').addEventListener('click', () => admin.close());
document.querySelector('#reset-demo').addEventListener('click', () => {
  appointments = initialAppointments(); renderAppointments(); renderSlots(); bookingStatus.textContent = '';
});
// Embed only the two client-selected videos, after an explicit visitor action.
const approvedVideos = new Set(['7690160346375540000', '7623823855907294486']);
document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.video;
  if (!approvedVideos.has(id)) return;
  const frame = document.createElement('iframe');
  frame.src = `https://www.tiktok.com/player/v1/${id}?autoplay=0`;
  frame.title = 'Vidéo TikTok Action Étrangers';
  frame.allow = 'fullscreen'; frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  document.getElementById(`video-${id}`).replaceChildren(frame);
}));
document.querySelector('#load-map').addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = 'https://maps.google.com/maps?q=14%20Boulevard%20Charles%20N%C3%A9d%C3%A9lec%2013001%20Marseille&output=embed';
  frame.title = 'Action Étrangers — 14 Bd Charles Nédélec, 13001 Marseille';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  document.querySelector('#office-map').replaceChildren(frame);
});
renderAppointments(); renderSlots();
