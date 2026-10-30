here/* =========================================================
   EICA PLATFORM
   Firebase Configuration & Services
   Project: abodaa
   ========================================================= */

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    getIdToken,
    getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    update,
    push,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo,
    serverTimestamp,
    runTransaction,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

import {
    getStorage,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    ref as storageRef
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";


/* =========================================================
   1. FIREBASE CONFIGURATION
   ========================================================= */

export const firebaseConfig = {
    apiKey: "AIzaSyD64Zup-c8pXmIeoRCUzSLtiyKJRfvAYbc",
    authDomain: "abodaa.firebaseapp.com",
    databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
    projectId: "abodaa",
    storageBucket: "abodaa.firebasestorage.app",
    messagingSenderId: "489477833785",
    appId: "1:489477833785:web:cf7451889d7e7a5efdf9e8",
    measurementId: "G-GQFLS5HEHZ"
};


/* =========================================================
   2. INITIALIZE FIREBASE
   ========================================================= */

export const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);


/* =========================================================
   3. FIREBASE SERVICES
   ========================================================= */

export const auth = getAuth(app);

export const db = getDatabase(app);

export const storage = getStorage(app);

export const functions = getFunctions(app);


/* =========================================================
   4. AUTHENTICATION EXPORTS
   ========================================================= */

export {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    getIdToken,
    getIdTokenResult
};


/* =========================================================
   5. DATABASE EXPORTS
   ========================================================= */

export {
    ref,
    get,
    set,
    update,
    push,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo,
    serverTimestamp,
    runTransaction,
    onDisconnect
};


/* =========================================================
   6. STORAGE EXPORTS
   ========================================================= */

export {
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    storageRef
};


/* =========================================================
   7. CLOUD FUNCTIONS EXPORTS
   ========================================================= */

export {
    httpsCallable
};


/* =========================================================
   8. OLD DATABASE PATHS
   الحفاظ على البيانات القديمة بدون حذف أو إعادة ضبط
   ========================================================= */

export const legacyPaths = {

    students: "students",

    quizzes: "quizzes",

    quizResults: "quiz_results",

    notifications: "notifications",

    contentViews: "content_views",

    stats: "stats"

};


/* =========================================================
   9. OLD DATABASE REFERENCES
   ========================================================= */

export const legacyRefs = {

    students: ref(db, legacyPaths.students),

    quizzes: ref(db, legacyPaths.quizzes),

    quizResults: ref(db, legacyPaths.quizResults),

    notifications: ref(db, legacyPaths.notifications),

    contentViews: ref(db, legacyPaths.contentViews),

    stats: ref(db, legacyPaths.stats)

};


/* =========================================================
   10. NEW PLATFORM DATABASE STRUCTURE
   مسارات إضافية للمنصة الجديدة
   ========================================================= */

export const platformPaths = {

    users: "platform/users",

    admins: "platform/admins",

    courses: "platform/courses",

    sections: "platform/sections",

    lessons: "platform/lessons",

    enrollments: "platform/enrollments",

    exams: "platform/exams",

    results: "platform/results",

    certificates: "platform/certificates",

    notifications: "platform/notifications",

    deviceBindings: "platform/deviceBindings",

    activityLogs: "platform/activityLogs",

    settings: "platform/settings"

};


/* =========================================================
   11. NEW PLATFORM DATABASE REFERENCES
   ========================================================= */

export const platformRefs = {

    users: ref(db, platformPaths.users),

    admins: ref(db, platformPaths.admins),

    courses: ref(db, platformPaths.courses),

    sections: ref(db, platformPaths.sections),

    lessons: ref(db, platformPaths.lessons),

    enrollments: ref(db, platformPaths.enrollments),

    exams: ref(db, platformPaths.exams),

    results: ref(db, platformPaths.results),

    certificates: ref(db, platformPaths.certificates),

    notifications: ref(db, platformPaths.notifications),

    deviceBindings: ref(db, platformPaths.deviceBindings),

    activityLogs: ref(db, platformPaths.activityLogs),

    settings: ref(db, platformPaths.settings)

};


/* =========================================================
   12. DATABASE HELPER FUNCTIONS
   ========================================================= */

