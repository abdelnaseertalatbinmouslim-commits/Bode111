const admin = require("firebase-admin");
const crypto = require("node:crypto");
const path = require("node:path");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "..", "serviceAccountKey.json");
const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://abodaa-default-rtdb.firebaseio.com"
});

async function main() {
  const email = process.env.EICA_ADMIN_EMAIL || "admin@eica-platform.com";
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log("Admin account already exists; existing password was not changed.");
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    const password = process.env.EICA_ADMIN_PASSWORD ||
      crypto.randomBytes(18).toString("base64url") + "aA1!";
    user = await admin.auth().createUser({
      email,
      password,
      displayName: "EICA Main Administrator",
      emailVerified: true
    });
    console.log("\\nNEW ADMIN ACCOUNT CREATED");
    console.log("Email:", email);
    console.log("Temporary password (save it now):", password);
    console.log("Change this password after the first login.\\n");
  }
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
    role: "super_admin",
    academy: "EICA"
  });
  console.log("SUPER ADMIN CLAIM SET");
  console.log("UID:", user.uid);
  console.log("Email:", email);
  console.log("Sign out and sign in again to refresh the ID token.");
}
main().then(() => process.exit(0)).catch(err => {
  console.error("Setup failed:", err);
  process.exit(1);
});
