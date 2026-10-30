import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    set,
    update,
    push,
    remove,
    onValue,
    serverTimestamp
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
   EICA ADMIN SYSTEM
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
    listeners: [],
    functions: getFunctions(undefined, "us-central1")
};

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

const notify = (message, type = "success") => {
    let box = $("#eicaToast");

    if (!box) {
        box = document.createElement("div");
        box.id = "eicaToast";
        document.body.appendChild(box);
    }

    box.className = `eica-toast ${type}`;
    box.textContent = message;
    box.classList.add("show");

    clearTimeout(box.timer);
    box.timer = setTimeout(() => box.classList.remove("show"), 3500);
};

const read = async path => {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : {};
};

const write = async (path, data) =>
    set(ref(db, path), data);

const patch = async (path, data) =>
    update(ref(db, path), data);

const create = async (path, data) => {
    const newRef = push(ref(db, path));
    await set(newRef, {
        ...data,
        createdAt: Date.now()
    });
    return newRef.key;
};

const logActivity = async (action, details = {}) => {
    if (!ADMIN.user) return;

    try {
        await create("platform/activityLogs", {
            uid: ADMIN.user.uid,
            email: ADMIN.user.email || "",
            role: ADMIN.role,
            action,
            details,
            timestamp: Date.now()
        });
    } catch (error) {
        console.warn("Activity log:", error);
    }
};

/* ==========================================
   PERMISSIONS
========================================== */

function can(permission) {
    if (ADMIN.role === "super_admin") return true;
    return ADMIN.permissions?.[permission] === true;
}

function requirePermission(permission) {
    if (can(permission)) return true;

    notify("ليس لديك صلاحية لتنفيذ هذا الإجراء", "error");
    return false;
}

