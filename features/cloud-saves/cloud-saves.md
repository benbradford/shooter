# Feature: Cloud Saves

## Summary

Persist player save data online so progress syncs across devices and platforms (web, Android, iOS). Players sign in with their Google or Apple account and their save profiles are stored in Firebase Firestore.

## Current State

- Saves persist via **Vite dev server API** (dev) or **localStorage** (Android/production)
- localStorage is device-local — progress lost if app is uninstalled or player switches devices
- No authentication — profiles are just numbered slots (Profile1, Profile2, Profile3)
- WorldStateManager handles all save/load logic
- ProfileSelectScene handles profile listing, creation, deletion

## Desired State

### Authentication
- Google Sign-In on all platforms (native on Android/iOS, popup on web)
- Sign in with Apple on iOS (required by Apple if offering third-party sign-in)
- Optional — players can still play without signing in (localStorage only)
- Sign-in button on ProfileSelectScene
- Display player name/avatar when signed in

### Cloud Save Behavior
- When signed in: saves write to both localStorage AND Firestore
- When loading: Firestore takes priority over localStorage (cloud is source of truth)
- When offline: falls back to localStorage, syncs to cloud when connection returns
- When not signed in: current localStorage behavior unchanged
- Conflict resolution: most recent `timePlayed` wins (higher = newer)

### Data Model
- Firestore collection: `saves/{userId}/profiles/{profileName}`
- Each document contains the full WorldState JSON
- userId = Firebase Auth UID (unique per Google/Apple account)
- Max 3 profiles per user (same as current)

### Platform Support
- **Web**: Firebase JS SDK, Google Sign-In popup
- **Android**: Firebase Android SDK via Capacitor plugin, native Google Sign-In
- **iOS**: Firebase iOS SDK via Capacitor plugin, Google Sign-In + Sign in with Apple

## Technical Approach

### Firebase Setup
- Firebase project with Authentication (Google + Apple providers) and Firestore
- Firestore security rules: users can only read/write their own saves
- Free tier limits: 1GB storage, 50K reads/day, 20K writes/day (more than sufficient)

### SDK Integration
- Use `@capacitor-firebase/authentication` for native sign-in on Android/iOS
- Use `firebase/auth` and `firebase/firestore` JS SDK for web
- Abstract behind a `CloudSaveService` that WorldStateManager calls

### Architecture
```
ProfileSelectScene
  ├── Sign In button (Google / Apple)
  ├── Profile slots (same UI as now)
  └── Sync indicator (cloud icon when synced)

WorldStateManager
  ├── saveToFile() → localStorage + CloudSaveService.save()
  ├── loadFromFile() → CloudSaveService.load() ?? localStorage
  └── CloudSaveService (new)
       ├── isSignedIn()
       ├── save(profile, data)
       ├── load(profile) → WorldState | null
       ├── listProfiles() → string[]
       ├── deleteProfile(profile)
       └── signIn() / signOut()
```

### Offline Support
- All saves always go to localStorage first (instant, reliable)
- Cloud save is fire-and-forget (async, non-blocking)
- On load: try cloud first with timeout (2s), fall back to localStorage
- No complex sync queue — just "latest timePlayed wins"

## Questions — Resolved

1. **Syncing indicator**: Only on profile select screen (cloud icon next to profile slot)
2. **Auto-sync timing**: Save to cloud on level transitions and player death (same triggers as localStorage). No manual sync needed.
3. **Conflict resolution**: No manual option. Most recent `timePlayed` wins automatically.
4. **Sign-in mandatory?**: No — purely optional. Players can always play offline with localStorage only.
5. **Firebase project**: Create a new one for Beneath The Roots.
6. **Sign in with Apple**: Deferred. Launch with Google Sign-In only on web + Android. See "iOS Outstanding Work" below.
7. **Bundle size**: ~100KB gzipped is acceptable.

## iOS Outstanding Work (Deferred)

When adding iOS support, the following additional work is needed:

- **Sign in with Apple**: Apple requires this if any third-party sign-in (Google) is offered on iOS. Must implement before iOS App Store submission.
- **`@capacitor-firebase/authentication`**: Add Apple auth provider configuration
- **Firebase Console**: Enable Apple sign-in provider in Authentication settings
- **Apple Developer Portal**: Configure Sign in with Apple capability, create Service ID
- **UI**: Add "Sign in with Apple" button alongside Google button on ProfileSelectScene (iOS only)
- **CloudSaveService**: No changes needed — Apple auth returns same Firebase UID pattern
- **Testing**: Verify cloud saves work identically with Apple-authenticated users
- **Estimated effort**: 3-4 hours (mostly Apple Developer Portal config + UI button)

## Risks

- **Firebase SDK bundle size**: ~80-100KB gzipped for auth + firestore
- **Apple Sign-In requirement**: Must implement if offering Google Sign-In on iOS
- **Capacitor plugin compatibility**: Need to verify `@capacitor-firebase/authentication` works with current Capacitor version
- **Offline edge cases**: Player plays offline on two devices, both modify same profile — need conflict resolution
- **Firestore costs**: Free tier is generous but could be exceeded with very high player counts

## Estimated Effort

- Firebase project setup + security rules: 1 hour
- CloudSaveService abstraction: 2-3 hours
- WorldStateManager integration: 1-2 hours
- ProfileSelectScene sign-in UI: 2-3 hours
- Android native sign-in: 2-3 hours
- iOS native sign-in: 2-3 hours (includes Sign in with Apple)
- Web sign-in: 1 hour
- Testing across platforms: 3-4 hours
- **Total: ~15-20 hours**
