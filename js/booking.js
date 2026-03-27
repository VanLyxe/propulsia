// ===========================
// AGENCE IA - Booking Module
// ===========================

let currentYear = 2026;
let currentMonth = 2; // March = 2 (0-indexed)
let selectedDate = null;
let selectedTime = null;
let meetingType = 'call';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// --- Init Calendar ---
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
});

// --- Meeting Type ---
function selectMeetingType(type, el) {
  meetingType = type;
  document.querySelectorAll('.meeting-type-btn').forEach(btn => {
    btn.className = 'meeting-type-btn btn btn-secondary btn-sm';
    btn.style.flex = '1';
  });
  el.className = 'meeting-type-btn btn btn-primary btn-sm';
  el.style.flex = '1';
  
  const summaryType = document.getElementById('summaryType');
  if (summaryType) {
    summaryType.textContent = type === 'call' ? 'Call vidéo' : 'En présentiel (Papeete)';
  }
}

// --- Calendar Rendering ---
function renderCalendar() {
  const title = document.getElementById('calendarTitle');
  const grid = document.getElementById('calendarGrid');
  if (!title || !grid) return;

  title.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  grid.innerHTML = '';

  // Day names
  dayNames.forEach(day => {
    const el = document.createElement('div');
    el.className = 'calendar-day-name';
    el.textContent = day;
    grid.appendChild(el);
  });

  // First day of month
  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const el = document.createElement('div');
    el.className = 'calendar-day other-month';
    el.textContent = daysInPrevMonth - i;
    grid.appendChild(el);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    el.className = 'calendar-day';
    el.textContent = d;

    const dateObj = new Date(currentYear, currentMonth, d);
    const dayOfWeek = dateObj.getDay();

    // Disable weekends and past
    if (dayOfWeek === 0 || dayOfWeek === 6 || dateObj < today) {
      el.classList.add('other-month');
      el.style.pointerEvents = 'none';
    } else {
      el.style.position = 'relative';
      el.onclick = () => selectDate(d, el);
    }

    // Highlight today
    if (dateObj.getTime() === today.getTime()) {
      el.classList.add('today');
    }

    grid.appendChild(el);
  }

  // Fill remaining to complete grid
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-day other-month';
    el.textContent = i;
    grid.appendChild(el);
  }
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  selectedDate = null;
  selectedTime = null;
  document.getElementById('timeSlotsContainer').style.display = 'none';
  updateSummary();
  renderCalendar();
}

// --- Select Date ---
function selectDate(day, el) {
  // Remove previous selection
  document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');

  selectedDate = new Date(currentYear, currentMonth, day);
  selectedTime = null;

  // Show time slots
  const container = document.getElementById('timeSlotsContainer');
  const slotsGrid = document.getElementById('timeSlots');
  const dateText = document.getElementById('selectedDateText');
  
  if (!container || !slotsGrid) return;

  container.style.display = 'block';
  dateText.textContent = `${day} ${monthNames[currentMonth]} ${currentYear}`;

  // Generate available slots
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  slotsGrid.innerHTML = '';

  slots.forEach(time => {
    const btn = document.createElement('div');
    btn.className = 'time-slot';
    btn.textContent = time;

    // Randomly make some unavailable
    if (Math.random() < 0.2) {
      btn.classList.add('unavailable');
      btn.textContent = time + ' ✗';
    } else {
      btn.onclick = () => selectTimeSlot(time, btn);
    }

    slotsGrid.appendChild(btn);
  });

  updateSummary();
}

// --- Select Time Slot ---
function selectTimeSlot(time, el) {
  document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedTime = time;
  updateSummary();
  
  // Enable submit
  document.getElementById('bookSubmitBtn').disabled = false;
}

// --- Update Summary ---
function updateSummary() {
  const summary = document.getElementById('bookingSummary');
  if (!summary) return;

  if (selectedDate && selectedTime) {
    summary.style.display = 'block';
    const day = selectedDate.getDate();
    const dateStr = `${day} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    document.getElementById('summaryDate').textContent = dateStr;
    document.getElementById('summaryTime').textContent = selectedTime + ' (GMT-10)';
    document.getElementById('summaryType').textContent = meetingType === 'call' ? 'Call vidéo' : 'En présentiel (Papeete)';
  } else {
    summary.style.display = 'none';
    document.getElementById('bookSubmitBtn').disabled = true;
  }
}

// --- Submit Booking ---
function submitBooking(e) {
  e.preventDefault();

  if (!selectedDate || !selectedTime) {
    showToast('⚠️', 'Veuillez sélectionner une date et un créneau horaire.');
    return;
  }

  const name = document.getElementById('bookName')?.value;
  const email = document.getElementById('bookEmail')?.value;

  if (!name || !email) {
    showToast('⚠️', 'Veuillez remplir au minimum votre nom et email.');
    return;
  }

  const day = selectedDate.getDate();
  const dateStr = `${day} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  // Show confirmation modal
  document.getElementById('confirmEmail').textContent = email;
  document.getElementById('confirmDate').textContent = dateStr;
  document.getElementById('confirmTime').textContent = selectedTime + ' (GMT-10)';
  document.getElementById('confirmType').textContent = meetingType === 'call' ? '📹 Call vidéo' : '🏢 En présentiel (Papeete)';
  
  document.getElementById('confirmModal').classList.add('active');
}