/* ==========================================
   DASHBOARD STYLE
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
        background:var(--ea-bg);
        color:var(--ea-text);
        font-family:'Cairo',sans-serif;
        display:flex;
        direction:rtl;
        overflow:hidden;
    }

    #eicaAdmin * { box-sizing:border-box; }

    #eicaAdmin button,
    #eicaAdmin input,
    #eicaAdmin select,
    #eicaAdmin textarea {
        font:inherit;
    }

    .ea-sidebar {
        width:270px;
        min-width:270px;
        height:100%;
        background:#0b1728;
        border-left:1px solid var(--ea-line);
        padding:22px 15px;
        overflow-y:auto;
        transition:.3s;
    }

    .ea-brand {
        display:flex;
        align-items:center;
        gap:12px;
        padding:8px 9px 25px;
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

    .ea-brand strong { display:block;font-size:18px; }
    .ea-brand small { color:var(--ea-muted);font-size:10px;letter-spacing:2px; }

    .ea-nav-label {
        color:#647d9c;
        font-size:11px;
        font-weight:800;
        padding:12px 12px 7px;
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
        padding:0 28px;
        border-bottom:1px solid var(--ea-line);
        background:#0a1728;
    }

    .ea-topbar h2 { font-size:19px;margin:0; }
    .ea-topbar p { color:var(--ea-muted);font-size:11px;margin:3px 0 0; }

    .ea-top-actions { display:flex;align-items:center;gap:12px; }

    .ea-admin-badge {
        background:#1a3350;
        padding:8px 13px;
        border-radius:10px;
        font-size:11px;
        color:#8edfff;
    }

    .ea-content {
        padding:25px;
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

    .ea-stat small { color:var(--ea-muted);font-size:12px; }
    .ea-stat h3 { font-size:27px;margin:12px 0 0; }

    .ea-section-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin:22px 0 15px;
        flex-wrap:wrap;
    }

    .ea-section-title h3 { margin:0;font-size:17px; }

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

    .ea-btn.secondary { background:#203751; }
    .ea-btn.danger { background:#a92b45; }
    .ea-btn.success { background:#087e66; }

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

    .ea-table th { color:#8ca6c4;background:#14253a; }
    .ea-table td { color:#d9e6f7; }
    .ea-table tr:last-child td { border-bottom:0; }

    .ea-status {
        display:inline-block;
        border-radius:30px;
        padding:5px 10px;
        font-size:10px;
        background:#ffffff12;
    }

    .ea-status.active { color:#38e6b1;background:#20d6a018; }
    .ea-status.pending { color:#ffd47a;background:#f5bd5518; }
    .ea-status.blocked { color:#ff8395;background:#ff557018; }

    .ea-form {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:13px;
    }

    .ea-field { display:flex;flex-direction:column;gap:7px; }
    .ea-field.full { grid-column:1/-1; }

    .ea-field label { color:#9eb2ca;font-size:12px; }

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

    .ea-field textarea { min-height:100px;resize:vertical; }

    .ea-modal {
        position:fixed;
        inset:0;
        z-index:20;
        display:none;
        align-items:center;
        justify-content:center;
        padding:15px;
        background:#000a;
        backdrop-filter:blur(8px);
    }

    .ea-modal.open { display:flex; }

    .ea-modal-box {
        width:min(620px,100%);
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

    .ea-modal-head h3 { margin:0; }

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
        z-index:1000001;
        background:#142c43;
        border:1px solid #ffffff20;
        padding:13px 20px;
        border-radius:12px;
        opacity:0;
        transform:translateY(15px);
        pointer-events:none;
        transition:.3s;
        font-size:13px;
    }

    .ea-toast.show { opacity:1;transform:translateY(0); }
    .ea-toast.error { border-color:#ff5570; }

    .ea-empty {
        text-align:center;
        color:var(--ea-muted);
        padding:35px 15px;
    }

    .ea-mobile-menu { display:none; }

    @media(max-width:1050px) {
        .ea-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .ea-sidebar { width:235px;min-width:235px; }
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

        .ea-sidebar.open { right:0; }
        .ea-mobile-menu { display:block; }
        .ea-topbar { padding:0 13px; }
        .ea-content { padding:14px; }
        .ea-grid { gap:9px; }
        .ea-card { padding:13px; }
        .ea-stat h3 { font-size:21px; }
        .ea-form { grid-template-columns:1fr; }
        .ea-field.full { grid-column:auto; }
        .ea-admin-badge { display:none; }
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
        <div class="ea-nav active" data-page="overview"><span>◈</span>نظرة عامة</div>
        <div class="ea-nav" data-page="students"><span>♙</span>إدارة الطلاب</div>

        <div class="ea-nav-label">المحتوى التعليمي</div>
        <div class="ea-nav" data-page="courses"><span>▣</span>الكورسات</div>
        <div class="ea-nav" data-page="sections"><span>▤</span>الأقسام والدروس</div>
        <div class="ea-nav" data-page="exams"><span>✎</span>الامتحانات</div>
        <div class="ea-nav" data-page="results"><span>◉</span>النتائج والتقييمات</div>
        <div class="ea-nav" data-page="certificates"><span>♜</span>الشهادات</div>

        <div class="ea-nav-label">الإدارة والتواصل</div>
        <div class="ea-nav" data-page="notifications"><span>♧</span>الإشعارات</div>
        <div class="ea-nav" data-page="admins"><span>♙</span>مديرو الفروع</div>
        <div class="ea-nav" data-page="activity"><span>⌁</span>سجل النشاطات</div>
        <div class="ea-nav" data-page="settings"><span>⚙</span>إعدادات المنصة</div>

        <div class="ea-nav-label">الحساب</div>
        <div class="ea-nav" id="eaLogout"><span>⇥</span>تسجيل الخروج</div>
    </aside>

    <main class="ea-main">
        <header class="ea-topbar">
            <div style="display:flex;align-items:center;gap:13px">
                <button class="ea-btn secondary ea-mobile-menu" id="eaMenu">☰</button>
                <div>
                    <h2 id="eaPageTitle">نظرة عامة</h2>
                    <p>Egypt International Computer Academy</p>
                </div>
            </div>

            <div class="ea-top-actions">
                <span class="ea-admin-badge" id="eaRoleBadge">SUPER ADMIN</span>
                <span id="eaAdminEmail" style="font-size:11px;color:#9eb2ca"></span>
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

    <div class="ea-toast" id="eaToast"></div>
    `;

    document.body.appendChild(root);

    root.querySelectorAll(".ea-nav[data-page]").forEach(item => {
        item.addEventListener("click", () => {
            navigate(item.dataset.page);
            $("#eaSidebar").classList.remove("open");
        });
    });

    $("#eaMenu").onclick = () => $("#eaSidebar").classList.toggle("open");
    $("#eaModalClose").onclick = closeModal;
    $("#eaModal").onclick = event => {
        if (event.target.id === "eaModal") closeModal();
    };

    $("#eaLogout").onclick = async () => {
        if (!confirm("هل تريد تسجيل الخروج من لوحة الإدارة؟")) return;
        await auth.signOut();
        location.reload();
    };
}

/* ==========================================
   DATA LOADING
========================================== */

