/* =========================================================
   EICA PLATFORM
   Authentication System
   Student & Admin Authentication
   ========================================================= */

import {
    app,
    auth,
    db,
    functions,
    ref,
    get,
    set,
    update,
    serverTimestamp,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    getIdTokenResult,
    httpsCallable
} from "./firebase.js";


/* =========================================================
   1. PLATFORM STATE
   ========================================================= */

window.EICA = window.EICA || {};

window.EICA.currentUser = null;
window.EICA.currentRole = null;
window.EICA.userProfile = null;
window.EICA.isAuthenticated = false;


/* =========================================================
   2. HELPERS
   ========================================================= */

const AuthHelpers = {

    normalizeEmail(value) {
        return String(value || "")
            .trim()
            .toLowerCase();
    },

    normalizeIdentifier(value) {
        return String(value || "").trim();
    },

    isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },

    getErrorMessage(error) {

        const messages = {

            "auth/invalid-email":
                "البريد الإلكتروني غير صحيح.",

            "auth/user-disabled":
                "هذا الحساب موقوف. يرجى التواصل مع الإدارة.",

            "auth/user-not-found":
                "الحساب غير موجود.",

            "auth/wrong-password":
                "كلمة المرور غير صحيحة.",

            "auth/invalid-credential":
                "بيانات تسجيل الدخول غير صحيحة.",

            "auth/email-already-in-use":
                "هذا البريد الإلكتروني مستخدم بالفعل.",

            "auth/weak-password":
                "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",

            "auth/too-many-requests":
                "محاولات كثيرة. حاول مرة أخرى لاحقًا.",

            "auth/network-request-failed":
                "تعذر الاتصال بالإنترنت.",

            "permission-denied":
                "ليس لديك صلاحية لتنفيذ هذا الإجراء."

        };

        return messages[error?.code] ||
            error?.message ||
            "حدث خطأ غير متوقع. حاول مرة أخرى.";

    },

    async getProfile(uid) {

        const snapshot = await get(
            ref(db, `platform/users/${uid}`)
        );

        return snapshot.exists()
            ? snapshot.val()
            : null;

    },

    async getAdminProfile(uid) {

        const snapshot = await get(
            ref(db, `platform/admins/${uid}`)
        );

        return snapshot.exists()
            ? snapshot.val()
            : null;

    }

};


/* =========================================================
   3. LOGIN IDENTIFIER RESOLVER
   ========================================================= */

/*
   تسجيل الدخول بالبريد الإلكتروني يتم مباشرة.

   تسجيل الدخول باسم المستخدم يحتاج Cloud Function
   باسم resolveLoginIdentifier.

   لا نبحث عن كلمات المرور أو أسماء المستخدمين
   في قاعدة البيانات من الواجهة الأمامية.
*/

async function resolveLoginEmail(identifier, loginType) {

    const value = AuthHelpers.normalizeIdentifier(identifier);

    if (AuthHelpers.isEmail(value)) {
        return AuthHelpers.normalizeEmail(value);
    }

    const resolver = httpsCallable(
        functions,
        "resolveLoginIdentifier"
    );

    const response = await resolver({

        identifier: value,

        loginType: loginType

    });

    const email = response?.data?.email;

    if (!email || !AuthHelpers.isEmail(email)) {

        throw new Error(
            "تعذر العثور على الحساب. تحقق من اسم المستخدم."
        );

    }

    return AuthHelpers.normalizeEmail(email);

}


/* =========================================================
   4. CHECK USER ROLE
   ========================================================= */

async function getVerifiedUserRole(user) {

    if (!user) {
        return null;
    }

    /*
       أولًا: قراءة الصلاحيات المعتمدة من Firebase Auth.
    */

    const tokenResult = await getIdTokenResult(user, true);

    const claims = tokenResult.claims || {};

    if (claims.super_admin === true) {
        return "super_admin";
    }

    if (claims.admin === true) {
        return "admin";
    }

    /*
       ثانيًا: قراءة سجل المدير من قاعدة البيانات.
       يجب حماية هذا المسار بقواعد صلاحيات صحيحة.
    */

    const adminProfile =
        await AuthHelpers.getAdminProfile(user.uid);

    if (
        adminProfile &&
        adminProfile.enabled === true &&
        ["super_admin", "admin"].includes(adminProfile.role)
    ) {

        return adminProfile.role;

    }

    /*
       ثالثًا: التحقق من حساب الطالب.
    */

    const studentProfile =
        await AuthHelpers.getProfile(user.uid);

    if (
        studentProfile &&
        studentProfile.role === "student" &&
        studentProfile.status !== "blocked"
    ) {

        return "student";

    }

    return null;

}


/* =========================================================
   5. LOGIN
   ========================================================= */

