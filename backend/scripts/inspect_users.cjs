const { initializeApp } = require('../../frontend/node_modules/firebase/app');
const { getFirestore, collection, getDocs } = require('../../frontend/node_modules/firebase/firestore');

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5Q0JzSkNvb3JmUWhoOWJ3TncwTnJyeE00YzluYXRfRVN3', 'base64').toString(),
  authDomain: 'myurbandaily.firebaseapp.com',
  projectId: 'myurbandaily-458d0',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectAllUsers() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`=== USERS COLLECTION (${usersSnap.size} docs) ===`);
  const userMap = new Map();

  usersSnap.forEach((d) => {
    const data = d.data();
    if (data.email) {
      const email = data.email.toLowerCase().trim();
      userMap.set(email, {
        id: d.id,
        name: data.name || data.displayName || 'Valued Member',
        role: data.role === 'provider' || data.role === 'technician' ? 'provider' : 'customer',
        welcome_sent: data.welcome_email_sent,
        source: 'users'
      });
    }
  });

  const workbookSnap = await getDocs(collection(db, 'user_workbook'));
  console.log(`=== USER_WORKBOOK COLLECTION (${workbookSnap.size} docs) ===`);

  workbookSnap.forEach((d) => {
    const data = d.data();
    if (data.email) {
      const email = data.email.toLowerCase().trim();
      if (!userMap.has(email)) {
        userMap.set(email, {
          id: d.id,
          name: data.fullName || data.name || 'Valued Member',
          role: data.role === 'provider' || data.role === 'technician' ? 'provider' : 'customer',
          welcome_sent: data.welcome_email_sent,
          source: 'user_workbook'
        });
      }
    }
  });

  console.log(`\nTotal unique registered emails: ${userMap.size}`);
  for (const [email, u] of userMap.entries()) {
    console.log(`- Email: ${email} | Name: ${u.name} | Role: ${u.role} | WelcomeSent: ${u.welcome_sent} (Doc: ${u.id})`);
  }
}

inspectAllUsers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