async function loadDashboardData() {
    const paths = {
        users: "platform/users",
        courses: "platform/courses",
        enrollments: "platform/enrollments",
        exams: "platform/exams",
        results: "platform/results",
        certificates: "platform/certificates",
        notifications: "platform/notifications",
        admins: "platform/admins",
        activity: "platform/activityLogs",
        settings: "platform/settings"
    };

    for (const [key, path] of Object.entries(paths)) {
        try {
            ADMIN.data[key] = await read(path);
        } catch (error) {
            console.warn("Could not read", path, error);
            ADMIN.data[key] = {};
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

async function navigate(page) {
    ADMIN.page = page;

    document.querySelectorAll(".ea-nav[data-page]").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });

    $("#eaPageTitle").textContent = pageTitles[page] || "EICA ADMIN";

    const content = $("#eaContent");
    content.innerHTML = `<div class="ea-empty">جاري تحميل البيانات...</div>`;

    await loadDashboardData();

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

    (pages[page] || renderOverview)();
}

/* ==========================================
   OVERVIEW
========================================== */

function renderOverview() {
    const users = Object.values(ADMIN.data.users);
    const courses = Object.values(ADMIN.data.courses);
    const exams = Object.values(ADMIN.data.exams);
    const certificates = Object.values(ADMIN.data.certificates);

    const active = users.filter(x => x.status === "active").length;
    const pending = users.filter(x => x.status === "pending").length;
    const blocked = users.filter(x => x.status === "blocked").length;

    $("#eaContent").innerHTML = `
        <div class="ea-grid">
            ${statCard("إجمالي الطلاب", users.length, "♙")}
            ${statCard("الطلاب النشطون", active, "✓")}
            ${statCard("طلبات الانتظار", pending, "◷")}
            ${statCard("الطلاب المحظورون", blocked, "⊘")}
            ${statCard("الكورسات", courses.length, "▣")}
            ${statCard("الامتحانات", exams.length, "✎")}
            ${statCard("الشهادات", certificates.length, "♜")}
            ${statCard("مديرو الفروع", Object.keys(ADMIN.data.admins).length, "♙")}
        </div>

        <div class="ea-card">
            <div class="ea-section-title">
                <h3>مركز التحكم بالأكاديمية</h3>
                <span class="ea-status active">SYSTEM ONLINE</span>
            </div>
            <p style="color:#91a5bd;font-size:13px;line-height:2">
                مرحباً بك في لوحة إدارة EICA. من هنا يمكنك متابعة الطلاب،
                وإدارة المحتوى التعليمي، وإصدار الشهادات، وإدارة صلاحيات الفروع.
            </p>
        </div>

        <div class="ea-section-title"><h3>آخر الطلاب المسجلين</h3></div>
        ${studentTable(users.slice(0, 6))}
    `;
}

function statCard(title, value, icon) {
    return `
    <div class="ea-card ea-stat">
        <div>
            <small>${title}</small>
            <h3>${value}</h3>
        </div>
        <div class="ea-stat-icon">${icon}</div>
    </div>`;
}

/* ==========================================
   STUDENTS
========================================== */

function studentTable(users) {
    if (!users.length) return `<div class="ea-empty">لا توجد بيانات طلاب حتى الآن.</div>`;

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
                const status = user.status || "pending";
                return `
                <tr>
                    <td>${escapeHTML(user.name || "بدون اسم")}</td>
                    <td>${escapeHTML(user.email || "—")}</td>
                    <td><span class="ea-status ${escapeHTML(status)}">${escapeHTML(status)}</span></td>
                    <td>
                        <button class="ea-btn secondary" data-student="${escapeHTML(user.uid || "")}">
                            إدارة
                        </button>
                    </td>
                </tr>`;
            }).join("")}
            </tbody>
        </table>
    </div>`;
}

function renderStudents() {
    const users = Object.entries(ADMIN.data.users).map(([uid, user]) => ({
        ...user,
        uid
    }));

    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>قاعدة بيانات الطلاب</h3>
            <button class="ea-btn" id="eaRefreshStudents">تحديث البيانات ↻</button>
        </div>
        <div class="ea-card">
            <p style="color:#91a5bd;font-size:12px">
                يتم عرض حسابات المنصة المسجلة في قاعدة بيانات EICA.
                إنشاء حساب دخول جديد يحتاج إلى وظيفة إدارية آمنة على الخادم.
            </p>
        </div>
        <div class="ea-section-title"><h3>قائمة الطلاب (${users.length})</h3></div>
        ${studentTable(users)}
    `;

    $("#eaRefreshStudents").onclick = () => navigate("students");

    document.querySelectorAll("[data-student]").forEach(button => {
        button.onclick = () => openStudent(button.dataset.student);
    });
}

