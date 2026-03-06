# Firebase SMS (Phone Authentication) Setup Guide

To enable SMS verification for your application, follow these steps in the Firebase Console:

1.  **Go to Firebase Console**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  **Select your project**: `elkafrawy-store`
3.  **Navigate to Authentication**: Click on "Build" > "Authentication" in the left sidebar.
4.  **Sign-in method**: Click on the "Sign-in method" tab.
5.  **Enable Phone**:
    *   Click on "Phone".
    *   Toggle the "Enable" switch.
    *   (Optional) Add test phone numbers for development (e.g., `+1 1234567890` with code `123456`).
    *   Click "Save".

## Usage in App

The application currently simulates SMS verification for demonstration purposes in `CompleteProfile.tsx`.

To implement real Firebase Phone Auth:
1.  Use `signInWithPhoneNumber` from `firebase/auth`.
2.  You will need to set up a `RecaptchaVerifier`.

```typescript
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const auth = getAuth();
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {});

const phoneNumber = getPhoneNumberFromUser();
const appVerifier = window.recaptchaVerifier;

signInWithPhoneNumber(auth, phoneNumber, appVerifier)
    .then((confirmationResult) => {
      // SMS sent. Prompt user to type the code from the message, then sign the
      // user in with confirmationResult.confirm(code).
      window.confirmationResult = confirmationResult;
    }).catch((error) => {
      // Error; SMS not sent
    });
```
