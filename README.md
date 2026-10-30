# EICA — Egypt International Computer Academy

## Included
- `index.html`: Arabic RTL landing page and Firebase admin dashboard.
- `firebase/database.rules.json`: Admin-only rules for the six existing Realtime Database paths.
- `scripts/admin-setup.js`: Creates the main admin if missing and assigns the `admin: true` custom claim.
- `package.json`: Admin SDK dependency and setup command.

## Important safety notes
1. Make a Firebase Realtime Database JSON backup before changing rules.
2. The old database export contains student phone numbers and PINs. Do not publish the export or those records to a public GitHub repository.
3. `serviceAccountKey.json` is a server-side secret. Keep it outside the public website and never commit it.
4. The rules in this starter intentionally make all six existing paths admin-only. Existing student login flows will stop accessing these paths until students are securely migrated to Firebase Authentication and per-student rules are added.
5. This first admin dashboard is designed against the observed existing keys: `students`, `quizzes`, `quiz_results`, `notifications`, `content_views`, and `stats`. It does not delete records. Quiz creation adds an empty quiz shell; authoring questions needs a confirmed question schema.
6. Do not deploy the rules until you have tested admin login and accepted that legacy student access will be blocked.

## Create the main admin
1. In Firebase Console, enable Authentication > Sign-in method > Email/Password.
2. Create/download a Firebase Admin SDK service-account key. Store it locally as `serviceAccountKey.json` in the project root, or set `GOOGLE_APPLICATION_CREDENTIALS` to its local path.
3. From this folder run:
   ```bash
   npm install
   npm run setup-admin
   ```
4. If the account does not exist, the script generates a strong temporary password and prints it once in the terminal. Save it privately and change it after first login. If the account already exists, the script does not change its password.
5. Serve `index.html` through a local web server (not by opening `file://`). For example:
   ```bash
   npx serve .
   ```
6. Log in with `admin@eica-platform.com` and the password you saved.

## Firebase configuration
The web configuration provided by the project owner is already in `index.html`. Firebase web API keys are not server credentials; database access is controlled by Authentication and Security Rules.
