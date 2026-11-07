// players.js — Players page for the clubadmin: list, add, edit, (de)activate.
//
// Data model (all inside clubs/{clubId}/):
//   players/{id}                  PUBLIC part  : name, surname, active, createdAt
//   players/{id}/private/profile  PRIVATE part : birthDate ('YYYY-MM-DD'), gender, phone, email
//   contacts/{id}                 a person      : name, surname, phone, email
//   playerContacts/{playerId}_{contactId}       : the link between player and contact
//        relationship (key of /relationTypes), isLegalRepresentative,
//        isEmergencyContact, emergencyOrder (1 = call first)
//
// A player can have ANY number of contacts (mum, dad, grandfather...), or none.
// One contact can be linked to several players (siblings).
// Players are never deleted, only set active = false (history stays intact).
//
// Security reminder: this UI only hides things. The Firestore rules are the
// real protection (clubadmin only; players cannot read private data).

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, getDoc, doc, query, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';

const $ = (id) => document.getElementById(id);

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.className = message
    ? `alert ${isError ? 'alert-danger' : 'alert-success'}`
    : '';
}

// Small helper: build an element. Text always goes in via textContent.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- state ----------
let db;
let clubId;
let relationTypes = [];   // active relation types, sorted
let players = [];         // [{ id, name, surname, active }]
let allContacts = [];     // [{ id, name, surname, phone, email }]
let editingId = null;     // null = adding a new player
let originalContactIds = new Set(); // contacts linked when the editor was opened

const lang = (navigator.language || 'en').slice(0, 2);
const relationLabel = (t) => (t.labels && (t.labels[lang] || t.labels.en)) || t.id;

// ---------- loading ----------
async function loadRelationTypes() {
  const snap = await getDocs(collection(db, 'relationTypes'));
  relationTypes = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => t.active === true)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

async function loadContacts() {
  const snap = await getDocs(collection(db, 'clubs', clubId, 'contacts'));
  allContacts = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`));
}

async function loadPlayers() {
  const snap = await getDocs(collection(db, 'clubs', clubId, 'players'));
  players = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`));
  renderList();
}

// ---------- list ----------
function renderList() {
  const tbody = $('players-body');
  tbody.replaceChildren();

  const needle = $('search').value.trim().toLowerCase();
  const showInactive = $('show-inactive').checked;

  const rows = players.filter((p) => {
    if (!showInactive && p.active === false) return false;
    return !needle || `${p.name} ${p.surname}`.toLowerCase().includes(needle);
  });

  if (rows.length === 0) {
    const td = tbody.insertRow().insertCell();
    td.colSpan = 3;
    td.textContent = players.length === 0 ? 'No players yet.' : 'No players match.';
    return;
  }

  rows.forEach((p) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = `${p.name} ${p.surname}`;

    const statusCell = tr.insertCell();
    const active = p.active !== false;
    statusCell.appendChild(el('span', `badge ${active ? 'text-bg-success' : 'text-bg-secondary'}`,
      active ? 'Active' : 'Inactive'));

    const actionCell = tr.insertCell();
    const edit = el('button', 'btn btn-sm btn-outline-primary', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => openEditor(p.id));
    actionCell.appendChild(edit);
  });
}

