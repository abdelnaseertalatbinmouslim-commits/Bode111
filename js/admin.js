import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    set,
    update,
    push,
    remove
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

import {
    onAuthStateChanged,
    getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

/* ==========================================
   EICA ADMIN DASHBOARD
========================================== */

const ADMIN = {
    user: null,
    role: null,
    permissions: {},

    data: {
        users: {},
        courses: {},
        enrollments: {},
        exams: {},
        results: {},
        certificates: {},
        notifications: {},
        admins: {},
        activity: {},
        settings: {}
    },

    page: "overview",
    functions: getFunctions(undefined, "us-central1"),
    loading: false
};

const $ = selector => document.querySelector(selector);

const PATH = {
    users: "platform/users",
    courses: "platform/courses",
    enrollments: "platform/enrollments",
    lessons: "platform/lessons",
    exams: "platform/exams",
    results: "platform/results",
    certificates: "platform/certificates",
    notifications: "platform/notifications",
    admins: "platform/admins",
    activity: "platform/activityLogs",
    settings: "platform/settings"
};

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

const timestamp = () => Date.now();

function toast(message, type = "success") {
    let box = $("#eaToast");

    if (!box) {
        box = document.createElement("div");
        box.id = "eaToast";
        box.className = "ea-toast";
        document.body.appendChild(box);
    }

    box.textContent = message;
    box.className = `ea-toast show ${type}`;

    clearTimeout(box.timer);

    box.timer = setTimeout(() => {
        box.classList.remove("show");
    }, 3500);
}

function errorMessage(error) {
    console.error("[EICA ADMIN]", error);

    const code = error?.code || "";

    if (code.includes("permission-denied")) {
        return "ليس لديك صلاحية للوصول إلى هذه البيانات. راجع قواعد Firebase.";
    }

    if (code.includes("network")) {
        return "تحقق من اتصال الإنترنت وحاول مرة أخرى.";
    }

    if (code.includes("functions/not-found")) {
        return "وظيفة الخادم المطلوبة غير منشورة بعد.";
    }

    return error?.message || "حدث خطأ غير متوقع.";
}

/* ==========================================
   DATABASE HELPERS
========================================== */

async function read(path) {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : {};
}

async function write(path, data) {
    return set(ref(db, path), data);
}

async function patch(path, data) {
    return update(ref(db, path), data);
}

async function create(path, data) {
    const newRef = push(ref(db, path));

    await set(newRef, {
        ...data,
        createdAt: timestamp()
    });

    return newRef.key;
}

async function deleteRecord(path) {
    return remove(ref(db, path));
}

/* ==========================================
   PERMISSIONS
========================================== */

function can(permission) {
    if (ADMIN.role === "super_admin") return true;

    return ADMIN.permissions?.[permission] === true;
}

function requirePermission(permission) {
    if (can(permission)) return true;

    toast("ليس لديك صلاحية لتنفيذ هذا الإجراء.", "error");

    return false;
}

/* ==========================================
   ACTIVITY LOG
========================================== */

async function logActivity(action, details = {}) {
    if (!ADMIN.user) return;

    try {
        await create(
            `${PATH.activity}/${ADMIN.user.uid}`,
            {
                uid: ADMIN.user.uid,
                email: ADMIN.user.email || "",
                role: ADMIN.role,
                action,
                details,
                timestamp: timestamp()
            }
        );

    } catch (error) {
        console.warn("Activity log failed:", error);
    }
}

/* ==========================================
   DESIGN
========================================== */

function injectStyles() {
    if ($("#eicaAdminStyles")) return;

    const style = document.createElement("style");

    style.id = "eicaAdminStyles";

    style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

    :root {
        --ea-bg:#07111f;
        --ea-panel:#101e30;
        --ea-panel2:#14253a;
        --ea-line:rgba(255,255,255,.09);
        --ea-text:#f4f8ff;
        --ea-muted:#91a5bd;
        --ea-blue:#287cff;
        --ea-cyan:#00d5ff;
        --ea-green:#20d6a0;
        --ea-red:#ff5570;
        --ea-gold:#f5bd55;
    }

    #eicaAdmin {
        position:fixed;
        inset:0;
        z-index:999999;
        display:flex;
        direction:rtl;
        overflow:hidden;
        color:var(--ea-text);
        background:var(--ea-bg);
        font-family:'Cairo',sans-serif;
    }

    #eicaAdmin * {
        box-sizing:border-box;
    }

    #eicaAdmin button,
    #eicaAdmin input,
    #eicaAdmin select,
    #eicaAdmin textarea {
        font:inherit;
    }

    .ea-sidebar {
        width:260px;
        min-width:260px;
        height:100%;
        padding:20px 14px;
        overflow-y:auto;
        background:#0b1728;
        border-left:1px solid var(--ea-line);
        transition:.3s;
    }

    .ea-brand {
        display:flex;
        align-items:center;
        gap:12px;
        padding:8px 9px 22px;
        border-bottom:1px solid var(--ea-line);
        margin-bottom:20px;
    }

    .ea-logo {
        width:49px;
        height:49px;
        display:grid;
        place-items:center;
        border-radius:15px;
        font-size:25px;
        font-weight:900;
        background:linear-gradient(135deg,#1765ff,#00d5ff);
        box-shadow:0 0 30px #168bff55;
    }

    .ea-brand strong {
        display:block;
        font-size:18px;
    }

    .ea-brand small {
        color:var(--ea-muted);
        font-size:10px;
        letter-spacing:1px;
    }

    .ea-nav-label {
        color:#647d9c;
        font-size:11px;
        font-weight:800;
        padding:12px;
    }

    .ea-nav {
        display:flex;
        align-items:center;
        gap:12px;
        padding:12px;
        margin:4px 0;
        border-radius:12px;
        color:#a7b9d0;
        cursor:pointer;
        transition:.25s;
        font-size:13px;
        border:1px solid transparent;
    }

    .ea-nav:hover,
    .ea-nav.active {
        color:white;
        background:linear-gradient(90deg,#1675ff30,#00d5ff0c);
        border-color:#268bff35;
    }

    .ea-nav.active {
        box-shadow:inset -3px 0 var(--ea-cyan);
    }

    .ea-nav span:first-child {
        width:23px;
        text-align:center;
        font-size:17px;
    }

    .ea-main {
        flex:1;
        min-width:0;
        display:flex;
        flex-direction:column;
        overflow:hidden;
    }

    .ea-topbar {
        height:76px;
        min-height:76px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:0 25px;
        border-bottom:1px solid var(--ea-line);
        background:#0a1728;
    }

    .ea-topbar h2 {
        font-size:19px;
        margin:0;
    }

    .ea-topbar p {
        color:var(--ea-muted);
        font-size:11px;
        margin:3px 0 0;
    }

    .ea-top-actions {
        display:flex;
        align-items:center;
        gap:12px;
    }

    .ea-admin-badge {
        background:#1a3350;
        padding:8px 13px;
        border-radius:10px;
        font-size:11px;
        color:#8edfff;
    }

    .ea-content {
        padding:24px;
        overflow-y:auto;
        flex:1;
    }

    .ea-grid {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:15px;
        margin-bottom:22px;
    }

    .ea-card {
        background:linear-gradient(145deg,#14253a,#0e1b2c);
        border:1px solid var(--ea-line);
        border-radius:17px;
        padding:19px;
        min-width:0;
    }

    .ea-stat {
        display:flex;
        justify-content:space-between;
        align-items:center;
    }

    .ea-stat-icon {
        width:43px;
        height:43px;
        border-radius:13px;
        display:grid;
        place-items:center;
        background:#247cff22;
        font-size:20px;
    }

    .ea-stat small {
        color:var(--ea-muted);
        font-size:12px;
    }

    .ea-stat h3 {
        font-size:27px;
        margin:12px 0 0;
    }

    .ea-section-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin:22px 0 15px;
        flex-wrap:wrap;
    }

    .ea-section-title h3 {
        margin:0;
        font-size:17px;
    }

    .ea-btn {
        border:0;
        border-radius:10px;
        padding:10px 16px;
        background:linear-gradient(110deg,#176cff,#00a9ef);
        color:white;
        cursor:pointer;
        font-size:12px;
        font-weight:800;
        transition:.2s;
    }

    .ea-btn:hover {
        transform:translateY(-2px);
        box-shadow:0 8px 24px #168bff35;
    }

    .ea-btn.secondary {
        background:#203751;
    }

    .ea-btn.danger {
        background:#a92b45;
    }

    .ea-btn.success {
        background:#087e66;
    }

    .ea-btn:disabled {
        opacity:.5;
        cursor:not-allowed;
        transform:none;
    }

    .ea-table-wrap {
        width:100%;
        overflow:auto;
        background:#101e30;
        border:1px solid var(--ea-line);
        border-radius:15px;
    }

    .ea-table {
        width:100%;
        border-collapse:collapse;
        min-width:650px;
        font-size:12px;
    }

    .ea-table th,
    .ea-table td {
        padding:14px 13px;
        text-align:right;
        border-bottom:1px solid var(--ea-line);
    }

    .ea-table th {
        color:#8ca6c4;
        background:#14253a;
    }

    .ea-table td {
        color:#d9e6f7;
    }

    .ea-table tr:last-child td {
        border-bottom:0;
    }

    .ea-status {
        display:inline-block;
        border-radius:30px;
        padding:5px 10px;
        font-size:10px;
        background:#ffffff12;
    }

    .ea-status.active {
        color:#38e6b1;
        background:#20d6a018;
    }

    .ea-status.pending {
        color:#ffd47a;
        background:#f5bd5518;
    }

    .ea-status.blocked {
        color:#ff8395;
        background:#ff557018;
    }

    .ea-form {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:13px;
    }

    .ea-field {
        display:flex;
        flex-direction:column;
        gap:7px;
    }

    .ea-field.full {
        grid-column:1/-1;
    }

    .ea-field label {
        color:#9eb2ca;
        font-size:12px;
    }

    .ea-field input,
    .ea-field textarea,
    .ea-field select {
        width:100%;
        padding:12px;
        border-radius:10px;
        border:1px solid var(--ea-line);
        background:#091728;
        color:white;
        outline:none;
    }

    .ea-field input:focus,
    .ea-field textarea:focus,
    .ea-field select:focus {
        border-color:var(--ea-blue);
    }

    .ea-field textarea {
        min-height:100px;
        resize:vertical;
    }

    .ea-modal {
        position:fixed;
        inset:0;
        z-index:1000000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:15px;
        background:#000b;
        backdrop-filter:blur(8px);
    }

    .ea-modal.open {
        display:flex;
    }

    .ea-modal-box {
        width:min(650px,100%);
        max-height:90vh;
        overflow:auto;
        padding:23px;
        border:1px solid var(--ea-line);
        border-radius:18px;
        background:#102037;
    }

    .ea-modal-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
    }

    .ea-modal-head h3 {
        margin:0;
    }

    .ea-close {
        border:0;
        color:white;
        background:#ffffff12;
        border-radius:8px;
        padding:7px 12px;
        cursor:pointer;
    }

    .ea-toast {
        position:fixed;
        bottom:25px;
        left:25px;
        z-index:1000002;
        background:#142c43;
        border:1px solid #ffffff20;
        padding:13px 20px;
        border-radius:12px;
        opacity:0;
        transform:translateY(15px);
        pointer-events:none;
        transition:.3s;
        font-size:13px;
        max-width:min(90vw,450px);
    }

    .ea-toast.show {
        opacity:1;
        transform:translateY(0);
    }

    .ea-toast.error {
        border-color:#ff5570;
    }

    .ea-empty {
        text-align:center;
        color:var(--ea-muted);
        padding:35px 15px;
    }

    .ea-mobile-menu {
        display:none;
    }

    .ea-note {
        color:var(--ea-muted);
        font-size:12px;
        line-height:2;
    }

    .ea-actions {
        display:flex;
        gap:7px;
        flex-wrap:wrap;
    }

    @media(max-width:1050px) {
        .ea-grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .ea-sidebar {
            width:235px;
            min-width:235px;
        }
    }

    @media(max-width:700px) {
        .ea-sidebar {
            position:absolute;
            right:-280px;
            top:0;
            bottom:0;
            z-index:30;
            width:270px;
            min-width:270px;
        }

        .ea-sidebar.open {
            right:0;
            box-shadow:0 0 0 100vmax #0009;
        }

        .ea-mobile-menu {
            display:block;
        }

        .ea-topbar {
            padding:0 13px;
        }

        .ea-content {
            padding:14px;
        }

        .ea-grid {
            gap:9px;
        }

        .ea-card {
            padding:13px;
        }

        .ea-stat h3 {
            font-size:21px;
        }

        .ea-form {
            grid-template-columns:1fr;
        }

        .ea-field.full {
            grid-column:auto;
        }

        .ea-admin-badge {
            display:none;
        }

        #eaAdminEmail {
            display:none;
        }
    }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   DASHBOARD HTML
========================================== */

function mountDashboard() {
    if ($("#eicaAdmin")) return;

    const root = document.createElement("div");

    root.id = "eicaAdmin";

    root.innerHTML = `
        <aside class="ea-sidebar" id="eaSidebar">

            <div class="ea-brand">
                <div class="ea-logo">E</div>
                <div>
                    <strong>EICA ADMIN</strong>
                    <small>ACADEMY CONTROL CENTER</small>
                </div>
            </div>

            <div class="ea-nav-label">الرئيسية</div>

            <div class="ea-nav active" data-page="overview">
                <span>◈</span> نظرة عامة
            </div>

            <div class="ea-nav" data-page="students">
                <span>♙</span> إدارة الطلاب
            </div>

            <div class="ea-nav-label">المحتوى التعليمي</div>

            <div class="ea-nav" data-page="courses">
                <span>▣</span> الكورسات
            </div>

            <div class="ea-nav" data-page="sections">
                <span>▤</span> الأقسام والدروس
            </div>

            <div class="ea-nav" data-page="exams">
                <span>✎</span> الامتحانات
            </div>

            <div class="ea-nav" data-page="results">
                <span>◉</span> النتائج والتقييمات
            </div>

            <div class="ea-nav" data-page="certificates">
                <span>♜</span> الشهادات
            </div>

            <div class="ea-nav-label">الإدارة والتواصل</div>

            <div class="ea-nav" data-page="notifications">
                <span>♧</span> الإشعارات
            </div>

            <div class="ea-nav" data-page="admins">
                <span>♙</span> مديرو الفروع
            </div>

            <div class="ea-nav" data-page="activity">
                <span>⌁</span> سجل النشاطات
            </div>

            <div class="ea-nav" data-page="settings">
                <span>⚙</span> إعدادات المنصة
            </div>

            <div class="ea-nav-label">الحساب</div>

            <div class="ea-nav" id="eaLogout">
                <span>⇥</span> تسجيل الخروج
            </div>

        </aside>

        <main class="ea-main">

            <header class="ea-topbar">

                <div style="display:flex;align-items:center;gap:13px">

                    <button class="ea-btn secondary ea-mobile-menu" id="eaMenu">
                        ☰
                    </button>

                    <div>
                        <h2 id="eaPageTitle">نظرة عامة</h2>
                        <p>Egypt International Computer Academy</p>
                    </div>

                </div>

                <div class="ea-top-actions">
                    <span class="ea-admin-badge" id="eaRoleBadge">
                        SUPER ADMIN
                    </span>

                    <span id="eaAdminEmail"
                        style="font-size:11px;color:#9eb2ca">
                    </span>
                </div>

            </header>

            <section class="ea-content" id="eaContent">
                <div class="ea-empty">جاري تحميل لوحة التحكم...</div>
            </section>

        </main>

        <div class="ea-modal" id="eaModal">

            <div class="ea-modal-box">

                <div class="ea-modal-head">
                    <h3 id="eaModalTitle">إضافة جديد</h3>
                    <button class="ea-close" id="eaModalClose">✕</button>
                </div>

                <div id="eaModalBody"></div>

            </div>

        </div>
    `;

    document.body.appendChild(root);

    root.querySelectorAll(".ea-nav[data-page]").forEach(item => {
        item.addEventListener("click", () => {
            navigate(item.dataset.page);
            $("#eaSidebar").classList.remove("open");
        });
    });

    $("#eaMenu").onclick = () => {
        $("#eaSidebar").classList.toggle("open");
    };

    $("#eaModalClose").onclick = closeModal;

    $("#eaModal").onclick = event => {
        if (event.target.id === "eaModal") closeModal();
    };

    $("#eaLogout").onclick = async () => {
        if (!confirm("هل تريد تسجيل الخروج؟")) return;

        try {
            await auth.signOut();
            location.reload();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   LOAD DATA
========================================== */

async function safeRead(path) {
    try {
        return await read(path);
    } catch (error) {
        console.warn("Read failed:", path, error);
        return {};
    }
}

async function loadDashboardData() {
    if (!ADMIN.user) return;

    const uid = ADMIN.user.uid;

    const paths = {
        users: PATH.users,
        courses: PATH.courses,
        enrollments: PATH.enrollments,
        exams: PATH.exams,
        results: `${PATH.results}/${uid}`,
        certificates: `${PATH.certificates}/${uid}`,
        notifications: `${PATH.notifications}/${uid}`,
        admins: `${PATH.admins}/${uid}`,
        activity: `${PATH.activity}/${uid}`,
        settings: PATH.settings
    };

    for (const [key, path] of Object.entries(paths)) {
        ADMIN.data[key] = await safeRead(path);
    }

    /*
       بعض البيانات تحتاج قراءة إدارية من مساراتها الرئيسية.
       ستظهر عند السماح بها في Firebase Rules.
    */

    if (ADMIN.role === "super_admin") {
        const adminPaths = [
            ["results", PATH.results],
            ["certificates", PATH.certificates],
            ["notifications", PATH.notifications],
            ["admins", PATH.admins],
            ["activity", PATH.activity]
        ];

        for (const [key, path] of adminPaths) {
            ADMIN.data[key] = await safeRead(path);
        }
    }
}

/* ==========================================
   NAVIGATION
========================================== */

const pageTitles = {
    overview: "نظرة عامة",
    students: "إدارة الطلاب",
    courses: "إدارة الكورسات",
    sections: "الأقسام والدروس",
    exams: "الامتحانات",
    results: "النتائج والتقييمات",
    certificates: "الشهادات",
    notifications: "الإشعارات",
    admins: "مديرو الفروع",
    activity: "سجل النشاطات",
    settings: "إعدادات المنصة"
};

const pages = {
    overview: renderOverview,
    students: renderStudents,
    courses: renderCourses,
    sections: renderSections,
    exams: renderExams,
    results: renderResults,
    certificates: renderCertificates,
    notifications: renderNotifications,
    admins: renderAdmins,
    activity: renderActivity,
    settings: renderSettings
};

async function navigate(page) {
    if (!pages[page]) page = "overview";

    ADMIN.page = page;

    document.querySelectorAll(".ea-nav[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });

    $("#eaPageTitle").textContent = pageTitles[page];

    $("#eaContent").innerHTML =
        `<div class="ea-empty">جاري تحميل البيانات...</div>`;

    await loadDashboardData();

    pages[page]();
}

/* ==========================================
   OVERVIEW
========================================== */

function statCard(title, value, icon) {
    return `
        <div class="ea-card ea-stat">
            <div>
                <small>${escapeHTML(title)}</small>
                <h3>${Number(value) || 0}</h3>
            </div>

            <div class="ea-stat-icon">${icon}</div>
        </div>
    `;
}

function countAll(value) {
    return Object.values(value || {}).reduce((sum, item) => {
        if (item && typeof item === "object") {
            return sum + Object.keys(item).length;
        }

        return sum + 1;
    }, 0);
}

function renderOverview() {
    const users = Object.values(ADMIN.data.users || {});
    const courses = Object.values(ADMIN.data.courses || {});
    const exams = Object.values(ADMIN.data.exams || {});
    const certificates = ADMIN.data.certificates || {};

    const active = users.filter(user =>
        (user.status || "active") === "active"
    ).length;

    const pending = users.filter(user =>
        user.status === "pending"
    ).length;

    const blocked = users.filter(user =>
        user.status === "blocked"
    ).length;

    $("#eaContent").innerHTML = `

        <div class="ea-grid">

            ${statCard("إجمالي الطلاب", users.length, "♙")}

            ${statCard("الطلاب النشطون", active, "✓")}

            ${statCard("طلبات الانتظار", pending, "◷")}

            ${statCard("الطلاب المحظورون", blocked, "⊘")}

            ${statCard("الكورسات", courses.length, "▣")}

            ${statCard("الامتحانات", exams.length, "✎")}

            ${statCard("الشهادات", countAll(certificates), "♜")}

            ${statCard(
                "مديرو الفروع",
                countAll(ADMIN.data.admins),
                "♙"
            )}

        </div>

        <div class="ea-card">

            <div class="ea-section-title">
                <h3>مركز التحكم بالأكاديمية</h3>
                <span class="ea-status active">SYSTEM ONLINE</span>
            </div>

            <p class="ea-note">
                مرحباً بك في لوحة إدارة EICA.
                من هنا يمكنك متابعة الطلاب، وإدارة المحتوى التعليمي،
                وإسناد الكورسات، وإصدار الشهادات وإدارة التواصل.
            </p>

            <div class="ea-actions">
                <button class="ea-btn" id="eaQuickStudent">
                    إدارة الطلاب
                </button>

                <button class="ea-btn secondary" id="eaQuickCourse">
                    إضافة كورس
                </button>
            </div>

        </div>

        <div class="ea-section-title">
            <h3>آخر الطلاب المسجلين</h3>
        </div>

        ${studentTable(
            Object.entries(ADMIN.data.users || {})
                .map(([uid, user]) => ({ ...user, uid }))
                .sort((a, b) =>
                    (b.createdAt || 0) - (a.createdAt || 0)
                )
                .slice(0, 6)
        )}

    `;

    $("#eaQuickStudent").onclick = () => navigate("students");
    $("#eaQuickCourse").onclick = () => openCourseForm();
}

/* ==========================================
   STUDENTS
========================================== */

function getStudentName(user) {
    return user.fullName || user.name || "بدون اسم";
}

function studentTable(users) {
    if (!users.length) {
        return `<div class="ea-empty">لا توجد بيانات طلاب حتى الآن.</div>`;
    }

    return `
        <div class="ea-table-wrap">

            <table class="ea-table">

                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>

                <tbody>

                    ${users.map(user => {
                        const status = user.status || "active";

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(getStudentName(user))}
                                </td>

                                <td>
                                    ${escapeHTML(user.email || "—")}
                                </td>

                                <td>
                                    <span class="ea-status ${escapeHTML(status)}">
                                        ${escapeHTML(status)}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        class="ea-btn secondary"
                                        data-student="${escapeHTML(user.uid)}">
                                        إدارة
                                    </button>
                                </td>

                            </tr>
                        `;
                    }).join("")}

                </tbody>

            </table>

        </div>
    `;
}

function renderStudents() {
    const users = Object.entries(ADMIN.data.users || {})
        .map(([uid, user]) => ({
            ...user,
            uid
        }))
        .sort((a, b) =>
            (b.createdAt || 0) - (a.createdAt || 0)
        );

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>قاعدة بيانات الطلاب</h3>

            <div class="ea-actions">

                <button class="ea-btn" id="eaAddStudent">
                    + إضافة طالب
                </button>

                <button class="ea-btn secondary" id="eaRefreshStudents">
                    تحديث ↻
                </button>

            </div>

        </div>

        <div class="ea-card">
            <p class="ea-note">
                إدارة بيانات الطلاب وحالات الحسابات وإسناد الكورسات.
                إنشاء حساب تسجيل دخول جديد يتم عن طريق وظيفة خادم موثوقة.
            </p>
        </div>

        <div class="ea-section-title">
            <h3>قائمة الطلاب (${users.length})</h3>
        </div>

        ${studentTable(users)}

    `;

    $("#eaRefreshStudents").onclick = () => navigate("students");

    $("#eaAddStudent").onclick = openStudentForm;

    document.querySelectorAll("[data-student]").forEach(button => {
        button.onclick = () => openStudent(button.dataset.student);
    });
}

function openStudentForm() {
    if (!requirePermission("manageStudents")) return;

    showModal("إضافة بيانات طالب", `

        <form class="ea-form" id="eaStudentForm">

            <div class="ea-field full">
                <label>الاسم بالكامل</label>
                <input name="fullName" required>
            </div>

            <div class="ea-field">
                <label>البريد الإلكتروني</label>
                <input name="email" type="email">
            </div>

            <div class="ea-field">
                <label>رقم الهاتف</label>
                <input name="phone">
            </div>

            <div class="ea-field full">
                <label>الحالة</label>
                <select name="status">
                    <option value="active">نشط</option>
                    <option value="pending">قيد المراجعة</option>
                    <option value="blocked">محظور</option>
                </select>
            </div>

            <div class="ea-field full">
                <p class="ea-note">
                    هذا النموذج يضيف بيانات طالب موجود له حساب Firebase Auth.
                    لا ينشئ حساب دخول أو كلمة مرور.
                </p>
            </div>

            <button class="ea-btn">حفظ البيانات</button>

        </form>

    `);

    $("#eaStudentForm").onsubmit = async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(event.target));

        try {
            const callable = httpsCallable(
                ADMIN.functions,
                "adminCreateStudent"
            );

            const result = await callable({
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                status: data.status
            });

            if (!result.data?.uid) {
                throw new Error("لم يرجع الخادم معرف الطالب.");
            }

            toast("تم إنشاء حساب الطالب.");

            await logActivity("student_created", {
                uid: result.data.uid
            });

            closeModal();
            navigate("students");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

function openStudent(uid) {
    const student = ADMIN.data.users[uid];

    if (!student) return;

    showModal("إدارة حساب الطالب", `

        <div class="ea-card">

            <h3>${escapeHTML(getStudentName(student))}</h3>

            <p class="ea-note">
                ${escapeHTML(student.email || "")}
            </p>

            <p class="ea-note">
                رقم الهاتف: ${escapeHTML(student.phone || "—")}
            </p>

            <p class="ea-note">
                UID: ${escapeHTML(uid)}
            </p>

            <p>
                الحالة:
                ${escapeHTML(student.status || "active")}
            </p>

        </div>

        <div class="ea-actions" style="margin-top:15px">

            <button class="ea-btn success" id="eaActivateStudent">
                تفعيل الحساب
            </button>

            <button class="ea-btn danger" id="eaBlockStudent">
                حظر الحساب
            </button>

            <button class="ea-btn secondary" id="eaPendingStudent">
                إرجاع للانتظار
            </button>

            <button class="ea-btn" id="eaAssignStudent">
                إسناد كورس
            </button>

        </div>

    `);

    $("#eaActivateStudent").onclick = () =>
        changeStudentStatus(uid, "active");

    $("#eaBlockStudent").onclick = () =>
        changeStudentStatus(uid, "blocked");

    $("#eaPendingStudent").onclick = () =>
        changeStudentStatus(uid, "pending");

    $("#eaAssignStudent").onclick = () =>
        openEnrollmentForm(uid);
}

async function changeStudentStatus(uid, status) {
    if (!requirePermission("manageStudents")) return;

    try {
        await patch(`${PATH.users}/${uid}`, {
            status,
            updatedAt: timestamp()
        });

        await logActivity("student_status_changed", {
            uid,
            status
        });

        toast("تم تحديث حالة الطالب.");

        closeModal();
        navigate("students");

    } catch (error) {
        toast(errorMessage(error), "error");
    }
}

/* ==========================================
   COURSES
========================================== */

function renderCourses() {
    const courses = Object.entries(ADMIN.data.courses || {});

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>إدارة الكورسات التعليمية</h3>

            <button class="ea-btn" id="eaAddCourse">
                + إضافة كورس
            </button>

        </div>

        <div class="ea-grid">

            ${courses.map(([id, course]) => `

                <div class="ea-card">

                    <div style="font-size:25px">▣</div>

                    <h3>${escapeHTML(course.title || "كورس بدون عنوان")}</h3>

                    <p class="ea-note">
                        ${escapeHTML(course.description || "")}
                    </p>

                    <span class="ea-status ${
                        course.published ? "active" : "pending"
                    }">
                        ${course.published ? "منشور" : "مسودة"}
                    </span>

                    <div class="ea-actions" style="margin-top:15px">

                        <button
                            class="ea-btn secondary"
                            data-edit-course="${escapeHTML(id)}">
                            تعديل
                        </button>

                        <button
                            class="ea-btn"
                            data-publish-course="${escapeHTML(id)}">
                            ${course.published ? "إلغاء النشر" : "نشر"}
                        </button>

                    </div>

                </div>

            `).join("")}

        </div>

        ${courses.length ? "" : `
            <div class="ea-empty">لم تتم إضافة كورسات بعد.</div>
        `}

    `;

    $("#eaAddCourse").onclick = () => openCourseForm();

    document.querySelectorAll("[data-edit-course]").forEach(button => {
        button.onclick = () => openCourseForm(button.dataset.editCourse);
    });

    document.querySelectorAll("[data-publish-course]").forEach(button => {
        button.onclick = () =>
            toggleCoursePublish(button.dataset.publishCourse);
    });
}

function openCourseForm(id = null) {
    if (!requirePermission("manageCourses")) return;

    const old = id ? ADMIN.data.courses[id] : {};

    showModal(id ? "تعديل الكورس" : "إضافة كورس جديد", `

        <form class="ea-form" id="eaCourseForm">

            <div class="ea-field full">
                <label>اسم الكورس</label>
                <input
                    name="title"
                    required
                    value="${escapeHTML(old.title || "")}">
            </div>

            <div class="ea-field full">
                <label>وصف الكورس</label>
                <textarea name="description">${escapeHTML(old.description || "")}</textarea>
            </div>

            <div class="ea-field">
                <label>التصنيف</label>
                <input
                    name="category"
                    value="${escapeHTML(old.category || "")}">
            </div>

            <div class="ea-field">
                <label>المستوى</label>
                <select name="level">
                    <option value="beginner">مبتدئ</option>
                    <option value="intermediate">متوسط</option>
                    <option value="advanced">متقدم</option>
                </select>
            </div>

            <div class="ea-field full">
                <label>رابط صورة الغلاف</label>
                <input
                    name="coverURL"
                    value="${escapeHTML(old.coverURL || "")}">
            </div>

            <button class="ea-btn">حفظ الكورس</button>

        </form>

    `);

    $("#eaCourseForm").onsubmit = async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(event.target));

        try {
            const courseId = id || push(ref(db, PATH.courses)).key;

            await patch(`${PATH.courses}/${courseId}`, {
                ...data,
                enabled: old.enabled ?? true,
                published: old.published ?? false,
                createdAt: old.createdAt || timestamp(),
                updatedAt: timestamp()
            });

            await logActivity("course_saved", { courseId });

            toast("تم حفظ الكورس.");

            closeModal();
            navigate("courses");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

async function toggleCoursePublish(id) {
    if (!requirePermission("manageCourses")) return;

    const course = ADMIN.data.courses[id];

    if (!course) return;

    const published = !course.published;

    try {
        await patch(`${PATH.courses}/${id}`, {
            published,
            enabled: true,
            updatedAt: timestamp()
        });

        await logActivity("course_publish_changed", {
            courseId: id,
            published
        });

        toast(published ? "تم نشر الكورس." : "تم إلغاء نشر الكورس.");

        navigate("courses");

    } catch (error) {
        toast(errorMessage(error), "error");
    }
}

/* ==========================================
   SECTIONS AND LESSONS
========================================== */

/*
  هيكل الدروس المعتمد:

  platform/lessons/
      courseId/
          sectionId/
              title
              description
              lessons/
                  lessonId/
*/

function renderSections() {
    const courses = Object.entries(ADMIN.data.courses || {});

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">
            <h3>الأقسام والدروس</h3>
        </div>

        <div class="ea-card">

            <div class="ea-field">

                <label>اختر الكورس</label>

                <select id="eaSectionCourse">

                    <option value="">اختر كورساً</option>

                    ${courses.map(([id, course]) => `
                        <option value="${escapeHTML(id)}">
                            ${escapeHTML(course.title)}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div id="eaSectionArea" style="margin-top:20px"></div>

        </div>

    `;

    $("#eaSectionCourse").onchange = async event => {
        const courseId = event.target.value;

        const area = $("#eaSectionArea");

        if (!courseId) {
            area.innerHTML = "";
            return;
        }

        area.innerHTML = `<div class="ea-empty">جاري التحميل...</div>`;

        const sections = await safeRead(`${PATH.lessons}/${courseId}`);

        area.innerHTML = `

            <button class="ea-btn" id="eaAddSection">
                + إضافة قسم
            </button>

            <div style="margin-top:15px">

                ${Object.entries(sections).map(([id, section]) => `

                    <div class="ea-card" style="margin-bottom:12px">

                        <div class="ea-section-title">
                            <h3>${escapeHTML(section.title || "قسم")}</h3>

                            <button
                                class="ea-btn secondary"
                                data-add-lesson="${escapeHTML(id)}">
                                + إضافة درس
                            </button>
                        </div>

                        <p class="ea-note">
                            ${escapeHTML(section.description || "")}
                        </p>

                        <div>
                            ${renderLessonList(section.lessons || {})}
                        </div>

                    </div>

                `).join("") || `
                    <div class="ea-empty">لا توجد أقسام لهذا الكورس.</div>
                `}

            </div>

        `;

        $("#eaAddSection").onclick = () => addSection(courseId);

        area.querySelectorAll("[data-add-lesson]").forEach(button => {
            button.onclick = () =>
                addLesson(courseId, button.dataset.addLesson);
        });

        area.querySelectorAll("[data-delete-lesson]").forEach(button => {
            button.onclick = () =>
                deleteLesson(
                    courseId,
                    button.dataset.section,
                    button.dataset.deleteLesson
                );
        });
    };
}

function renderLessonList(lessons) {
    const entries = Object.entries(lessons || {});

    if (!entries.length) {
        return `<p class="ea-note">لا توجد دروس داخل هذا القسم.</p>`;
    }

    return entries.map(([id, lesson]) => `

        <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            align-items:center;
            padding:10px;
            border-bottom:1px solid var(--ea-line)
        ">

            <span>${escapeHTML(lesson.title || "درس")}</span>

            <button
                class="ea-btn danger"
                data-delete-lesson="${escapeHTML(id)}"
                data-section="${escapeHTML(lesson.sectionId || "")}">
                حذف
            </button>

        </div>

    `).join("");
}

async function addSection(courseId) {
    if (!requirePermission("manageCourses")) return;

    showModal("إضافة قسم", `

        <form id="eaSectionForm" class="ea-form">

            <div class="ea-field full">
                <label>اسم القسم</label>
                <input name="title" required>
            </div>

            <div class="ea-field full">
                <label>الوصف</label>
                <textarea name="description"></textarea>
            </div>

            <button class="ea-btn">حفظ القسم</button>

        </form>

    `);

    $("#eaSectionForm").onsubmit = async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(event.target));

        try {
            const sectionId = push(
                ref(db, `${PATH.lessons}/${courseId}`)
            ).key;

            await write(
                `${PATH.lessons}/${courseId}/${sectionId}`,
                {
                    ...data,
                    createdAt: timestamp(),
                    lessons: {}
                }
            );

            await logActivity("section_created", {
                courseId,
                sectionId
            });

            toast("تمت إضافة القسم.");

            closeModal();
            navigate("sections");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

async function addLesson(courseId, sectionId) {
    if (!requirePermission("manageCourses")) return;

    showModal("إضافة درس", `

        <form id="eaLessonForm" class="ea-form">

            <div class="ea-field full">
                <label>عنوان الدرس</label>
                <input name="title" required>
            </div>

            <div class="ea-field full">
                <label>وصف الدرس</label>
                <textarea name="description"></textarea>
            </div>

            <div class="ea-field full">
                <label>رابط الفيديو</label>
                <input name="videoURL" placeholder="رابط فيديو YouTube أو MP4">
            </div>

            <div class="ea-field full">
                <label>محتوى الدرس</label>
                <textarea name="content"></textarea>
            </div>

            <button class="ea-btn">حفظ الدرس</button>

        </form>

    `);

    $("#eaLessonForm").onsubmit = async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(event.target));

        try {
            const lessonId = push(
                ref(db, `${PATH.lessons}/${courseId}/${sectionId}/lessons`)
            ).key;

            await write(
                `${PATH.lessons}/${courseId}/${sectionId}/lessons/${lessonId}`,
                {
                    ...data,
                    sectionId,
                    published: false,
                    createdAt: timestamp()
                }
            );

            await logActivity("lesson_created", {
                courseId,
                sectionId,
                lessonId
            });

            toast("تمت إضافة الدرس.");

            closeModal();
            navigate("sections");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

async function deleteLesson(courseId, sectionId, lessonId) {
    if (!requirePermission("manageCourses")) return;

    if (!confirm("هل تريد حذف هذا الدرس؟")) return;

    try {
        await deleteRecord(
            `${PATH.lessons}/${courseId}/${sectionId}/lessons/${lessonId}`
        );

        await logActivity("lesson_deleted", {
            courseId,
            sectionId,
            lessonId
        });

        toast("تم حذف الدرس.");

        navigate("sections");

    } catch (error) {
        toast(errorMessage(error), "error");
    }
}

/* ==========================================
   COURSE ENROLLMENTS
========================================== */

function openEnrollmentForm(preselectedUid = "") {
    if (!requirePermission("assignCourses")) return;

    const users = Object.entries(ADMIN.data.users || {});
    const courses = Object.entries(ADMIN.data.courses || {});

    showModal("إسناد كورس لطالب", `

        <form id="eaEnrollmentForm" class="ea-form">

            <div class="ea-field full">

                <label>الطالب</label>

                <select name="uid" required>

                    <option value="">اختر الطالب</option>

                    ${users.map(([uid, user]) => `
                        <option
                            value="${escapeHTML(uid)}"
                            ${uid === preselectedUid ? "selected" : ""}>
                            ${escapeHTML(getStudentName(user))}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div class="ea-field full">

                <label>الكورس</label>

                <select name="courseId" required>

                    <option value="">اختر الكورس</option>

                    ${courses.map(([id, course]) => `
                        <option value="${escapeHTML(id)}">
                            ${escapeHTML(course.title)}
                        </option>
                    `).join("")}

                </select>

            </div>

            <button class="ea-btn">إسناد الكورس</button>

        </form>

    `);

    $("#eaEnrollmentForm").onsubmit = async event => {
        event.preventDefault();

        const { uid, courseId } =
            Object.fromEntries(new FormData(event.target));

        try {
            await write(
                `${PATH.enrollments}/${uid}/${courseId}`,
                {
                    courseId,
                    assignedBy: ADMIN.user.uid,
                    status: "active",
                    assignedAt: timestamp()
                }
            );

            await logActivity("course_assigned", {
                uid,
                courseId
            });

            toast("تم إسناد الكورس للطالب.");

            closeModal();

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   EXAMS
========================================== */

function renderExams() {
    const exams = Object.entries(ADMIN.data.exams || {});

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>إدارة الامتحانات</h3>

            <button class="ea-btn" id="eaAddExam">
                + إنشاء امتحان
            </button>

        </div>

        ${exams.length ? `

            <div class="ea-table-wrap">

                <table class="ea-table">

                    <thead>
                        <tr>
                            <th>الامتحان</th>
                            <th>الكورس</th>
                            <th>المدة</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${exams.map(([id, exam]) => `

                            <tr>

                                <td>${escapeHTML(exam.title || "امتحان")}</td>

                                <td>
                                    ${escapeHTML(
                                        ADMIN.data.courses[exam.courseId]?.title || "—"
                                    )}
                                </td>

                                <td>${Number(exam.duration || 0)} دقيقة</td>

                                <td>${escapeHTML(exam.status || "draft")}</td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        ` : `
            <div class="ea-empty">لا توجد امتحانات.</div>
        `}

        <div class="ea-card" style="margin-top:15px">
            <p class="ea-note">
                إنشاء الامتحان هنا ينشئ مسودة فقط.
                نشر الأسئلة وتسليم الإجابات والتصحيح النهائي
                يحتاج إلى وظائف خادم موثوقة.
            </p>
        </div>

    `;

    $("#eaAddExam").onclick = createExam;
}

function createExam() {
    if (!requirePermission("manageExams")) return;

    showModal("إنشاء امتحان", `

        <form id="eaExamForm" class="ea-form">

            <div class="ea-field full">
                <label>اسم الامتحان</label>
                <input name="title" required>
            </div>

            <div class="ea-field full">

                <label>الكورس</label>

                <select name="courseId" required>

                    <option value="">اختر الكورس</option>

                    ${Object.entries(ADMIN.data.courses || {}).map(([id, course]) => `
                        <option value="${escapeHTML(id)}">
                            ${escapeHTML(course.title)}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div class="ea-field">
                <label>المدة بالدقائق</label>
                <input name="duration" type="number" min="1" value="30">
            </div>

            <div class="ea-field">
                <label>الدرجة النهائية</label>
                <input name="totalMarks" type="number" min="1" value="100">
            </div>

            <div class="ea-field full">
                <label>الوصف</label>
                <textarea name="description"></textarea>
            </div>

            <button class="ea-btn">إنشاء الامتحان</button>

        </form>

    `);

    $("#eaExamForm").onsubmit = async event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(event.target));

        try {
            await create(PATH.exams, {
                ...data,
                duration: Number(data.duration),
                totalMarks: Number(data.totalMarks),
                status: "draft",
                published: false,
                questions: {}
            });

            await logActivity("exam_created", {
                title: data.title
            });

            toast("تم إنشاء الامتحان كمسودة.");

            closeModal();
            navigate("exams");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   RESULTS
========================================== */

function flattenRecords(value) {
    const output = [];

    Object.entries(value || {}).forEach(([uid, records]) => {
        if (!records || typeof records !== "object") return;

        Object.entries(records).forEach(([id, record]) => {
            output.push({
                ...record,
                uid: record.uid || uid,
                recordId: id
            });
        });
    });

    return output;
}

function renderResults() {
    const results = flattenRecords(ADMIN.data.results);

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">
            <h3>نتائج الامتحانات</h3>
        </div>

        <div class="ea-card">
            <p class="ea-note">
                تظهر النتائج المحفوظة في قاعدة البيانات.
                يجب أن يتم التصحيح النهائي من الخادم لمنع التلاعب بالدرجات.
            </p>
        </div>

        ${results.length ? `

            <div class="ea-table-wrap" style="margin-top:15px">

                <table class="ea-table">

                    <thead>
                        <tr>
                            <th>الطالب</th>
                            <th>الامتحان</th>
                            <th>الدرجة</th>
                            <th>التاريخ</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${results.map(item => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        ADMIN.data.users[item.uid]?.fullName ||
                                        item.studentName ||
                                        item.uid
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(item.examTitle || item.examId || "—")}
                                </td>

                                <td>${escapeHTML(item.score ?? "—")}</td>

                                <td>
                                    ${item.submittedAt
                                        ? new Date(item.submittedAt).toLocaleString("ar-EG")
                                        : "—"}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        ` : `
            <div class="ea-empty">لا توجد نتائج محفوظة بعد.</div>
        `}

    `;
}

/* ==========================================
   CERTIFICATES
========================================== */

function renderCertificates() {
    const certificates = flattenRecords(ADMIN.data.certificates);

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>الشهادات</h3>

            <button class="ea-btn" id="eaIssueCertificate">
                + إصدار شهادة
            </button>

        </div>

        <div class="ea-card">
            <p class="ea-note">
                يتم تسجيل الشهادات داخل قاعدة البيانات.
                إنشاء ملف PDF والتحقق العام من الشهادة
                يمكن إضافتهما كمرحلة مستقلة.
            </p>
        </div>

        <div class="ea-section-title">
            <h3>الشهادات المسجلة (${certificates.length})</h3>
        </div>

        ${certificates.length ? `

            <div class="ea-table-wrap">

                <table class="ea-table">

                    <thead>
                        <tr>
                            <th>الطالب</th>
                            <th>الكورس</th>
                            <th>رقم الشهادة</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${certificates.map(c => `

                            <tr>
                                <td>${escapeHTML(c.studentName || c.uid || "—")}</td>
                                <td>${escapeHTML(c.courseTitle || "—")}</td>
                                <td>${escapeHTML(c.certificateNumber || "—")}</td>
                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        ` : `
            <div class="ea-empty">لا توجد شهادات بعد.</div>
        `}

    `;

    $("#eaIssueCertificate").onclick = issueCertificate;
}

function issueCertificate() {
    if (!requirePermission("manageCertificates")) return;

    showModal("إصدار شهادة", `

        <form id="eaCertificateForm" class="ea-form">

            <div class="ea-field full">

                <label>الطالب</label>

                <select name="uid" required>

                    <option value="">اختر الطالب</option>

                    ${Object.entries(ADMIN.data.users || {}).map(([uid, user]) => `
                        <option value="${escapeHTML(uid)}">
                            ${escapeHTML(getStudentName(user))}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div class="ea-field full">

                <label>الكورس</label>

                <select name="courseId" required>

                    <option value="">اختر الكورس</option>

                    ${Object.entries(ADMIN.data.courses || {}).map(([id, course]) => `
                        <option value="${escapeHTML(id)}">
                            ${escapeHTML(course.title)}
                        </option>
                    `).join("")}

                </select>

            </div>

            <button class="ea-btn">إصدار الشهادة</button>

        </form>

    `);

    $("#eaCertificateForm").onsubmit = async event => {
        event.preventDefault();

        const { uid, courseId } =
            Object.fromEntries(new FormData(event.target));

        const user = ADMIN.data.users[uid];
        const course = ADMIN.data.courses[courseId];

        if (!user || !course) {
            toast("الطالب أو الكورس غير موجود.", "error");
            return;
        }

        try {
            const number =
                "EICA-" + timestamp().toString(36).toUpperCase();

            await create(`${PATH.certificates}/${uid}`, {
                uid,
                studentName: getStudentName(user),
                courseId,
                courseTitle: course.title || "",
                certificateNumber: number,
                issuedBy: ADMIN.user.uid,
                issuedAt: timestamp(),
                status: "issued"
            });

            await logActivity("certificate_issued", {
                uid,
                courseId,
                number
            });

            toast("تم إصدار الشهادة.");

            closeModal();
            navigate("certificates");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function renderNotifications() {
    const notifications = flattenRecords(ADMIN.data.notifications);

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>مركز الإشعارات</h3>

            <button class="ea-btn" id="eaNewNotification">
                + إرسال إشعار
            </button>

        </div>

        <div class="ea-card">

            <h3>التواصل مع الطلاب</h3>

            <p class="ea-note">
                إرسال إشعار عام أو رسالة لطالب محدد.
            </p>

        </div>

        <div class="ea-section-title">
            <h3>الإشعارات الأخيرة</h3>
        </div>

        ${notifications.length ? `

            ${notifications
                .sort((a, b) =>
                    (b.createdAt || 0) - (a.createdAt || 0)
                )
                .slice(0, 30)
                .map(item => `

                    <div class="ea-card" style="margin-bottom:10px">

                        <strong>${escapeHTML(item.title || "إشعار")}</strong>

                        <p class="ea-note">
                            ${escapeHTML(item.message || "")}
                        </p>

                    </div>

                `).join("")}

        ` : `
            <div class="ea-empty">لا توجد إشعارات ظاهرة.</div>
        `}

    `;

    $("#eaNewNotification").onclick = createNotification;
}

function createNotification() {
    if (!requirePermission("sendNotifications")) return;

    showModal("إرسال إشعار", `

        <form id="eaNotificationForm" class="ea-form">

            <div class="ea-field full">

                <label>المستلم</label>

                <select name="target">

                    <option value="global">جميع الطلاب</option>

                    ${Object.entries(ADMIN.data.users || {}).map(([uid, user]) => `
                        <option value="${escapeHTML(uid)}">
                            ${escapeHTML(getStudentName(user))}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div class="ea-field full">
                <label>عنوان الإشعار</label>
                <input name="title" required maxlength="120">
            </div>

            <div class="ea-field full">
                <label>الرسالة</label>
                <textarea name="message" required maxlength="2000"></textarea>
            </div>

            <button class="ea-btn">إرسال الإشعار</button>

        </form>

    `);

    $("#eaNotificationForm").onsubmit = async event => {
        event.preventDefault();

        const { target, title, message } =
            Object.fromEntries(new FormData(event.target));

        try {
            const payload = {
                title,
                message,
                read: false,
                createdAt: timestamp(),
                createdBy: ADMIN.user.uid
            };

            if (target === "global") {
                await create(
                    `${PATH.notifications}/global`,
                    payload
                );
            } else {
                await create(
                    `${PATH.notifications}/${target}`,
                    payload
                );
            }

            await logActivity("notification_sent", {
                target,
                title
            });

            toast("تم إرسال الإشعار.");

            closeModal();
            navigate("notifications");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   BRANCH ADMINS
========================================== */

function renderAdmins() {
    const admins = Object.entries(ADMIN.data.admins || {});

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">

            <h3>إدارة مديري الفروع</h3>

            <button class="ea-btn" id="eaCreateBranchAdmin">
                + إضافة مدير فرع
            </button>

        </div>

        <div class="ea-card">

            <p class="ea-note">
                إنشاء مدير فرع يتم من خلال وظيفة خادم موثوقة.
                يجب أن يقوم الخادم بإنشاء الحساب ومنحه الصلاحيات بعد التحقق
                من صلاحية المدير الرئيسي.
            </p>

        </div>

        ${admins.length ? `

            <div class="ea-table-wrap" style="margin-top:15px">

                <table class="ea-table">

                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>البريد</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${admins.map(([uid, admin]) => `

                            <tr>
                                <td>${escapeHTML(admin.name || "مدير فرع")}</td>
                                <td>${escapeHTML(admin.email || "—")}</td>
                                <td>${escapeHTML(admin.status || "active")}</td>
                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        ` : `
            <div class="ea-empty">لا يوجد مديرو فروع ظاهرون.</div>
        `}

    `;

    $("#eaCreateBranchAdmin").onclick = createBranchAdmin;
}

function createBranchAdmin() {
    if (!requirePermission("manageAdmins")) return;

    const permissionOptions = [
        ["manageStudents", "إدارة الطلاب"],
        ["manageCourses", "إدارة الكورسات"],
        ["assignCourses", "إسناد الكورسات"],
        ["manageExams", "إدارة الامتحانات"],
        ["manageCertificates", "إدارة الشهادات"],
        ["sendNotifications", "إرسال الإشعارات"]
    ];

    showModal("إضافة مدير فرع", `

        <form id="eaBranchAdminForm" class="ea-form">

            <div class="ea-field full">
                <label>اسم المدير</label>
                <input name="name" required>
            </div>

            <div class="ea-field full">
                <label>البريد الإلكتروني</label>
                <input name="email" type="email" required>
            </div>

            <div class="ea-field full">

                <label>الصلاحيات</label>

                ${permissionOptions.map(([key, label]) => `

                    <label style="display:block;margin:8px 0">

                        <input
                            type="checkbox"
                            name="${key}"
                            style="width:auto">

                        ${label}

                    </label>

                `).join("")}

            </div>

            <button class="ea-btn">إنشاء مدير الفرع</button>

        </form>

    `);

    $("#eaBranchAdminForm").onsubmit = async event => {
        event.preventDefault();

        const form = new FormData(event.target);

        const permissions = {};

        permissionOptions.forEach(([key]) => {
            permissions[key] = form.has(key);
        });

        try {
            const callable = httpsCallable(
                ADMIN.functions,
                "adminCreateBranchAdmin"
            );

            await callable({
                name: form.get("name"),
                email: form.get("email"),
                permissions
            });

            toast("تم إرسال طلب إنشاء مدير الفرع.");

            await logActivity("branch_admin_creation_requested", {
                email: form.get("email")
            });

            closeModal();
            navigate("admins");

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   ACTIVITY
========================================== */

function renderActivity() {
    const activity = flattenRecords(ADMIN.data.activity)
        .sort((a, b) =>
            (b.timestamp || 0) - (a.timestamp || 0)
        )
        .slice(0, 100);

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">
            <h3>سجل نشاطات الإدارة</h3>
        </div>

        ${activity.length ? `

            <div class="ea-table-wrap">

                <table class="ea-table">

                    <thead>
                        <tr>
                            <th>العملية</th>
                            <th>المدير</th>
                            <th>التاريخ</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${activity.map(item => `

                            <tr>

                                <td>${escapeHTML(item.action || "—")}</td>

                                <td>${escapeHTML(item.email || item.uid || "—")}</td>

                                <td>
                                    ${item.timestamp
                                        ? new Date(item.timestamp).toLocaleString("ar-EG")
                                        : "—"}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        ` : `
            <div class="ea-empty">
                لا توجد نشاطات ظاهرة حالياً.
            </div>
        `}

    `;
}

/* ==========================================
   SETTINGS
========================================== */

function renderSettings() {
    const settings = ADMIN.data.settings || {};

    $("#eaContent").innerHTML = `

        <div class="ea-section-title">
            <h3>إعدادات الأكاديمية</h3>
        </div>

        <div class="ea-card">

            <form id="eaSettingsForm" class="ea-form">

                <div class="ea-field full">

                    <label>اسم الأكاديمية</label>

                    <input
                        name="academyName"
                        value="${escapeHTML(
                            settings.academyName ||
                            "Egypt International Computer Academy"
                        )}">

                </div>

                <div class="ea-field full">

                    <label>الشعار النصي</label>

                    <input
                        name="tagline"
                        value="${escapeHTML(
                            settings.tagline ||
                            "THE FUTURE OF TECHNOLOGY STARTS HERE"
                        )}">

                </div>

                <div class="ea-field full">

                    <label>رسالة الترحيب</label>

                    <textarea name="welcomeMessage">${escapeHTML(
                        settings.welcomeMessage || ""
                    )}</textarea>

                </div>

                <button class="ea-btn">حفظ الإعدادات</button>

            </form>

        </div>

    `;

    $("#eaSettingsForm").onsubmit = async event => {
        event.preventDefault();

        if (!requirePermission("manageSettings")) return;

        const data = Object.fromEntries(new FormData(event.target));

        try {
            await patch(PATH.settings, {
                ...data,
                updatedAt: timestamp(),
                updatedBy: ADMIN.user.uid
            });

            await logActivity("platform_settings_updated");

            toast("تم حفظ إعدادات الأكاديمية.");

            ADMIN.data.settings = {
                ...ADMIN.data.settings,
                ...data
            };

        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };
}

/* ==========================================
   MODALS
========================================== */

function showModal(title, html) {
    $("#eaModalTitle").textContent = title;
    $("#eaModalBody").innerHTML = html;
    $("#eaModal").classList.add("open");
}

function closeModal() {
    $("#eaModal")?.classList.remove("open");
    $("#eaModalBody").innerHTML = "";
}

/* ==========================================
   ADMIN AUTHORIZATION
========================================== */

async function authorizeAdmin(user) {
    if (!user) return false;

    try {
        const token = await getIdTokenResult(user, true);

        const claims = token.claims;

        const isSuperAdmin = claims.super_admin === true;
        const isBranchAdmin = claims.branch_admin === true;

        if (!isSuperAdmin && !isBranchAdmin) {
            return false;
        }

        ADMIN.user = user;

        ADMIN.role = isSuperAdmin
            ? "super_admin"
            : "branch_admin";

        if (isSuperAdmin) {
            ADMIN.permissions = {
                manageStudents: true,
                manageCourses: true,
                assignCourses: true,
                manageExams: true,
                manageCertificates: true,
                sendNotifications: true,
                manageAdmins: true,
                manageSettings: true
            };

            return true;
        }

        const adminRecord = await read(
            `${PATH.admins}/${user.uid}`
        );

        if (
            adminRecord.status !== "active" &&
            adminRecord.active !== true
        ) {
            return false;
        }

        ADMIN.permissions = adminRecord.permissions || {};

        return true;

    } catch (error) {
        console.error("Admin authorization:", error);
        return false;
    }
}

/* ==========================================
   INITIALIZATION
========================================== */

async function startAdminDashboard(user) {
    if (!user) return;

    if (ADMIN.loading) return;

    ADMIN.loading = true;

    try {
        const authorized = await authorizeAdmin(user);

        if (!authorized) {
            $("#eicaAdmin")?.remove();

            ADMIN.user = null;
            ADMIN.role = null;

            return;
        }

        injectStyles();
        mountDashboard();

        $("#eaAdminEmail").textContent = user.email || "";

        $("#eaRoleBadge").textContent =
            ADMIN.role === "super_admin"
                ? "SUPER ADMIN"
                : "BRANCH ADMIN";

        await loadDashboardData();

        navigate("overview");

        window.EICA_ADMIN_READY = true;

    } catch (error) {
        console.error(error);

        toast(errorMessage(error), "error");

    } finally {
        ADMIN.loading = false;
    }
}

/* ==========================================
   AUTH LISTENER
========================================== */

onAuthStateChanged(auth, async user => {
    if (!user) {
        $("#eicaAdmin")?.remove();

        ADMIN.user = null;
        ADMIN.role = null;
        ADMIN.permissions = {};

        window.EICA_ADMIN_READY = false;

        return;
    }

    await startAdminDashboard(user);
});

/* ==========================================
   PUBLIC ADMIN API
========================================== */

window.EICA_OPEN_ADMIN_DASHBOARD = async () => {
    if (!auth.currentUser) {
        toast("سجل الدخول أولاً.", "error");
        return;
    }

    await startAdminDashboard(auth.currentUser);
};

window.EICA_ADMIN = {
    navigate,
    refresh: loadDashboardData,
    can,
    openEnrollmentForm,
    openStudentForm,
    openCourseForm,
    get data() {
        return ADMIN.data;
    },
    get role() {
        return ADMIN.role;
    }
};

console.log("EICA Admin Dashboard Loaded.");