export const Database = {

    // قراءة بيانات
    async read(path) {

        try {

            const snapshot = await get(ref(db, path));

            if (snapshot.exists()) {
                return snapshot.val();
            }

            return null;

        } catch (error) {

            console.error("Database Read Error:", error);

            throw error;

        }

    },


    // إضافة أو استبدال بيانات في مسار محدد
    async write(path, data) {

        try {

            await set(ref(db, path), data);

            return true;

        } catch (error) {

            console.error("Database Write Error:", error);

            throw error;

        }

    },


    // تحديث بيانات بدون استبدال المسار بالكامل
    async updateData(path, data) {

        try {

            await update(ref(db, path), data);

            return true;

        } catch (error) {

            console.error("Database Update Error:", error);

            throw error;

        }

    },


    // حذف بيانات من مسار محدد
    async delete(path) {

        try {

            await remove(ref(db, path));

            return true;

        } catch (error) {

            console.error("Database Delete Error:", error);

            throw error;

        }

    },


    // إضافة سجل جديد والحصول على مفتاحه
    async add(path, data) {

        try {

            const newRef = push(ref(db, path));

            await set(newRef, {
                ...data,
                createdAt: serverTimestamp()
            });

            return newRef.key;

        } catch (error) {

            console.error("Database Add Error:", error);

            throw error;

        }

    },


    // الاستماع للتغييرات المباشرة
    listen(path, callback, errorCallback = null) {

        return onValue(
            ref(db, path),

            snapshot => {

                callback(
                    snapshot.exists()
                        ? snapshot.val()
                        : null
                );

            },

            error => {

                console.error("Database Listener Error:", error);

                if (typeof errorCallback === "function") {
                    errorCallback(error);
                }

            }
        );

    }

};


/* =========================================================
   13. STORAGE HELPER FUNCTIONS
   ========================================================= */

export const Storage = {

    // رفع صورة أو ملف
    async upload(file, path) {

        try {

            if (!file) {
                throw new Error("لم يتم اختيار ملف.");
            }

            const fileRef = storageRef(storage, path);

            const result = await uploadBytes(fileRef, file);

            const downloadURL = await getDownloadURL(result.ref);

            return {
                path: result.ref.fullPath,
                url: downloadURL
            };

        } catch (error) {

            console.error("Storage Upload Error:", error);

            throw error;

        }

    },


    // الحصول على رابط ملف
    async getURL(path) {

        try {

            return await getDownloadURL(
                storageRef(storage, path)
            );

        } catch (error) {

            console.error("Storage URL Error:", error);

            throw error;

        }

    },


    // حذف ملف
    async delete(path) {

        try {

            await deleteObject(
                storageRef(storage, path)
            );

            return true;

        } catch (error) {

            console.error("Storage Delete Error:", error);

            throw error;

        }

    }

};


/* =========================================================
   14. AUTHENTICATION HELPER
   ========================================================= */

export const Authentication = {

    // المستخدم الحالي
    get currentUser() {

        return auth.currentUser;

    },


    // مراقبة حالة تسجيل الدخول
    observe(callback) {

        return onAuthStateChanged(auth, callback);

    },


    // تسجيل الخروج
    async logout() {

        try {

            await signOut(auth);

            return true;

        } catch (error) {

            console.error("Logout Error:", error);

            throw error;

        }

    },


    // إعادة تعيين كلمة المرور
    async resetPassword(email) {

        try {

            await sendPasswordResetEmail(auth, email);

            return true;

        } catch (error) {

            console.error("Password Reset Error:", error);

            throw error;

        }

    }

};


/* =========================================================
   15. PLATFORM INFORMATION
   ========================================================= */

export const EICA_CONFIG = {

    name: "Egypt International Computer Academy",

    shortName: "EICA",

    slogan: "THE FUTURE OF TECHNOLOGY STARTS HERE",

    projectId: firebaseConfig.projectId,

    version: "1.0.0",

    language: "ar",

    direction: "rtl"

};


/* =========================================================
   16. CONNECTION STATUS
   ========================================================= */

export const Connection = {

    listen(callback) {

        return onValue(
            ref(db, ".info/connected"),

            snapshot => {

                callback(snapshot.val() === true);

            }

        );

    }

};


/* =========================================================
   17. FIREBASE READY
   ========================================================= */

export const firebaseReady = true;

console.log(
    "%c EICA PLATFORM ",
    "background:#071a35;color:#00e5ff;padding:10px;font-weight:bold;border-radius:5px;"
);

console.log("Firebase initialized successfully.");
