// teams.js — team list for every club member, team management for the clubadmin.
//
// Loaded through app.js (single webpack entry), so it ends up in bundle.js on
// EVERY page. initTeamsPage() does nothing unless the page has #teams-app.
//
// Data: clubs/{clubId}/teams/{teamId} = { name, category, active, createdAt }
// Teams are permanent: they are never deleted, only set active = false, so
// old seasons and memberships can keep pointing at them.
//
// Security reminder: this UI only hides buttons. The Firestore rules are the
// real protection (clubadmin writes inside their club; players only read).

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

const $ = (id) => document.getElementById(id);

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.className = message
    ? `alert ${isError ? 'alert-danger' : 'alert-success'}`
    : '';
}

// Which club does this login belong to?
//  - clubadmin: from the token claim
//  - player:    from their /users document
async function findClubId(db, user) {
  const token = await user.getIdTokenResult(true);
  const { role, clubId } = token.claims;
  if (role === 'clubadmin' && clubId) return { clubId, canManage: true };

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists() && snap.data().clubId) {
    return { clubId: snap.data().clubId, canManage: false };
  }
  return { clubId: null, canManage: false };
}

// ---------- list ----------
async function loadTeams(db, clubId, canManage) {
  const tbody = $('teams-body');
  tbody.replaceChildren();

  const snap = await getDocs(collection(db, 'clubs', clubId, 'teams'));
  const teams = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    // players only see active teams; the clubadmin sees all
    .filter((t) => canManage || t.active !== false)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  if (teams.length === 0) {
    const td = tbody.insertRow().insertCell();
    td.colSpan = canManage ? 4 : 2;
    td.textContent = 'No teams yet.';
    return teams;
  }

  teams.forEach((t) => {
    const tr = tbody.insertRow();

    if (!canManage) {
      tr.insertCell().textContent = t.name;
      tr.insertCell().textContent = t.category || '';
      return;
    }

    // clubadmin: editable row. textContent / .value only, never innerHTML.
    const nameInput = document.createElement('input');
    nameInput.className = 'form-control form-control-sm';
    nameInput.value = t.name || '';
    nameInput.maxLength = 100;
    tr.insertCell().appendChild(nameInput);

    const catInput = document.createElement('input');
    catInput.className = 'form-control form-control-sm';
    catInput.value = t.category || '';
    catInput.maxLength = 50;
    tr.insertCell().appendChild(catInput);

    const statusCell = tr.insertCell();
    const badge = document.createElement('span');
    const showBadge = (active) => {
      badge.className = `badge ${active ? 'text-bg-success' : 'text-bg-secondary'}`;
      badge.textContent = active ? 'Active' : 'Inactive';
    };
    showBadge(t.active !== false);
    statusCell.appendChild(badge);

    const actionCell = tr.insertCell();

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn btn-sm btn-outline-primary me-2';
    save.textContent = 'Save';
    save.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        setStatus('A team needs a name.', true);
        return;
      }
      try {
        await updateDoc(doc(db, 'clubs', clubId, 'teams', t.id), {
          name,
          category: catInput.value.trim(),
        });
        setStatus(`Team "${name}" saved.`);
      } catch (err) {
        setStatus(`Could not save: ${err.message}`, true);
      }
    });
    actionCell.appendChild(save);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-sm btn-outline-secondary';
    let active = t.active !== false;
    toggle.textContent = active ? 'Deactivate' : 'Activate';
    toggle.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db, 'clubs', clubId, 'teams', t.id), { active: !active });
        active = !active;
        showBadge(active);
        toggle.textContent = active ? 'Deactivate' : 'Activate';
        setStatus(`Team "${t.name}" is now ${active ? 'active' : 'inactive'}.`);
      } catch (err) {
        setStatus(`Could not change status: ${err.message}`, true);
      }
    });
    actionCell.appendChild(toggle);
  });

  return teams;
}

// ---------- add form ----------
function wireForm(db, clubId, getTeams) {
  $('add-team-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submit = form.querySelector('button[type=submit]');
    const name = $('team-name').value.trim();
    const category = $('team-category').value.trim();

    if (!name) return;

    const exists = getTeams().some(
      (t) => (t.name || '').toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      setStatus(`A team called "${name}" already exists.`, true);
      return;
    }

    submit.disabled = true;
    try {
      await addDoc(collection(db, 'clubs', clubId, 'teams'), {
        name,
        category,
        active: true,
        createdAt: serverTimestamp(),
      });
      setStatus(`Team "${name}" added.`);
      form.reset();
      await refresh(db, clubId, true);
    } catch (err) {
      setStatus(`Could not add team: ${err.message}`, true);
    } finally {
      submit.disabled = false;
    }
  });
}

let currentTeams = [];

async function refresh(db, clubId, canManage) {
  currentTeams = await loadTeams(db, clubId, canManage);
}

// ---------- start ----------
// Call this from app.js AFTER Firebase has been initialised
// (inside its DOMContentLoaded handler).
export function initTeamsPage() {
  if (!$('teams-app')) return; // not the teams page

  const auth = getAuth();
  const db = getFirestore();
  let started = false;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return; // app.js already redirects signed-out users
    if (started) return;
    started = true;

    try {
      const { clubId, canManage } = await findClubId(db, user);
      if (!clubId) {
        setStatus('Your account is not linked to a club.', true);
        return;
      }

      $('teams-app').hidden = false;
      $('add-team-section').hidden = !canManage;
      $('actions-header').hidden = !canManage;
      $('status-header').hidden = !canManage;

      if (canManage) wireForm(db, clubId, () => currentTeams);
      await refresh(db, clubId, canManage);
    } catch (err) {
      setStatus(`Could not load teams: ${err.message}`, true);
    }
  });
}
