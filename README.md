# הלוח השיתופי (Collaborative Board)

אפליקציה שיתופית לשאלות ותשובות בזמן אמת המבוססת על React ו-Firebase.

## תכונות
- ניהול שאלות (הוספה, עריכה, מחיקה) על ידי מנהל.
- הוספת תשובות בזמן אמת על ידי משתמשים.
- שינוי גודל גופן לנוחות הקריאה.
- עיצוב מודרני ותומך עברית (RTL).

## הגדרת Firebase
כדי שהאפליקציה תעבוד, עליך להגדיר פרויקט ב-Firebase:
1. צור פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com/).
2. הפעל את **Authentication** ואפשר כניסה אנונימית (Anonymous Auth).
3. הפעל את **Firestore Database**.
4. העתק את הגדרות ה-Web App שלך לקובץ `.env` (ראה `.env.example`).
5. הגדר את חוקי האבטחה (Security Rules) ב-Firestore לפי הקובץ `firestore.rules` המצורף.

## הרצה מקומית
1. התקן תלויות: `npm install`
2. הרץ את השרת: `npm run dev`

## העלאה ל-GitHub ופריסה אוטומטית (CI/CD)
1. צור מאגר חדש ב-GitHub.
2. חבר את המאגר המקומי:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. **הגדרת פריסה אוטומטית (GitHub Actions):**
   - ב-Firebase Console, לך ל-Project Settings > Service Accounts.
   - צור מפתח חדש (JSON) עבור ה-Service Account.
   - ב-GitHub, לך ל-Settings > Secrets and variables > Actions.
   - הוסף Secret חדש בשם `FIREBASE_SERVICE_ACCOUNT_EDU_QUESTIONS_50F9A` והדבק בתוכו את תוכן קובץ ה-JSON שהורדת.
   - מעכשיו, בכל פעם שתעשה `push` לענף `main`, האפליקציה תתעדכן אוטומטית ב-Firebase Hosting.