async function EICA_AUTH_LOGIN({
    identifier,
    password,
    loginType
}) {

    try {

        identifier = AuthHelpers.normalizeIdentifier(identifier);

        if (!identifier || !password) {

            throw new Error(
                "من فضلك أدخل بيانات تسجيل الدخول."
            );

        }

        if (!["student", "admin"].includes(loginType)) {

            throw new Error(
                "نوع الحساب غير صحيح."
            );

        }

        /*
           تحويل اسم المستخدم إلى بريد إلكتروني
           من خلال Cloud Function آمنة.
        */

        const email = await resolveLoginEmail(
            identifier,
            loginType
        );

        /*
           تسجيل الدخول باستخدام Firebase Auth.
        */

        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = credential.user;

        /*
           التحقق من الدور الحقيقي للحساب.
        */

        const role = await getVerifiedUserRole(user);

        if (!role) {

            await signOut(auth);

            throw new Error(
                "الحساب غير مفعّل أو لم يتم تعيين صلاحياته بعد."
            );

        }

        /*
           منع الطالب من الدخول إلى لوحة المدير.
        */

        if (
            loginType === "admin" &&
            !["admin", "super_admin"].includes(role)
        ) {

            await signOut(auth);

            throw new Error(
                "هذا الحساب ليس حساب مدير."
            );

        }

        /*
           منع المدير من استخدام واجهة دخول الطلاب.
        */

        if (
            loginType === "student" &&
            role !== "student"
        ) {

            await signOut(auth);

            throw new Error(
                "يرجى استخدام تسجيل دخول الإدارة."
            );

        }

        const profile = role === "student"
            ? await AuthHelpers.getProfile(user.uid)
            : await AuthHelpers.getAdminProfile(user.uid);

        window.EICA.currentUser = user;

        window.EICA.currentRole = role;

        window.EICA.userProfile = profile;

        window.EICA.isAuthenticated = true;

        window.EICA_UPDATE_ACCOUNT_UI?.(user, role);

        /*
           تسجيل آخر ظهور.
        */

        try {

            await update(
                ref(db, `platform/users/${user.uid}`),
                {
                    lastLoginAt: serverTimestamp()
                }
            );

        } catch (error) {

            console.warn(
                "Could not update last login:",
                error
            );

        }

        return {

            success: true,

            user: user,

            role: role,

            profile: profile

        };

    } catch (error) {

        console.error("EICA Login Error:", error);

        throw new Error(
            AuthHelpers.getErrorMessage(error)
        );

    }

}


/* =========================================================
   6. STUDENT REGISTRATION
   ========================================================= */

/*
   إنشاء حساب طالب جديد.

   لا يتم منح أي صلاحيات إدارية أثناء التسجيل.
*/

async function EICA_STUDENT_REGISTER(data = {}) {

    let createdUser = null;

    try {

        const name = String(
            data.name ||
            data.fullName ||
            data.studentName ||
            ""
        ).trim();

        const email = AuthHelpers.normalizeEmail(
            data.email
        );

        const password = String(
            data.password || ""
        );

        const phone = String(
            data.phone || ""
        ).trim();

        if (!name) {
            throw new Error("أدخل اسم الطالب.");
        }

        if (!AuthHelpers.isEmail(email)) {
            throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
        }

        if (password.length < 6) {
            throw new Error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
        }

        /*
           إنشاء الحساب في Firebase Authentication.
        */

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        createdUser = credential.user;

        /*
           تحديث اسم الحساب.
        */

        await updateProfile(createdUser, {
            displayName: name
        });

        /*
           حفظ بيانات الطالب في المسار الجديد.
           لا يتم تعديل سجل الطلاب القديم.
        */

        const studentData = {

            uid: createdUser.uid,

            name: name,

            email: email,

            phone: phone,

            role: "student",

            status: "pending",

            photoURL: "",

            createdAt: serverTimestamp(),

            lastLoginAt: serverTimestamp(),

            profileCompleted: false

        };

        await set(
            ref(db, `platform/users/${createdUser.uid}`),
            studentData
        );

        window.EICA.currentUser = createdUser;

        window.EICA.currentRole = "student";

        window.EICA.userProfile = studentData;

        window.EICA.isAuthenticated = true;

        window.EICA_UPDATE_ACCOUNT_UI?.(
            createdUser,
            "student"
        );

        return {

            success: true,

            user: createdUser,

            message:
                "تم إنشاء الحساب بنجاح. الحساب في انتظار تفعيل الإدارة."

        };

    } catch (error) {

        /*
           لو إنشاء الحساب نجح لكن حفظ البيانات فشل،
           نحاول حذف حساب Auth غير المكتمل من الجلسة الحالية.
        */

        if (createdUser) {

            try {

                await createdUser.delete();

            } catch (deleteError) {

                console.error(
                    "Incomplete account cleanup failed:",
                    deleteError
                );

            }

        }

        console.error(
            "EICA Registration Error:",
            error
        );

        throw new Error(
            AuthHelpers.getErrorMessage(error)
        );

    }

}