function openStudent(uid) {
    const student = ADMIN.data.users[uid];
    if (!student) return;

    showModal("إدارة حساب الطالب", `
        <div class="ea-card">
            <h3>${escapeHTML(student.name || "طالب")}</h3>
            <p style="color:#91a5bd">${escapeHTML(student.email || "")}</p>
            <p>الحالة: ${escapeHTML(student.status || "pending")}</p>
            <p>UID: ${escapeHTML(uid)}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px">
            <button class="ea-btn success" id="eaActivateStudent">تفعيل الحساب</button>
            <button class="ea-btn danger" id="eaBlockStudent">حظر الحساب</button>
            <button class="ea-btn secondary" id="eaPendingStudent">إرجاع للانتظار</button>
        </div>
    `);

    $("#eaActivateStudent").onclick = () => changeStudentStatus(uid, "active");
    $("#eaBlockStudent").onclick = () => changeStudentStatus(uid, "blocked");
    $("#eaPendingStudent").onclick = () => changeStudentStatus(uid, "pending");
}

async function changeStudentStatus(uid, status) {
    if (!requirePermission("manageStudents")) return;

    try {
        await update(ref(db, `platform/users/${uid}`), {
            status,
            updatedAt: Date.now()
        });

        await logActivity("student_status_changed", { uid, status });
        notify("تم تحديث حالة الطالب");
        closeModal();
        navigate("students");
    } catch (error) {
        console.error(error);
        notify("تعذر تعديل الحساب. راجع صلاحيات قاعدة البيانات.", "error");
    }
}

/* ==========================================
   COURSES
========================================== */