// ---------- contact rows in the editor ----------
// One row = one person linked to this player. The DOM node carries a small
// object (node._row) with the inputs, so we can read them again when saving.
function addContactRow(data = {}) {
  const container = $('contacts-container');

  const card = el('div', 'card card-body mb-2');
  const row = el('div', 'row g-2');
  card.appendChild(row);

  const field = (label, input, col) => {
    const wrap = el('div', col);
    wrap.appendChild(el('label', 'form-label small mb-0', label));
    wrap.appendChild(input);
    row.appendChild(wrap);
    return input;
  };
  const text = (value, type = 'text', max = 100) => {
    const i = el('input', 'form-control form-control-sm');
    i.type = type;
    i.maxLength = max;
    i.value = value || '';
    return i;
  };

  const name = field('Name', text(data.name), 'col-md-3');
  const surname = field('Surname', text(data.surname), 'col-md-3');
  const phone = field('Phone', text(data.phone, 'tel', 30), 'col-md-3');
  const email = field('Email', text(data.email, 'email', 200), 'col-md-3');

  const relation = el('select', 'form-select form-select-sm');
  relation.add(new Option('Choose...', ''));
  relationTypes.forEach((t) => relation.add(new Option(relationLabel(t), t.id)));
  relation.value = data.relationship || '';
  field('Relation', relation, 'col-md-4');

  // Pre-tick "legal representative" for father/mother/guardian on new rows
  relation.addEventListener('change', () => {
    const t = relationTypes.find((x) => x.id === relation.value);
    if (t && !data.contactId && !legal.dataset.touched) legal.checked = !!t.defaultLegalRepresentative;
  });

  const checks = el('div', 'col-md-5 d-flex align-items-end gap-3');
  const check = (label, checked) => {
    const wrap = el('div', 'form-check');
    const input = el('input', 'form-check-input');
    input.type = 'checkbox';
    input.checked = !!checked;
    const lab = el('label', 'form-check-label small', label);
    wrap.append(input, lab);
    checks.appendChild(wrap);
    return input;
  };
  const legal = check('Legal representative', data.isLegalRepresentative);
  legal.addEventListener('change', () => { legal.dataset.touched = '1'; });
  const emergency = check('Emergency contact', data.isEmergencyContact);
  row.appendChild(checks);

  const buttons = el('div', 'col-md-3 d-flex align-items-end justify-content-end gap-1');
  const mkBtn = (label, title, cls, onClick) => {
    const b = el('button', `btn btn-sm ${cls}`, label);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', onClick);
    buttons.appendChild(b);
  };
  mkBtn('↑', 'Move up (call earlier)', 'btn-outline-secondary', () => {
    if (card.previousElementSibling) container.insertBefore(card, card.previousElementSibling);
  });
  mkBtn('↓', 'Move down (call later)', 'btn-outline-secondary', () => {
    if (card.nextElementSibling) container.insertBefore(card.nextElementSibling, card);
  });
  mkBtn('Remove', 'Unlink this contact from the player', 'btn-outline-danger', () => {
    card.remove();
    refreshExistingSelect();
  });
  row.appendChild(buttons);

  if (data.contactId) {
    card.appendChild(el('div', 'form-text',
      'Existing contact: changes to name or phone also apply to the other players linked to this person.'));
  }

  card._row = { contactId: data.contactId || null, name, surname, phone, email, relation, legal, emergency };
  container.appendChild(card);
  refreshExistingSelect();
}

function currentRows() {
  return [...$('contacts-container').children].map((c) => c._row);
}

// "Add existing contact" dropdown: contacts not yet used in this editor
function refreshExistingSelect() {
  const select = $('existing-contact');
  const used = new Set(currentRows().map((r) => r.contactId).filter(Boolean));
  select.replaceChildren(new Option('Add existing contact (for example a sibling\'s parent)...', ''));
  allContacts.filter((c) => !used.has(c.id)).forEach((c) => {
    select.add(new Option(`${c.name} ${c.surname}${c.phone ? ` (${c.phone})` : ''}`, c.id));
  });
  select.hidden = select.options.length <= 1;
}

