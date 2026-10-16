// members.js — member list + "Add member" form for a clubadmin.
//
// Loaded through app.js (your single webpack entry), so it ends up in
// bundle.js on EVERY page. initMembersPage() therefore does nothing unless
// the current page contains the members form.
//
// Security reminder: this UI only hides buttons. The Firestore rules are the
// real protection — a tampered page still can't do anything the rules forbid.

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { addClubMember } from './addClubMember.js';

const ROLES = ['player', 'parent', 'clubworker'];

const $ = (id) => document.getElementById(id);

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.className = message
    ? `alert ${isError ? 'alert-danger' : 'alert-success'}`
    : '';
}

// ---------- list ----------
async function loadMembers(db, clubId) {
  const tbody = $('members-body');
  tbody.replaceChildren();

  // The clubId filter is REQUIRED: the rules only allow queries that are
  // provably limited to the caller's own club.
  const snap = await getDocs(query(collection(db, 'users'), where('clubId', '==', clubId)));

  if (snap.empty) {
    const td = tbody.insertRow().insertCell();
    td.colSpan = 4;
    td.textContent = 'No members yet.';
    return;
  }

  snap.forEach((d) => {
    const m = d.data();
    const tr = tbody.insertRow();

    // textContent (never innerHTML) so names can't inject markup
    tr.insertCell().textContent = `${m.name} ${m.surname}`;
    tr.insertCell().textContent = m.email;

    const roleCell = tr.insertCell();
    const actionCell = tr.insertCell();

    if (!ROLES.includes(m.role)) {
      roleCell.textContent = m.role; // clubadmin: not editable here
      return;
    }

    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    ROLES.forEach((r) => select.add(new Option(r, r, false, r === m.role)));
    select.addEventListener('change', async () => {
      try {
        await updateDoc(doc(db, 'users', d.id), { role: select.value });
        m.role = select.value;
        setStatus(`Role of ${m.name} changed to ${select.value}.`);
      } catch (err) {
        select.value = m.role; // revert on failure
        setStatus(`Could not change role: ${err.message}`, true);
      }
    });
    roleCell.appendChild(select);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-danger';
    btn.textContent = 'Remove access';
    btn.addEventListener('click', async () => {
      if (!confirm(`Remove ${m.name} ${m.surname}'s access to the club?`)) return;
      try {
        await deleteDoc(doc(db, 'users', d.id));
        setStatus(`${m.name} no longer has access.`);
        loadMembers(db, clubId);
      } catch (err) {
        setStatus(`Could not remove: ${err.message}`, true);
      }
    });
    actionCell.appendChild(btn);
  });
}

// ---------- add form ----------
function wireForm(db, clubId) {
  const roleSelect = $('role');
  roleSelect.replaceChildren();
  ROLES.forEach((r) => roleSelect.add(new Option(r, r)));

  $('add-member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submit = form.querySelector('button[type=submit]');
    submit.disabled = true;
    try {
      const result = await addClubMember({
        email: $('email').value.trim(),
        name: $('name').value.trim(),
        surname: $('surname').value.trim(),
        role: roleSelect.value,
      });
      setStatus(`Account created. A password-setup email was sent to ${result.email}.`);
      form.reset();
      loadMembers(db, clubId);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      submit.disabled = false;
    }
  });
}

// ---------- start ----------
// Call this from app.js AFTER Firebase has been initialised
// (inside its DOMContentLoaded handler).
export function initMembersPage() {
  if (!$('add-member-form')) return; // not the members page

  const auth = getAuth();
  const db = getFirestore();
  let started = false;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return; // app.js already redirects signed-out users to index.html

    // Force-refresh so freshly set claims (clubadmin/clubId) are picked up
    const token = await user.getIdTokenResult(true);
    const { role, clubId } = token.claims;

    if (role !== 'clubadmin' || !clubId) {
      $('members-app').hidden = true;
      setStatus('Only a clubadmin can manage members.', true);
      return;
    }

    $('members-app').hidden = false;
    if (started) return; // don't attach the form handler twice
    started = true;

    wireForm(db, clubId);
    loadMembers(db, clubId).catch((err) => setStatus(`Could not load members: ${err.message}`, true));
  });
}