function renderCourses() {
    const courses = Object.entries(ADMIN.data.courses);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>إدارة الكورسات التعليمية</h3>
            <button class="ea-btn" id="eaAddCourse">+ إضافة كورس</button>
        </div>

        <div class="ea-grid">
            ${courses.map(([id, course]) => `
                <div class="ea-card">
                    <div style="font-size:25px">▣</div>
                    <h3>${escapeHTML(course.title || "كورس بدون عنوان")}</h3>
                    <p style="color:#91a5bd;font-size:12px;line-height:1.8">
                        ${escapeHTML(course.description || "")}
                    </p>
                    <span class="ea-status ${course.enabled ? "active" : "blocked"}">
                        ${course.enabled ? "مفعل" : "متوقف"}
                    </span>
                    <div style="display:flex;gap:8px;margin-top:15px">
                        <button class="ea-btn secondary" data-edit-course="${escapeHTML(id)}">تعديل</button>
                        <button class="ea-btn danger" data-disable-course="${escapeHTML(id)}">إيقاف</button>
                    </div>
                </div>
            `).join("")}
        </div>
        ${courses.length ? "" : `<div class="ea-empty">لم تتم إضافة كورسات بعد.</div>`}
    `;

    $("#eaAddCourse").onclick = () => openCourseForm();

    document.querySelectorAll("[data-edit-course]").forEach(button => {
        button.onclick = () => openCourseForm(button.dataset.editCourse);
    });

    document.querySelectorAll("[data-disable-course]").forEach(button => {
        button.onclick = () => disableCourse(button.dataset.disableCourse);
    });
}

function openCourseForm(id = null) {
    if (!requirePermission("manageCourses")) return;

    const old = id ? ADMIN.data.courses[id] : {};

    showModal(id ? "تعديل الكورس" : "إضافة كورس جديد", `
        <form class="ea-form" id="eaCourseForm">
            <div class="ea-field full">
                <label>اسم الكورس</label>
                <input name="title" required value="${escapeHTML(old.title || "")}">
            </div>
            <div class="ea-field full">
                <label>وصف الكورس</label>
                <textarea name="description">${escapeHTML(old.description || "")}</textarea>
            </div>
            <div class="ea-field">
                <label>التصنيف</label>
                <input name="category" value="${escapeHTML(old.category || "")}">
            </div>
            <div class="ea-field">
                <label>رابط صورة الغلاف</label>
                <input name="coverURL" value="${escapeHTML(old.coverURL || "")}">
            </div>
            <div class="ea-field full">
                <button class="ea-btn">حفظ الكورس</button>
            </div>
        </form>
    `);

    $("#eaCourseForm").onsubmit = async event => {
        event.preventDefault();

        const form = new FormData(event.target);
        const data = Object.fromEntries(form.entries());

        try {
            const courseId = id || push(ref(db, "platform/courses")).key;

            await update(ref(db, `platform/courses/${courseId}`), {
                ...data,
                enabled: old.enabled ?? true,
                published: false,
                updatedAt: Date.now()
            });

            await logActivity("course_saved", { courseId });
            notify("تم حفظ الكورس بنجاح");
            closeModal();
            navigate("courses");
        } catch (error) {
            console.error(error);
            notify("تعذر حفظ الكورس", "error");
        }
    };
}

async function disableCourse(id) {
    if (!requirePermission("manageCourses")) return;
    if (!confirm("سيتم إيقاف الكورس دون حذف بياناته. هل تريد المتابعة؟")) return;

    try {
        await update(ref(db, `platform/courses/${id}`), {
            enabled: false,
            updatedAt: Date.now()
        });

        await logActivity("course_disabled", { id });
        notify("تم إيقاف الكورس");
        navigate("courses");
    } catch (error) {
        notify("تعذر إيقاف الكورس", "error");
    }
}

/* ==========================================
   SECTIONS AND LESSONS
========================================== */

function renderSections() {
    const courses = Object.entries(ADMIN.data.courses);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title"><h3>الأقسام والدروس</h3></div>
        <div class="ea-card">
            <div class="ea-field">
                <label>اختر الكورس</label>
                <select id="eaSectionCourse">
                    <option value="">اختر كورساً</option>
                    ${courses.map(([id, c]) => `
                        <option value="${escapeHTML(id)}">${escapeHTML(c.title)}</option>
                    `).join("")}
                </select>
            </div>
            <div id="eaSectionArea" style="margin-top:20px"></div>
        </div>
    `;

    $("#eaSectionCourse").onchange = event => {
        const courseId = event.target.value;
        const area = $("#eaSectionArea");

        if (!courseId) {
            area.innerHTML = "";
            return;
        }

        const sections = ADMIN.data.sections?.[courseId] || {};

        area.innerHTML = `
            <button class="ea-btn" id="eaAddSection">+ إضافة قسم</button>
            <div style="margin-top:15px">
                ${Object.entries(sections).map(([id, section]) => `
                    <div class="ea-card" style="margin-bottom:10px">
                        <strong>${escapeHTML(section.title || "قسم")}</strong>
                        <p style="color:#91a5bd;font-size:12px">${escapeHTML(section.description || "")}</p>
                        <button class="ea-btn secondary" data-add-lesson="${escapeHTML(id)}">إضافة درس</button>
                    </div>
                `).join("") || `<div class="ea-empty">لا توجد أقسام لهذا الكورس.</div>`}
            </div>
        `;

        $("#eaAddSection").onclick = () => addSection(courseId);

        area.querySelectorAll("[data-add-lesson]").forEach(button => {
            button.onclick = () => addLesson(courseId, button.dataset.addLesson);
        });
    };
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
            <button class="ea-btn">حفظ</button>
        </form>
    `);

    $("#eaSectionForm").onsubmit = async event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target));

        try {
            await create(`platform/sections/${courseId}`, data);
            notify("تمت إضافة القسم");
            closeModal();
            navigate("sections");
        } catch {
            notify("تعذر إضافة القسم", "error");
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
                <label>رابط الفيديو المضمن</label>
                <input name="videoURL" placeholder="رابط YouTube embed">
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
            await create(`platform/lessons/${courseId}/${sectionId}`, data);
            await logActivity("lesson_created", { courseId, sectionId });
            notify("تمت إضافة الدرس");
            closeModal();
        } catch {
            notify("تعذر حفظ الدرس", "error");
        }
    };
}

/* ==========================================
   ENROLLMENTS
========================================== */

function openEnrollmentForm() {
    if (!requirePermission("assignCourses")) return;

    const users = Object.entries(ADMIN.data.users);
    const courses = Object.entries(ADMIN.data.courses);

    showModal("إسناد كورس لطالب", `
        <form id="eaEnrollmentForm" class="ea-form">
            <div class="ea-field full">
                <label>الطالب</label>
                <select name="uid" required>
                    <option value="">اختر الطالب</option>
                    ${users.map(([uid, user]) => `
                        <option value="${escapeHTML(uid)}">${escapeHTML(user.name || user.email || uid)}</option>
                    `).join("")}
                </select>
            </div>
            <div class="ea-field full">
                <label>الكورس</label>
                <select name="courseId" required>
                    <option value="">اختر الكورس</option>
                    ${courses.map(([id, course]) => `
                        <option value="${escapeHTML(id)}">${escapeHTML(course.title)}</option>
                    `).join("")}
                </select>
            </div>
            <button class="ea-btn">إسناد الكورس</button>
        </form>
    `);

    $("#eaEnrollmentForm").onsubmit = async event => {
        event.preventDefault();
        const { uid, courseId } = Object.fromEntries(new FormData(event.target));

        try {
            await set(ref(db, `platform/enrollments/${uid}/${courseId}`), {
                courseId,
                assignedBy: ADMIN.user.uid,
                status: "active",
                assignedAt: Date.now()
            });

            await logActivity("course_assigned", { uid, courseId });
            notify("تم إسناد الكورس للطالب");
            closeModal();
        } catch {
            notify("تعذر إسناد الكورس", "error");
        }
    };
}

/* ==========================================
   EXAMS
========================================== */

function renderExams() {
    const exams = Object.entries(ADMIN.data.exams);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>إدارة الامتحانات</h3>
            <button class="ea-btn" id="eaAddExam">+ إنشاء امتحان</button>
        </div>

        ${exams.length ? `
        <div class="ea-table-wrap">
            <table class="ea-table">
                <thead><tr><th>الامتحان</th><th>الكورس</th><th>الحالة</th></tr></thead>
                <tbody>
                ${exams.map(([id, exam]) => `
                    <tr>
                        <td>${escapeHTML(exam.title || "امتحان")}</td>
                        <td>${escapeHTML(ADMIN.data.courses[exam.courseId]?.title || "—")}</td>
                        <td>${escapeHTML(exam.status || "draft")}</td>
                    </tr>
                `).join("")}
                </tbody>
            </table>
        </div>` : `<div class="ea-empty">لا توجد امتحانات.</div>`}
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
                    ${Object.entries(ADMIN.data.courses).map(([id, c]) => `
                        <option value="${escapeHTML(id)}">${escapeHTML(c.title)}</option>
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
            await create("platform/exams", {
                ...data,
                duration: Number(data.duration),
                totalMarks: Number(data.totalMarks),
                status: "draft",
                published: false,
                questions: {}
            });

            await logActivity("exam_created", { title: data.title });
            notify("تم إنشاء الامتحان كمسودة");
            closeModal();
            navigate("exams");
        } catch {
            notify("تعذر إنشاء الامتحان", "error");
        }
    };
}