// ---------- editor ----------
async function openEditor(playerId) {
  setStatus('');
  editingId = playerId;
  originalContactIds = new Set();
  $('player-form').reset();
  $('contacts-container').replaceChildren();

  $('editor-title').textContent = playerId ? 'Edit player' : 'Add player';
  $('toggle-active').hidden = !playerId;

  if (playerId) {
    try {
      const p = players.find((x) => x.id === playerId);
      $('p-name').value = p.name || '';
      $('p-surname').value = p.surname || '';
      $('toggle-active').textContent = p.active === false ? 'Reactivate player' : 'Deactivate player';

      const priv = await getDoc(doc(db, 'clubs', clubId, 'players', playerId, 'private', 'profile'));
      if (priv.exists()) {
        const d = priv.data();
        $('p-birth').value = d.birthDate || '';
        $('p-gender').value = d.gender || '';
        $('p-phone').value = d.phone || '';
        $('p-email').value = d.email || '';
      }

      const linkSnap = await getDocs(query(
        collection(db, 'clubs', clubId, 'playerContacts'),
        where('playerId', '==', playerId),
      ));
      const links = linkSnap.docs.map((d) => d.data())
        .sort((a, b) => (a.emergencyOrder || 99) - (b.emergencyOrder || 99));

      links.forEach((l) => {
        originalContactIds.add(l.contactId);
        const c = allContacts.find((x) => x.id === l.contactId) || {};
        addContactRow({
          contactId: l.contactId,
          name: c.name,
          surname: c.surname,
          phone: c.phone,
          email: c.email,
          relationship: l.relationship,
          isLegalRepresentative: l.isLegalRepresentative,
          isEmergencyContact: l.isEmergencyContact,
        });
      });
    } catch (err) {
      setStatus(`Could not load player: ${err.message}`, true);
      return;
    }
  }

  refreshExistingSelect();
  $('list-view').hidden = true;
  $('editor-view').hidden = false;
}

function closeEditor() {
  $('editor-view').hidden = true;
  $('list-view').hidden = false;
}

function validate(rows) {
  const name = $('p-name').value.trim();
  const surname = $('p-surname').value.trim();
  if (!name || !surname) return 'A player needs a name and a surname.';

  const birth = $('p-birth').value;
  if (birth) {
    const d = new Date(birth);
    if (Number.isNaN(d.getTime()) || d > new Date()) return 'The birth date is not valid.';
  }

  const seen = new Set();
  for (const r of rows) {
    if (!r.name.value.trim() || !r.surname.value.trim() || !r.phone.value.trim()) {
      return 'Each contact needs a name, a surname and a phone number.';
    }
    if (!r.relation.value) return 'Choose a relation for each contact.';
    if (r.contactId) {
      if (seen.has(r.contactId)) return 'The same contact is added twice.';
      seen.add(r.contactId);
    }
  }
  return null;
}

