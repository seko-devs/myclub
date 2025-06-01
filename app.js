// app.js (This is the main entry point for your Webpack bundle)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import getAuth for authentication

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
    const getSinglePlayerButton = document.getElementById('getSinglePlayerButton');
    const sendMessageButton = document.getElementById('sendMessageButton');

    // Ensure buttons exist before attaching listeners
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