/* ==========================================
   RESULTS
========================================== */

function renderResults() {
    const results = Object.values(ADMIN.data.results);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title"><h3>نتائج الامتحانات</h3></div>
        <div class="ea-card">
            <p style="color:#91a5bd;font-size:12px">
                تعرض هذه الصفحة النتائج التي تم حفظها في المسار
                platform/results. تصحيح الامتحانات النهائي يجب أن يتم
                على الخادم لمنع التلاعب بالدرجات.
            </p>
        </div>
        ${results.length ? `
            <div class="ea-table-wrap" style="margin-top:15px">
                <table class="ea-table">
                    <thead><tr><th>الطالب</th><th>الامتحان</th><th>الدرجة</th></tr></thead>
                    <tbody>
                    ${results.map(item => `
                        <tr>
                            <td>${escapeHTML(item.studentName || item.uid || "—")}</td>
                            <td>${escapeHTML(item.examTitle || item.examId || "—")}</td>
                            <td>${escapeHTML(item.score ?? "—")}</td>
                        </tr>
                    `).join("")}
                    </tbody>
                </table>
            </div>
        ` : `<div class="ea-empty">لا توجد نتائج محفوظة بعد.</div>`}
    `;
}

/* ==========================================
   CERTIFICATES
========================================== */

function renderCertificates() {
    const certificates = Object.values(ADMIN.data.certificates);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>الشهادات</h3>
            <button class="ea-btn" id="eaIssueCertificate">+ إصدار شهادة</button>
        </div>
        <div class="ea-card">
            <p style="color:#91a5bd;font-size:12px">
                يتم تسجيل الشهادات داخل قاعدة البيانات. يمكن إضافة قالب PDF
                والتحقق من الشهادة عبر رقمها في مرحلة ربط خدمة الشهادات.
            </p>
        </div>
        <div class="ea-section-title"><h3>الشهادات المسجلة (${certificates.length})</h3></div>
        ${certificates.length ? `
        <div class="ea-table-wrap">
            <table class="ea-table">
                <thead><tr><th>الطالب</th><th>الكورس</th><th>رقم الشهادة</th></tr></thead>
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
        </div>` : `<div class="ea-empty">لا توجد شهادات بعد.</div>`}
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
                    ${Object.entries(ADMIN.data.users).map(([uid, u]) => `
                        <option value="${escapeHTML(uid)}">${escapeHTML(u.name || u.email || uid)}</option>
                    `).join("")}
                </select>
            </div>
            <div class="ea-field full">
                <label>الكورس</label>
                <select name="courseId" required>
                    <option value="">اختر الكورس</option>
                    ${Object.entries(ADMIN.data.courses).map(([id, c]) => `
                        <option value="${escapeHTML(id)}">${escapeHTML(c.title)}</option>
                    `).join("")}
                </select>
            </div>
            <button class="ea-btn">إصدار</button>
        </form>
    `);

    $("#eaCertificateForm").onsubmit = async event => {
        event.preventDefault();

        const { uid, courseId } = Object.fromEntries(new FormData(event.target));
        const user = ADMIN.data.users[uid];
        const course = ADMIN.data.courses[courseId];

        try {
            const number = "EICA-" + Date.now().toString(36).toUpperCase();

            await create(`platform/certificates/${uid}`, {
                uid,
                studentName: user?.name || "",
                courseId,
                courseTitle: course?.title || "",
                certificateNumber: number,
                issuedBy: ADMIN.user.uid,
                issuedAt: Date.now(),
                status: "issued"
            });

            await logActivity("certificate_issued", { uid, courseId, number });
            notify("تم إصدار الشهادة");
            closeModal();
            navigate("certificates");
        } catch {
            notify("تعذر إصدار الشهادة", "error");
        }
    };
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function renderNotifications() {
    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>مركز الإشعارات</h3>
            <button class="ea-btn" id="eaNewNotification">+ إرسال إشعار</button>
        </div>
        <div class="ea-card">
            <h3>التواصل مع الطلاب</h3>
            <p style="color:#91a5bd;font-size:12px;line-height:2">
                يمكنك إرسال إشعار لطالب معين أو إشعار عام لجميع الطلاب.
            </p>
        </div>
    `;

    $("#eaNewNotification").onclick = createNotification;
}

function createNotification() {
    if (!requirePermission("sendNotifications")) return;

    showModal("إرسال إشعار", `
        <form id="eaNotificationForm" class="ea-form">
            <div class="ea-field full">
                <label>المستلم</label>
                <select name="target" id="eaNoticeTarget">
                    <option value="global">جميع الطلاب</option>
                    ${Object.entries(ADMIN.data.users).map(([uid, u]) => `
                        <option value="${escapeHTML(uid)}">${escapeHTML(u.name || u.email || uid)}</option>
                    `).join("")}
                </select>
            </div>
            <div class="ea-field full">
                <label>عنوان الإشعار</label>
                <input name="title" required>
            </div>
            <div class="ea-field full">
                <label>الرسالة</label>
                <textarea name="message" required></textarea>
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
                createdAt: Date.now(),
                createdBy: ADMIN.user.uid
            };

            if (target === "global") {
                await create("platform/notifications/global", payload);
            } else {
                await create(`platform/notifications/${target}`, payload);
            }

            await logActivity("notification_sent", { target, title });
            notify("تم إرسال الإشعار");
            closeModal();
        } catch {
            notify("تعذر إرسال الإشعار", "error");
        }
    };
}