async function savePlayer(e) {
  e.preventDefault();
  const rows = currentRows();
  const problem = validate(rows);
  if (problem) {
    setStatus(problem, true);
    return;
  }

  const name = $('p-name').value.trim();
  const surname = $('p-surname').value.trim();

  if (!editingId) {
    const twin = players.find((p) => (p.name || '').toLowerCase() === name.toLowerCase()
      && (p.surname || '').toLowerCase() === surname.toLowerCase());
    if (twin && !confirm(`${name} ${surname} already exists. Add another player with the same name?`)) return;
  }

  const submit = $('player-form').querySelector('button[type=submit]');
  submit.disabled = true;
  try {
    const batch = writeBatch(db);
    const playerRef = editingId
      ? doc(db, 'clubs', clubId, 'players', editingId)
      : doc(collection(db, 'clubs', clubId, 'players'));

    const publicData = { name, surname };
    if (!editingId) {
      publicData.active = true;
      publicData.createdAt = serverTimestamp();
    }
    batch.set(playerRef, publicData, { merge: true });

    batch.set(doc(playerRef, 'private', 'profile'), {
      birthDate: $('p-birth').value,
      gender: $('p-gender').value,
      phone: $('p-phone').value.trim(),
      email: $('p-email').value.trim(),
    }, { merge: true });

    // Emergency order follows the order of the rows on screen
    let order = 0;
    const keptContactIds = new Set();

    rows.forEach((r) => {
      const contactRef = r.contactId
        ? doc(db, 'clubs', clubId, 'contacts', r.contactId)
        : doc(collection(db, 'clubs', clubId, 'contacts'));
      keptContactIds.add(contactRef.id);

      batch.set(contactRef, {
        name: r.name.value.trim(),
        surname: r.surname.value.trim(),
        phone: r.phone.value.trim(),
        email: r.email.value.trim(),
      }, { merge: true });

      const link = {
        playerId: playerRef.id,
        contactId: contactRef.id,
        relationship: r.relation.value,
        isLegalRepresentative: r.legal.checked,
        isEmergencyContact: r.emergency.checked,
      };
      if (r.emergency.checked) {
        order += 1;
        link.emergencyOrder = order;
      }
      // No merge: the whole link document is replaced (clears an old emergencyOrder)
      batch.set(doc(db, 'clubs', clubId, 'playerContacts', `${playerRef.id}_${contactRef.id}`), link);
    });

    // Contacts that were unlinked in the editor: remove the link only.
    // The contact record stays (it may belong to a sibling).
    originalContactIds.forEach((cid) => {
      if (!keptContactIds.has(cid)) {
        batch.delete(doc(db, 'clubs', clubId, 'playerContacts', `${playerRef.id}_${cid}`));
      }
    });

    await batch.commit();
    setStatus(`${name} ${surname} saved.`);
    closeEditor();
    await Promise.all([loadPlayers(), loadContacts()]);
  } catch (err) {
    setStatus(`Could not save: ${err.message}`, true);
  } finally {
    submit.disabled = false;
  }
}

async function toggleActive() {
  const p = players.find((x) => x.id === editingId);
  if (!p) return;
  const nowActive = p.active === false; // value after the toggle
  const verb = nowActive ? 'Reactivate' : 'Deactivate';
  if (!confirm(`${verb} ${p.name} ${p.surname}?`)) return;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'clubs', clubId, 'players', p.id), { active: nowActive }, { merge: true });
    await batch.commit();
    setStatus(`${p.name} ${p.surname} is now ${nowActive ? 'active' : 'inactive'}.`);
    closeEditor();
    await loadPlayers();
  } catch (err) {
    setStatus(`Could not change status: ${err.message}`, true);
  }
}

// ---------- start ----------
// Call this from app.js AFTER Firebase has been initialised
// (inside its DOMContentLoaded handler).
export function initPlayersPage() {
  if (!$('players-app')) return; // not the players page

  const auth = getAuth();
  db = getFirestore();
  let started = false;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return; // app.js already redirects signed-out users
    if (started) return;

    const token = await user.getIdTokenResult(true);
    const { role, clubId: claimClub } = token.claims;

    if (role !== 'clubadmin' || !claimClub) {
      $('players-app').hidden = true;
      setStatus('Only a clubadmin can manage players.', true);
      return;
    }
    started = true;
    clubId = claimClub;

    try {
      await Promise.all([loadRelationTypes(), loadContacts()]);
      await loadPlayers();
    } catch (err) {
      setStatus(`Could not load players: ${err.message}`, true);
      return;
    }

    $('players-app').hidden = false;

    $('search').addEventListener('input', renderList);
    $('show-inactive').addEventListener('change', renderList);
    $('add-player').addEventListener('click', () => openEditor(null));
    $('cancel').addEventListener('click', closeEditor);
    $('player-form').addEventListener('submit', savePlayer);
    $('toggle-active').addEventListener('click', toggleActive);
    $('add-contact').addEventListener('click', () => addContactRow());
    $('existing-contact').addEventListener('change', (ev) => {
      const c = allContacts.find((x) => x.id === ev.target.value);
      if (c) {
        addContactRow({
          contactId: c.id, name: c.name, surname: c.surname, phone: c.phone, email: c.email,
        });
      }
      ev.target.value = '';
    });
  });
}