/* =========================================================
   7. PASSWORD RESET
   ========================================================= */

async function EICA_RESET_PASSWORD(email) {

    try {

        email = AuthHelpers.normalizeEmail(email);

        if (!AuthHelpers.isEmail(email)) {

            throw new Error(
                "أدخل بريدًا إلكترونيًا صحيحًا."
            );

        }

        await sendPasswordResetEmail(auth, email);

        return {

            success: true,

            message:
                "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني."

        };

    } catch (error) {

        console.error(
            "Password Reset Error:",
            error
        );

        throw new Error(
            AuthHelpers.getErrorMessage(error)
        );

    }

}


/* =========================================================
   8. CHANGE PASSWORD
   ========================================================= */

async function EICA_CHANGE_PASSWORD(newPassword) {

    try {

        const user = auth.currentUser;

        if (!user) {

            throw new Error(
                "يجب تسجيل الدخول أولًا."
            );

        }

        if (!newPassword || newPassword.length < 6) {

            throw new Error(
                "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف."
            );

        }

        const { updatePassword } =
            await import(
                "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"
            );

        await updatePassword(user, newPassword);

        return true;

    } catch (error) {

        console.error(
            "Change Password Error:",
            error
        );

        throw new Error(
            AuthHelpers.getErrorMessage(error)
        );

    }

}


/* =========================================================
   9. LOGOUT
   ========================================================= */

async function EICA_AUTH_LOGOUT() {

    try {

        await signOut(auth);

        window.EICA.currentUser = null;

        window.EICA.currentRole = null;

        window.EICA.userProfile = null;

        window.EICA.isAuthenticated = false;

        window.EICA_UPDATE_ACCOUNT_UI?.(null, null);

        return true;

    } catch (error) {

        console.error(
            "EICA Logout Error:",
            error
        );

        throw new Error(
            AuthHelpers.getErrorMessage(error)
        );

    }

}


/* =========================================================
   10. AUTH STATE LISTENER
   ========================================================= */

let authListenerStarted = false;

function EICA_START_AUTH_LISTENER() {

    if (authListenerStarted) {
        return;
    }

    authListenerStarted = true;

    onAuthStateChanged(auth, async user => {

        if (!user) {

            window.EICA.currentUser = null;

            window.EICA.currentRole = null;

            window.EICA.userProfile = null;

            window.EICA.isAuthenticated = false;

            window.EICA_UPDATE_ACCOUNT_UI?.(null, null);

            return;

        }

        try {

            const role = await getVerifiedUserRole(user);

            if (!role) {

                console.warn(
                    "Authenticated account has no active platform role."
                );

                window.EICA.currentUser = user;

                window.EICA.currentRole = null;

                window.EICA.isAuthenticated = false;

                window.EICA_UPDATE_ACCOUNT_UI?.(
                    user,
                    null
                );

                return;

            }

            const profile =
                role === "student"
                    ? await AuthHelpers.getProfile(user.uid)
                    : await AuthHelpers.getAdminProfile(user.uid);

            window.EICA.currentUser = user;

            window.EICA.currentRole = role;

            window.EICA.userProfile = profile;

            window.EICA.isAuthenticated = true;

            window.EICA_UPDATE_ACCOUNT_UI?.(
                user,
                role
            );

        } catch (error) {

            console.error(
                "Auth State Error:",
                error
            );

        }

    });

}


/* =========================================================
   11. EXPOSE AUTH FUNCTIONS TO MAIN.JS
   ========================================================= */

window.EICA_AUTH_LOGIN = EICA_AUTH_LOGIN;

window.EICA_STUDENT_REGISTER = EICA_STUDENT_REGISTER;

window.EICA_RESET_PASSWORD = EICA_RESET_PASSWORD;

window.EICA_CHANGE_PASSWORD = EICA_CHANGE_PASSWORD;

window.EICA_AUTH_LOGOUT = EICA_AUTH_LOGOUT;

window.EICA_START_AUTH_LISTENER =
    EICA_START_AUTH_LISTENER;


/* =========================================================
   12. START AUTHENTICATION
   ========================================================= */

EICA_START_AUTH_LISTENER();


console.log(
    "%c EICA AUTHENTICATION ",
    "background:#071a35;color:#00e5ff;padding:10px;font-weight:bold;border-radius:5px;"
);

console.log(
    "Authentication module loaded successfully."
);