/* ==========================================
   BRANCH ADMINS
========================================== */

function renderAdmins() {
    const admins = Object.entries(ADMIN.data.admins);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title">
            <h3>إدارة مديري الفروع</h3>
            <button class="ea-btn" id="eaCreateBranchAdmin">+ إضافة مدير فرع</button>
        </div>

        <div class="ea-card">
            <p style="color:#91a5bd;font-size:12px;line-height:2">
                إنشاء مدير فرع وتعيين صلاحياته يتم عبر خادم موثوق،
                ولا يمكن منح صلاحيات الإدارة من المتصفح وحده.
            </p>
        </div>

        <div class="ea-section-title"><h3>مديرو الفروع</h3></div>
        ${admins.length ? `
        <div class="ea-table-wrap">
            <table class="ea-table">
                <thead><tr><th>الاسم</th><th>البريد</th><th>الحالة</th></tr></thead>
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
        </div>` : `<div class="ea-empty">لا يوجد مديرو فروع مسجلون.</div>`}
    `;

    $("#eaCreateBranchAdmin").onclick = createBranchAdmin;
}

function createBranchAdmin() {
    if (!requirePermission("manageAdmins")) return;

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
                ${[
                    ["manageStudents", "إدارة الطلاب"],
                    ["manageCourses", "إدارة الكورسات"],
                    ["assignCourses", "إسناد الكورسات"],
                    ["manageExams", "إدارة الامتحانات"],
                    ["manageCertificates", "إدارة الشهادات"],
                    ["sendNotifications", "إرسال الإشعارات"]
                ].map(([key, label]) => `
                    <label style="display:block;margin:8px 0">
                        <input type="checkbox" name="${key}"> ${label}
                    </label>
                `).join("")}
            </div>
            <button class="ea-btn">إرسال طلب إنشاء المدير</button>
        </form>
    `);

    $("#eaBranchAdminForm").onsubmit = async event => {
        event.preventDefault();

        const form = new FormData(event.target);
        const permissions = {};

        [
            "manageStudents",
            "manageCourses",
            "assignCourses",
            "manageExams",
            "manageCertificates",
            "sendNotifications"
        ].forEach(key => {
            permissions[key] = form.has(key);
        });

        try {
            const callable = httpsCallable(ADMIN.functions, "adminCreateBranchAdmin");

            await callable({
                name: form.get("name"),
                email: form.get("email"),
                permissions
            });

            notify("تم إرسال طلب إنشاء مدير الفرع");
            closeModal();
            navigate("admins");
        } catch (error) {
            console.error(error);
            notify("وظيفة الخادم adminCreateBranchAdmin غير منشورة أو غير متاحة.", "error");
        }
    };
}

