// app.js (This is the main entry point for your Webpack bundle)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged } from 'firebase/auth'; // Import getAuth for authentication

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
const auth = getAuth(app); // Initialize auth using the modular SDK

// UI elements
const getSinglePlayerButton = document.getElementById('getSinglePlayerButton');
const sendMessageButton = document.getElementById('sendMessageButton');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signUpButton = document.getElementById('signup-button');
const signInButton = document.getElementById('signin-button');
const signOutButton = document.getElementById('signout-button');
const userStatusParagraph = document.getElementById('user-status');

const handleSignUp = async () => {
    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User signed up:', user);
        alert('Signed up successfully!');
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
const handleSignIn = async () => {
    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

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
  const docRef = doc(db, "players", "EteZoTtd40FPI0aYjEKw"); // Assuming a document with ID "EteZoTtd40FPI0aYjEKw" exists
  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      alert("Player data: " + JSON.stringify(docSnap.data(), null, 2)); // Use alert for visible feedback
    } else {
      console.log("No such document!");
      alert("No such player document!");
    }
  } catch (e) {
    console.error("Error getting document:", e);
    alert("Error getting player data: " + e.message);
  }
}

// --- Function to add message (moved from methods.js) ---
async function addMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (messageText === '') {
        alert('Please enter a message!');
        return;
    }

    try {
        const messagesCollectionRef = collection(db, "messages");
        await addDoc(messagesCollectionRef, {
            text: messageText,
            timestamp: new Date(), // Add a timestamp for ordering
        });
        console.log("Message added successfully!");
        messageInput.value = ''; // Clear input after sending
    } catch (e) {
        console.error("Error adding message: ", e);
        alert("Error sending message: " + e.message);
    }
}

// --- Function to display messages in real-time ---
function setupRealtimeMessagesListener() {
    const messagesList = document.getElementById('messages');
    // Order messages by timestamp for proper display
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

    // Clear existing messages when setting up listener to prevent duplicates on refresh
    messagesList.innerHTML = '';

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const messageData = change.doc.data();
                const li = document.createElement('li');
                // Format timestamp nicely
                const time = messageData.timestamp ? new Date(messageData.timestamp.toMillis()).toLocaleString() : 'N/A';
                li.textContent = `${messageData.text} (${time})`;
                messagesList.appendChild(li);
            }
            // You can also handle 'modified' and 'removed' changes here if needed
        });
    }, (error) => {
        console.error("Error listening to messages: ", error);
        alert("Error loading messages: " + error.message);
    });
}


// --- Attach event listeners when the DOM is fully loaded ---
document.addEventListener('DOMContentLoaded', () => {    

    // Ensure buttons exist before attaching listeners
    
    if (signUpButton) {
        signUpButton.addEventListener('click', signUpButton);
    } else {
        console.warn("Element with ID 'signUpButton' not found.");
    }

    if (getSinglePlayerButton) {
        getSinglePlayerButton.addEventListener('click', getSinglePlayer);
    } else {
        console.warn("Element with ID 'getSinglePlayerButton' not found.");
    }

    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', addMessage);
    } else {
        console.warn("Element with ID 'sendMessageButton' not found.");
    }

    // Initialize real-time message display
    setupRealtimeMessagesListener();
});