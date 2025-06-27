// app.js (This is the main entry point for your Webpack bundle)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJmOLs6nGaheZmr6qUbUpXN_ylzonF2G4",
  authDomain: "myclub-fb.firebaseapp.com",
  projectId: "myclub-fb",
  storageBucket: "myclub-fb.firebasestorage.app",
  messagingSenderId: "542512653051",
  appId: "1:542512653051:web:7b8856c9a43d36000ec65e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Authentication Functions (Now accept email/password as arguments) ---

// Function to handle Sign Up
const handleSignUp = async (email, password) => { // <--- Added email, password parameters
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        // signup niet toelaten
        // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // const user = userCredential.user;
        // console.log('User signed up:', user);
        // alert('Signed up successfully!');
    } catch (error) {
        const errorMessage = error.message;
        console.error('Sign up error:', error.code, errorMessage);
        alert(`Sign up error: ${errorMessage}`);
        if (error.code === 'auth/email-already-in-use') {
            alert('This email is already in use. Please sign in or use a different email.');
        } else if (error.code === 'auth/weak-password') {
            alert('Password should be at least 6 characters.');
        }
    }
};

// Function to handle Sign In
const handleSignIn = async (email, password) => { // <--- Added email, password parameters
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User signed in:', user);
        alert('Signed in successfully!');
    } catch (error) {
        const errorMessage = error.message;
        console.error('Sign in error:', error.code, errorMessage);
        alert(`Sign in error: ${errorMessage}`);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             alert('Invalid email or password.');
        } else if (error.code === 'auth/too-many-requests') {
            alert('Too many failed login attempts. Please try again later.');
        }
    }
};

// Function to handle Sign Out
const handleSignOut = async () => {
    try {
        await signOut(auth);
        console.log('User signed out.');
        alert('Signed out successfully!');
    } catch (error) {
        console.error('Sign out error:', error);
        alert(`Sign out error: ${error.message}`);
    }
};


// --- Function to get single player ---
async function getSinglePlayer() {
  const docRef = doc(db, "players", "EteZoTtd40FPI0aYjEKw");
  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      alert("Player data: " + JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log("No such document!");
      alert("No such player document!");
    }
  } catch (e) {
    console.error("Error getting document:", e);
    alert("Error getting player data: " + e.message);
  }
}

// --- Function to add message (now accepts messageInput directly) ---
async function addMessage(messageInput) { // <--- Accepts messageInput as argument
    const messageText = messageInput ? messageInput.value.trim() : '';

    if (messageText === '') {
        alert('Please enter a message!');
        return;
    }

    try {
        const messagesCollectionRef = collection(db, "messages");
        await addDoc(messagesCollectionRef, {
            text: messageText,
            timestamp: new Date(),
        });
        console.log("Message added successfully!");
        if (messageInput) messageInput.value = '';
    } catch (e) {
        console.error("Error adding message: ", e);
        alert("Error sending message: " + e.message);
    }
}

// --- Function to display messages in real-time (no change needed here) ---
function setupRealtimeMessagesListener() {
    const messagesList = document.getElementById('messages');
    if (!messagesList) {
        console.warn("Element with ID 'messages' not found. Real-time messages will not be displayed.");
        return;
    }
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    messagesList.innerHTML = '';

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const messageData = change.doc.data();
                const li = document.createElement('li');
                const time = messageData.timestamp ? new Date(messageData.timestamp.toMillis()).toLocaleString() : 'N/A';
                li.textContent = `${messageData.text} (${time})`;
                messagesList.appendChild(li);
            }
        });
    }, (error) => {
        console.error("Error listening to messages: ", error);
        alert("Error loading messages: " + error.message);
    });
}


// --- Attach event listeners and run UI logic when the DOM is fully loaded ---
document.addEventListener('DOMContentLoaded', () => {
    // UI elements MUST be queried here, inside DOMContentLoaded
    const getSinglePlayerButton = document.getElementById('getSinglePlayerButton');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const messageInput = document.getElementById('messageInput'); // Get messageInput here too!

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signUpButton = document.getElementById('signup-button');
    const signInButton = document.getElementById('signin-button');
    const signOutButton = document.getElementById('signout-button');
    const userStatusParagraph = document.getElementById('user-status');


    // Assign event listeners
    if (signUpButton && emailInput && passwordInput) {
        signUpButton.addEventListener('click', () => handleSignUp(emailInput.value, passwordInput.value));
    } else {
        console.warn("Element with ID 'signup-button' or associated inputs not found. Sign up functionality may be unavailable.");
    }

    if (signInButton && emailInput && passwordInput) {
        signInButton.addEventListener('click', () => handleSignIn(emailInput.value, passwordInput.value));
    } else {
        console.warn("Element with ID 'signin-button' or associated inputs not found. Sign in functionality may be unavailable.");
    }

    if (signOutButton) {
        signOutButton.addEventListener('click', handleSignOut);
    } else {
        console.warn("Element with ID 'signout-button' not found. Sign out functionality may be unavailable.");
    }

    if (getSinglePlayerButton) {
        getSinglePlayerButton.addEventListener('click', getSinglePlayer);
    } else {
        console.warn("Element with ID 'getSinglePlayerButton' not found.");
    }

    if (sendMessageButton && messageInput) { // Ensure messageInput is also found
        sendMessageButton.addEventListener('click', () => addMessage(messageInput)); // Pass the input element
    } else {
        console.warn("Element with ID 'sendMessageButton' or 'messageInput' not found.");
    }


    // --- Authentication State Listener ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (userStatusParagraph) {
                userStatusParagraph.textContent = `User is signed in: ${user.email} (UID: ${user.uid})`;
            }
            if (signUpButton) signUpButton.style.display = 'none';
            if (signInButton) signInButton.style.display = 'none';
            if (signOutButton) signOutButton.style.display = 'inline-block';
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
        } else {
            // User is signed out
            if (userStatusParagraph) {
                userStatusParagraph.textContent = 'User is signed out.';
            }
            if (signUpButton) signUpButton.style.display = 'inline-block';
            if (signInButton) signInButton.style.display = 'inline-block';
            if (signOutButton) signOutButton.style.display = 'none';
        }
    });

    // Initialize real-time message display
    setupRealtimeMessagesListener();
});