/* ==========================================
   ACTIVITY
========================================== */

function renderActivity() {
    const activity = Object.values(ADMIN.data.activity)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 100);

    $("#eaContent").innerHTML = `
        <div class="ea-section-title"><h3>سجل نشاطات الإدارة</h3></div>
        ${activity.length ? `
        <div class="ea-table-wrap">
            <table class="ea-table">
                <thead><tr><th>العملية</th><th>المدير</th><th>التاريخ</th></tr></thead>
                <tbody>
                ${activity.map(item => `
                    <tr>
                        <td>${escapeHTML(item.action || "—")}</td>
                        <td>${escapeHTML(item.email || item.uid || "—")}</td>
                        <td>${item.timestamp ? new Date(item.timestamp).toLocaleString("ar-EG") : "—"}</td>
                    </tr>
                `).join("")}
                </tbody>
            </table>
        </div>` : `<div class="ea-empty">لا توجد نشاطات مسجلة.</div>`}
    `;
}

/* ==========================================
   SETTINGS
========================================== */

function renderSettings() {
    const settings = ADMIN.data.settings || {};

    $("#eaContent").innerHTML = `
        <div class="ea-section-title"><h3>إعدادات الأكاديمية</h3></div>
        <div class="ea-card">
            <form id="eaSettingsForm" class="ea-form">
                <div class="ea-field full">
                    <label>اسم الأكاديمية</label>
                    <input name="academyName" value="${escapeHTML(settings.academyName || "Egypt International Computer Academy")}">
                </div>
                <div class="ea-field full">
                    <label>الشعار النصي</label>
                    <input name="tagline" value="${escapeHTML(settings.tagline || "THE FUTURE OF TECHNOLOGY STARTS HERE")}">
                </div>
                <div class="ea-field full">
                    <label>رسالة الترحيب</label>
                    <textarea name="welcomeMessage">${escapeHTML(settings.welcomeMessage || "")}</textarea>
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
            await update(ref(db, "platform/settings"), {
                ...data,
                updatedAt: Date.now(),
                updatedBy: ADMIN.user.uid
            });

            await logActivity("platform_settings_updated");
            notify("تم حفظ إعدادات الأكاديمية");
        } catch {
            notify("تعذر حفظ الإعدادات", "error");
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

        if (!isSuperAdmin && !isBranchAdmin) return false;

        ADMIN.user = user;
        ADMIN.role = isSuperAdmin ? "super_admin" : "branch_admin";

        if (isBranchAdmin) {
            const adminRecord = await read(`platform/admins/${user.uid}`);

            if (adminRecord.status !== "active") return false;

            ADMIN.permissions = adminRecord.permissions || {};
        } else {
            ADMIN.permissions = { all: true };
        }

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
    const authorized = await authorizeAdmin(user);

    if (!authorized) {
        document.querySelector("#eicaAdmin")?.remove();
        return;
    }

    injectStyles();
    mountDashboard();

    $("#eaAdminEmail").textContent = user.email || "";
    $("#eaRoleBadge").textContent =
        ADMIN.role === "super_admin" ? "SUPER ADMIN" : "BRANCH ADMIN";

    await loadDashboardData();
    navigate("overview");

    window.EICA_ADMIN_READY = true;
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        document.querySelector("#eicaAdmin")?.remove();
        ADMIN.user = null;
        ADMIN.role = null;
        return;
    }

    await startAdminDashboard(user);
});

/* ==========================================
   PUBLIC ADMIN API
========================================== */

window.EICA_OPEN_ADMIN_DASHBOARD = async () => {
    if (!auth.currentUser) {
        notify("سجل الدخول أولاً", "error");
        return;
    }

    await startAdminDashboard(auth.currentUser);
};

window.EICA_ADMIN = {
    navigate,
    refresh: loadDashboardData,
    can
};

console.log("EICA Admin module loaded.");
