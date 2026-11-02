// addClubMember.js — lets a clubadmin create a member account WITHOUT a server.
//
// Security notes:
// - The clubadmin never sees or chooses the member's password.
// - The Firestore rules (not this code) enforce who may create what.
//   Even if someone edits this file in dev tools, the rules still reject
//   anything outside the clubadmin's own club or the whitelisted roles.

import { initializeApp, deleteApp, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const ASSIGNABLE_ROLES = ['player', 'parent', 'clubworker'];

export async function addClubMember({ email, name, surname, role }) {
  // 1. Basic client-side validation (the rules are the real protection)
  if (!email || !name || !surname) {
    throw new Error('Email, name and surname are required.');
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }

  // 2. Read the logged-in clubadmin's clubId from their token claims,
  //    so a member can only ever be created inside their own club.
  const me = getAuth().currentUser;
  if (!me) throw new Error('You must be signed in.');

  const token = await me.getIdTokenResult();
  if (token.claims.role !== 'clubadmin' || !token.claims.clubId) {
    throw new Error('Only a clubadmin can add members.');
  }
  const clubId = token.claims.clubId;

  // 3. Create the Auth account on a SECONDARY app instance, so the
  //    clubadmin stays signed in on the main instance.
  const secondaryApp = initializeApp(getApp().options, 'member-creation');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const throwawayPassword = crypto.randomUUID() + crypto.randomUUID();

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(secondaryAuth, email, throwawayPassword);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      }
      throw err;
    }

    // 4. Write the profile doc with the PRIMARY (clubadmin) credentials.
    //    The rules check: own club only, whitelisted role, exact field set.
    await setDoc(doc(getFirestore(), 'users', cred.user.uid), {
      email,
      name,
      surname,
      role,
      clubId,
    });

    // 5. Email the member a link to set their own password.
    await sendPasswordResetEmail(secondaryAuth, email);

    return { uid: cred.user.uid, email, role, clubId };
  } finally {
    // 6. Always clean up the secondary session.
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
