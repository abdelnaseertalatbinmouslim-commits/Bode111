/* =========================================================
   EICA PLATFORM
   COMPLETE STUDENT DASHBOARD
   All-in-One Student System
   ========================================================= */

import {
    auth,
    db,
    ref,
    get,
    set,
    update,
    push,
    onValue,
    serverTimestamp,
    Storage
} from "./firebase.js";


/* =========================================================
   1. GLOBAL STUDENT STATE
   ========================================================= */

window.EICA = window.EICA || {};

window.EICA_STUDENT = {

    profile: null,
    courses: [],
    enrollments: [],
    exams: [],
    results: [],
    certificates: [],
    notifications: [],
    activity: [],
    currentSection: "dashboard",
    currentCourse: null,
    currentLesson: null,
    listeners: [],
    initialized: false

};


const S = window.EICA_STUDENT;


/* =========================================================
   2. HELPERS
   ========================================================= */

const Student = {

    uid() {
        return auth.currentUser?.uid || null;
    },

    user() {
        return auth.currentUser;
    },

    escape(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[char]
        );
    },

    entries(value) {

        if (!value) return [];

        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }

        if (typeof value === "object") {
            return Object.entries(value).map(([id, item]) => ({
                id,
                ...(item && typeof item === "object" ? item : {})
            }));
        }

        return [];

    },

    async read(path) {

        const snapshot = await get(ref(db, path));

        return snapshot.exists() ? snapshot.val() : null;

    },

    async write(path, data) {
        await set(ref(db, path), data);
    },

    async update(path, data) {
        await update(ref(db, path), data);
    },

    async add(path, data) {

        const newRef = push(ref(db, path));

        await set(newRef, {
            ...data,
            createdAt: serverTimestamp()
        });

        return newRef.key;

    },

    date(value) {

        if (!value) return "غير محدد";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "غير محدد";
        }

        return date.toLocaleDateString("ar-EG");

    },

    progress(value) {

        return Math.min(
            100,
            Math.max(0, Number(value || 0))
        );

    },

    toast(message, type = "info") {

        let box = document.getElementById("eicaStudentToast");

        if (!box) {

            box = document.createElement("div");

            box.id = "eicaStudentToast";

            document.body.appendChild(box);

        }

        box.className = `eica-toast ${type}`;

        box.textContent = message;

        box.classList.add("show");

        clearTimeout(box.timer);

        box.timer = setTimeout(() => {
            box.classList.remove("show");
        }, 3500);

    },

    loading(message = "جاري التحميل...") {

        const area = document.getElementById("eicaStudentContent");

        if (area) {
            area.innerHTML = `
                <div class="eica-loading">
                    <div class="eica-spinner"></div>
                    <p>${this.escape(message)}</p>
                </div>
            `;
        }

    },

    async log(action, details = {}) {

        const uid = this.uid();

        if (!uid) return;

        try {

            await this.add(
                `platform/activityLogs/${uid}`,
                {
                    action,
                    details,
                    time: Date.now()
                }
            );

        } catch (error) {
            console.warn("Activity log:", error);
        }

    }

};


/* =========================================================
   3. COMPLETE DASHBOARD STYLES
   ========================================================= */

function studentStyles() {

    if (document.getElementById("eicaCompleteStudentCSS")) return;

    const style = document.createElement("style");

    style.id = "eicaCompleteStudentCSS";

    style.textContent = `

    :root {
        --st-bg:#071426;
        --st-panel:#10233b;
        --st-panel2:#142c48;
        --st-text:#f1f7ff;
        --st-muted:#9bb1c8;
        --st-primary:#08b9e8;
        --st-border:rgba(255,255,255,.09);
        --st-success:#16c784;
        --st-danger:#ef4444;
        --st-warning:#f5b942;
    }

    .eica-student-app {
        position:fixed;
        inset:0;
        z-index:9998;
        display:none;
        direction:rtl;
        background:var(--st-bg);
        color:var(--st-text);
        font-family:"Cairo","Tajawal",Arial,sans-serif;
        overflow:hidden;
    }

    .eica-student-app.active {
        display:flex;
        animation:stAppear .3s ease;
    }

    @keyframes stAppear {
        from {opacity:0;transform:translateY(10px)}
        to {opacity:1;transform:translateY(0)}
    }

    .eica-student-app.light {
        --st-bg:#f0f5fa;
        --st-panel:#fff;
        --st-panel2:#eaf2f9;
        --st-text:#10243b;
        --st-muted:#62778e;
        --st-border:rgba(0,0,0,.09);
    }

    .st-sidebar {
        width:265px;
        flex-shrink:0;
        height:100%;
        overflow-y:auto;
        background:var(--st-panel);
        border-left:1px solid var(--st-border);
        padding:20px 14px;
        transition:.3s;
    }

    .st-brand {
        display:flex;
        align-items:center;
        gap:12px;
        padding:10px 12px 24px;
        border-bottom:1px solid var(--st-border);
        margin-bottom:20px;
    }

    .st-logo {
        width:45px;
        height:45px;
        border-radius:14px;
        display:grid;
        place-items:center;
        background:linear-gradient(135deg,#047da8,#22d3ee);
        color:white;
        font-size:25px;
        font-weight:900;
        box-shadow:0 0 25px rgba(8,185,232,.2);
    }

    .st-brand strong {
        display:block;
        font-size:19px;
        letter-spacing:1px;
    }

    .st-brand small {
        color:var(--st-muted);
        font-size:10px;
    }

    .st-nav-title {
        color:var(--st-muted);
        font-size:11px;
        padding:12px 12px 8px;
    }

    .st-nav button {
        width:100%;
        display:flex;
        align-items:center;
        gap:12px;
        padding:13px;
        margin:3px 0;
        border:0;
        border-radius:11px;
        background:transparent;
        color:var(--st-muted);
        cursor:pointer;
        font:inherit;
        text-align:right;
        transition:.2s;
    }

    .st-nav button:hover,
    .st-nav button.active {
        background:rgba(8,185,232,.13);
        color:var(--st-primary);
    }

    .st-nav-icon {
        width:24px;
        text-align:center;
        font-size:18px;
    }

    .st-main {
        flex:1;
        min-width:0;
        display:flex;
        flex-direction:column;
        height:100%;
        overflow:hidden;
    }

    .st-topbar {
        min-height:75px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 25px;
        border-bottom:1px solid var(--st-border);
        background:var(--st-panel);
    }

    .st-top-left,
    .st-top-right {
        display:flex;
        align-items:center;
        gap:12px;
    }

    .st-icon-btn {
        width:40px;
        height:40px;
        border:1px solid var(--st-border);
        border-radius:11px;
        background:var(--st-panel2);
        color:var(--st-text);
        cursor:pointer;
        font-size:18px;
    }

    .st-top-title {
        font-size:18px;
        font-weight:800;
    }

    .st-user-mini {
        display:flex;
        align-items:center;
        gap:10px;
    }

    .st-user-mini img {
        width:40px;
        height:40px;
        border-radius:50%;
        object-fit:cover;
        background:var(--st-panel2);
    }

    .st-user-mini strong {
        display:block;
        font-size:13px;
    }

    .st-user-mini small {
        color:var(--st-muted);
    }

    .st-content {
        flex:1;
        overflow-y:auto;
        padding:25px;
    }

    .st-welcome {
        position:relative;
        overflow:hidden;
        padding:30px;
        border-radius:22px;
        background:
            radial-gradient(circle at 10% 20%,rgba(34,211,238,.2),transparent 35%),
            linear-gradient(120deg,#0b2948,#075985);
        color:white;
        margin-bottom:25px;
    }

    .st-welcome:after {
        content:"EICA";
        position:absolute;
        left:20px;
        bottom:-35px;
        font-size:110px;
        font-weight:900;
        opacity:.06;
        pointer-events:none;
    }

    .st-welcome h1 {
        font-size:clamp(23px,4vw,34px);
        margin:0 0 10px;
    }

    .st-welcome p {
        color:#d0e8f8;
        line-height:1.8;
        margin:0;
    }

    .st-grid {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:15px;
        margin-bottom:25px;
    }

    .st-stat {
        background:var(--st-panel);
        border:1px solid var(--st-border);
        padding:20px;
        border-radius:16px;
    }

    .st-stat-icon {
        font-size:22px;
        margin-bottom:12px;
    }

    .st-stat strong {
        display:block;
        font-size:27px;
        color:var(--st-primary);
    }

    .st-stat span {
        color:var(--st-muted);
        font-size:13px;
    }

    .st-section-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:28px 0 17px;
    }

    .st-section-head h2 {
        font-size:20px;
        margin:0;
    }

    .st-courses-grid {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:18px;
    }

    .st-card {
        background:var(--st-panel);
        border:1px solid var(--st-border);
        border-radius:17px;
        overflow:hidden;
        transition:.25s;
    }

    .st-card:hover {
        transform:translateY(-4px);
        border-color:rgba(8,185,232,.4);
    }

    .st-course-cover {
        height:145px;
        background:linear-gradient(135deg,#075985,#10233b);
        display:grid;
        place-items:center;
        font-size:42px;
        overflow:hidden;
    }

    .st-course-cover img {
        width:100%;
        height:100%;
        object-fit:cover;
    }

    .st-card-body {
        padding:18px;
    }

    .st-card h3 {
        font-size:17px;
        margin:0 0 9px;
    }

    .st-muted {
        color:var(--st-muted);
        font-size:13px;
        line-height:1.8;
    }

    .st-progress {
        height:8px;
        border-radius:20px;
        background:var(--st-panel2);
        overflow:hidden;
        margin:13px 0 7px;
    }

    .st-progress div {
        height:100%;
        border-radius:20px;
        background:linear-gradient(90deg,#0891b2,#22d3ee);
    }

    .st-progress-label {
        display:flex;
        justify-content:space-between;
        color:var(--st-muted);
        font-size:12px;
    }

    .st-btn {
        border:0;
        border-radius:10px;
        padding:11px 17px;
        background:linear-gradient(100deg,#087da5,#0891b2);
        color:white;
        font:inherit;
        font-size:13px;
        font-weight:700;
        cursor:pointer;
        transition:.2s;
    }

    .st-btn:hover {
        filter:brightness(1.15);
        transform:translateY(-1px);
    }

    .st-btn.secondary {
        background:var(--st-panel2);
        color:var(--st-text);
        border:1px solid var(--st-border);
    }

    .st-btn.danger {
        background:#b91c1c;
    }

    .st-btn.success {
        background:#087d56;
    }

    .st-btn.full {
        width:100%;
    }

    .st-empty {
        padding:35px 20px;
        text-align:center;
        color:var(--st-muted);
        background:var(--st-panel);
        border:1px solid var(--st-border);
        border-radius:15px;
        grid-column:1/-1;
        line-height:2;
    }

    .st-table-wrap {
        width:100%;
        overflow-x:auto;
        border:1px solid var(--st-border);
        border-radius:15px;
        background:var(--st-panel);
    }

    .st-table {
        width:100%;
        border-collapse:collapse;
        min-width:600px;
    }

    .st-table th,
    .st-table td {
        padding:15px;
        text-align:right;
        border-bottom:1px solid var(--st-border);
        font-size:13px;
    }

    .st-table th {
        color:var(--st-muted);
        background:var(--st-panel2);
    }

    .st-badge {
        display:inline-block;
        padding:5px 10px;
        border-radius:20px;
        font-size:11px;
        background:rgba(8,185,232,.12);
        color:var(--st-primary);
    }

    .st-badge.success {
        background:rgba(22,199,132,.12);
        color:var(--st-success);
    }

    .st-badge.warning {
        background:rgba(245,185,66,.12);
        color:var(--st-warning);
    }

    .st-badge.danger {
        background:rgba(239,68,68,.12);
        color:var(--st-danger);
    }

    .st-form {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:15px;
    }

    .st-field {
        display:flex;
        flex-direction:column;
        gap:8px;
    }

    .st-field.full {
        grid-column:1/-1;
    }

    .st-field label {
        font-size:13px;
        color:var(--st-muted);
    }

    .st-field input,
    .st-field textarea,
    .st-field select {
        width:100%;
        box-sizing:border-box;
        padding:13px;
        border-radius:10px;
        border:1px solid var(--st-border);
        background:var(--st-panel2);
        color:var(--st-text);
        font:inherit;
        outline:none;
    }

    .st-field input:focus,
    .st-field textarea:focus,
    .st-field select:focus {
        border-color:var(--st-primary);
    }

    .st-field textarea {
        min-height:110px;
        resize:vertical;
    }

    .st-panel {
        background:var(--st-panel);
        border:1px solid var(--st-border);
        border-radius:17px;
        padding:22px;
        margin-bottom:18px;
    }

    .st-profile-head {
        display:flex;
        align-items:center;
        gap:20px;
        margin-bottom:25px;
    }

    .st-profile-head img {
        width:90px;
        height:90px;
        border-radius:50%;
        object-fit:cover;
        border:3px solid var(--st-primary);
    }

    .st-notification {
        padding:16px;
        background:var(--st-panel);
        border:1px solid var(--st-border);
        border-radius:12px;
        margin-bottom:12px;
    }

    .st-notification.unread {
        border-right:4px solid var(--st-primary);
    }

    .st-notification h3 {
        font-size:15px;
        margin:0 0 7px;
    }

    .st-notification p {
        color:var(--st-muted);
        font-size:13px;
        line-height:1.8;
    }

    .st-lesson {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:15px;
        background:var(--st-panel);
        border:1px solid var(--st-border);
        border-radius:12px;
        margin-bottom:10px;
    }

    .st-video {
        width:100%;
        aspect-ratio:16/9;
        background:#000;
        border-radius:14px;
        overflow:hidden;
    }

    .st-video iframe {
        width:100%;
        height:100%;
        border:0;
    }

    .st-certificate {
        padding:30px;
        border:2px solid #d8b45c;
        background:linear-gradient(135deg,#fff9e9,#f2e4bd);
        color:#26354a;
        text-align:center;
        border-radius:15px;
        margin-bottom:15px;
    }

    .st-certificate h2 {
        color:#94702a;
        font-size:27px;
    }

    .st-empty-state {
        padding:35px;
        text-align:center;
        color:var(--st-muted);
        background:var(--st-panel);
        border-radius:15px;
    }

    .eica-loading {
        min-height:250px;
        display:grid;
        place-content:center;
        justify-items:center;
        gap:15px;
        color:var(--st-muted);
    }

    .eica-spinner {
        width:40px;
        height:40px;
        border:3px solid var(--st-border);
        border-top-color:var(--st-primary);
        border-radius:50%;
        animation:stSpin .8s linear infinite;
    }

    @keyframes stSpin {
        to {transform:rotate(360deg)}
    }

    #eicaStudentToast {
        position:fixed;
        bottom:25px;
        left:25px;
        z-index:10020;
        background:#10233b;
        color:white;
        padding:14px 20px;
        border-radius:12px;
        border:1px solid rgba(8,185,232,.3);
        opacity:0;
        transform:translateY(15px);
        pointer-events:none;
        transition:.25s;
        max-width:85%;
    }

    #eicaStudentToast.show {
        opacity:1;
        transform:translateY(0);
    }

    #eicaStudentToast.error {
        border-color:#ef4444;
    }

    #eicaStudentToast.success {
        border-color:#16c784;
    }

    .st-mobile-overlay {
        display:none;
    }

    .st-video-modal {
        position:fixed;
        inset:0;
        z-index:10010;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,.92);
        padding:15px;
    }

    .st-video-box {
        width:min(1000px,100%);
        background:#10233b;
        padding:18px;
        border-radius:17px;
        color:white;
    }

    .st-video-box iframe {
        width:100%;
        aspect-ratio:16/9;
        border:0;
        border-radius:10px;
    }

    @media(max-width:1100px) {
        .st-grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .st-courses-grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
        }
    }

    @media(max-width:760px) {

        .st-sidebar {
            position:absolute;
            right:-280px;
            top:0;
            bottom:0;
            z-index:5;
            width:265px;
        }

        .st-sidebar.open {
            right:0;
        }

        .st-mobile-overlay.show {
            display:block;
            position:absolute;
            inset:0;
            background:rgba(0,0,0,.6);
            z-index:4;
        }

        .st-content {
            padding:15px;
        }

        .st-topbar {
            padding:10px 14px;
        }

        .st-user-mini div {
            display:none;
        }

    }

    @media(max-width:540px) {

        .st-grid,
        .st-courses-grid {
            grid-template-columns:1fr;
        }

        .st-form {
            grid-template-columns:1fr;
        }

        .st-field.full {
            grid-column:auto;
        }

        .st-welcome {
            padding:22px;
        }

        .st-stat {
            padding:16px;
        }

        .st-top-title {
            font-size:14px;
        }

    }

    `;

    document.head.appendChild(style);

}


/* =========================================================
   4. CREATE COMPLETE DASHBOARD
   ========================================================= */

function createDashboard() {

    if (document.getElementById("eicaStudentApp")) return;

    studentStyles();

    const app = document.createElement("div");

    app.id = "eicaStudentApp";

    app.className = "eica-student-app";

    app.innerHTML = `

        <div class="st-mobile-overlay" id="stOverlay"></div>

        <aside class="st-sidebar" id="stSidebar">

            <div class="st-brand">

                <div class="st-logo">E</div>

                <div>
                    <strong>EICA</strong>
                    <small>STUDENT PORTAL</small>
                </div>

            </div>

            <div class="st-nav-title">القائمة الرئيسية</div>

            <nav class="st-nav">

                <button data-page="dashboard" class="active">
                    <span class="st-nav-icon">⌂</span>
                    الرئيسية
                </button>

                <button data-page="courses">
                    <span class="st-nav-icon">▣</span>
                    كورساتي
                </button>

                <button data-page="exams">
                    <span class="st-nav-icon">✎</span>
                    الامتحانات
                </button>

                <button data-page="results">
                    <span class="st-nav-icon">▤</span>
                    النتائج والدرجات
                </button>

                <button data-page="certificates">
                    <span class="st-nav-icon">🏆</span>
                    الشهادات
                </button>

                <button data-page="notifications">
                    <span class="st-nav-icon">♢</span>
                    الإشعارات
                </button>

            </nav>

            <div class="st-nav-title">حسابي</div>

            <nav class="st-nav">

                <button data-page="profile">
                    <span class="st-nav-icon">◉</span>
                    الملف الشخصي
                </button>

                <button data-page="activity">
                    <span class="st-nav-icon">◷</span>
                    سجل النشاط
                </button>

                <button data-page="security">
                    <span class="st-nav-icon">♧</span>
                    الأمان
                </button>

                <button data-page="support">
                    <span class="st-nav-icon">✉</span>
                    الدعم الفني
                </button>

                <button data-page="settings">
                    <span class="st-nav-icon">⚙</span>
                    الإعدادات
                </button>

            </nav>

            <div class="st-nav-title">الحساب</div>

            <nav class="st-nav">

                <button id="stLogout">
                    <span class="st-nav-icon">↪</span>
                    تسجيل الخروج
                </button>

            </nav>

        </aside>


        <main class="st-main">

            <header class="st-topbar">

                <div class="st-top-left">

                    <button
                        class="st-icon-btn"
                        id="stMenuToggle">
                        ☰
                    </button>

                    <div class="st-top-title" id="stPageTitle">
                        الرئيسية
                    </div>

                </div>

                <div class="st-top-right">

                    <button
                        class="st-icon-btn"
                        id="stThemeToggle"
                        title="تغيير المظهر">
                        ☾
                    </button>

                    <button
                        class="st-icon-btn"
                        id="stNotificationButton"
                        title="الإشعارات">
                        ♢
                    </button>

                    <div class="st-user-mini">

                        <img
                            id="stTopAvatar"
                            alt="الصورة الشخصية"
                            src="">

                        <div>
                            <strong id="stTopName">الطالب</strong>
                            <small>طالب EICA</small>
                        </div>

                    </div>

                </div>

            </header>


            <div class="st-content" id="eicaStudentContent">
                <div class="eica-loading">
                    <div class="eica-spinner"></div>
                    <p>جاري تجهيز لوحة الطالب...</p>
                </div>
            </div>

        </main>

    `;

    document.body.appendChild(app);

    bindDashboardEvents();

}


/* =========================================================
   5. DASHBOARD EVENTS
   ========================================================= */

function bindDashboardEvents() {

    document.querySelectorAll(
        "#eicaStudentApp [data-page]"
    ).forEach(button => {

        button.addEventListener("click", () => {

            navigate(button.dataset.page);

            document.getElementById(
                "stSidebar"
            ).classList.remove("open");

            document.getElementById(
                "stOverlay"
            ).classList.remove("show");

        });

    });


    document.getElementById(
        "stMenuToggle"
    ).addEventListener("click", () => {

        document.getElementById(
            "stSidebar"
        ).classList.toggle("open");

        document.getElementById(
            "stOverlay"
        ).classList.toggle("show");

    });


    document.getElementById(
        "stOverlay"
    ).addEventListener("click", () => {

        document.getElementById(
            "stSidebar"
        ).classList.remove("open");

        document.getElementById(
            "stOverlay"
        ).classList.remove("show");

    });


    document.getElementById(
        "stThemeToggle"
    ).addEventListener("click", toggleTheme);


    document.getElementById(
        "stNotificationButton"
    ).addEventListener("click", () => {
        navigate("notifications");
    });


    document.getElementById(
        "stLogout"
    ).addEventListener("click", logout);

}


/* =========================================================
   6. THEME
   ========================================================= */

function toggleTheme() {

    const app = document.getElementById("eicaStudentApp");

    if (!app) return;

    app.classList.toggle("light");

    const light = app.classList.contains("light");

    localStorage.setItem(
        "eica_student_theme",
        light ? "light" : "dark"
    );

    document.getElementById(
        "stThemeToggle"
    ).textContent = light ? "☀" : "☾";

}


function loadTheme() {

    const theme = localStorage.getItem(
        "eica_student_theme"
    );

    const app = document.getElementById("eicaStudentApp");

    if (theme === "light") {
        app.classList.add("light");

        document.getElementById(
            "stThemeToggle"
        ).textContent = "☀";
    }

}


/* =========================================================
   7. LOAD PROFILE
   ========================================================= */

async function loadProfile() {

    const uid = Student.uid();

    if (!uid) throw new Error("يجب تسجيل الدخول.");

    const profile = await Student.read(
        `platform/users/${uid}`
    );

    if (!profile) {
        throw new Error("بيانات الطالب غير موجودة.");
    }

    S.profile = profile;

    return profile;

}


/* =========================================================
   8. LOAD COURSES
   ========================================================= */

async function loadCourses() {

    const uid = Student.uid();

    const enrollmentData = await Student.read(
        `platform/enrollments/${uid}`
    );

    let enrollments = Student.entries(enrollmentData);

    if (!enrollments.length && Array.isArray(S.profile?.courseIds)) {

        enrollments = S.profile.courseIds.map(courseId => ({
            courseId,
            progress: 0
        }));

    }

    S.enrollments = enrollments;

    const courses = [];

    for (const enrollment of enrollments) {

        const courseId =
            enrollment.courseId || enrollment.id;

        if (!courseId) continue;

        const course = await Student.read(
            `platform/courses/${courseId}`
        );

        if (!course) continue;

        if (
            course.enabled === false ||
            course.published === false ||
            course.status === "disabled"
        ) continue;

        courses.push({
            id: courseId,
            ...course,
            enrollment
        });

    }

    S.courses = courses;

    return courses;

}


/* =========================================================
   9. LOAD EXAMS
   ========================================================= */

async function loadExams() {

    const uid = Student.uid();

    const all = Student.entries(
        await Student.read("platform/exams")
    );

    const allowedCourses = S.courses.map(c => c.id);

    S.exams = all.filter(exam => {

        if (exam.enabled === false) return false;

        if (exam.published === false) return false;

        if (exam.status === "disabled") return false;

        return (
            !exam.courseId ||
            allowedCourses.includes(exam.courseId)
        );

    });

    return S.exams;

}


/* =========================================================
   10. LOAD RESULTS
   ========================================================= */

async function loadResults() {

    const uid = Student.uid();

    const data = await Student.read(
        `platform/results/${uid}`
    );

    S.results = Student.entries(data);

    return S.results;

}


/* =========================================================
   11. LOAD CERTIFICATES
   ========================================================= */

async function loadCertificates() {

    const uid = Student.uid();

    const data = await Student.read(
        `platform/certificates/${uid}`
    );

    S.certificates = Student.entries(data);

    return S.certificates;

}


/* =========================================================
   12. LOAD NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {

    const uid = Student.uid();

    const personal = Student.entries(
        await Student.read(
            `platform/notifications/${uid}`
        )
    );

    const global = Student.entries(
        await Student.read(
            "platform/notifications/global"
        )
    );

    S.notifications = [...personal, ...global];

    S.notifications.sort((a, b) => {

        return Number(b.createdAt || 0) -
            Number(a.createdAt || 0);

    });

    return S.notifications;

}


/* =========================================================
   13. LOAD ACTIVITY
   ========================================================= */

async function loadActivity() {

    const uid = Student.uid();

    const data = await Student.read(
        `platform/activityLogs/${uid}`
    );

    S.activity = Student.entries(data);

    S.activity.sort((a, b) => {
        return Number(b.time || 0) -
            Number(a.time || 0);
    });

    return S.activity;

}


/* =========================================================
   14. DASHBOARD PAGE
   ========================================================= */

async function renderDashboard() {

    Student.loading("جاري تحميل الصفحة الرئيسية...");

    await Promise.all([
        loadCourses(),
        loadExams(),
        loadResults(),
        loadCertificates(),
        loadNotifications()
    ]);

    const profile = S.profile;

    const progress = S.courses.length
        ? Math.round(
            S.courses.reduce((sum, course) => {
                return sum + Student.progress(
                    course.enrollment.progress
                );
            }, 0) / S.courses.length
        )
        : 0;

    const completed = S.courses.filter(course => {
        return Student.progress(
            course.enrollment.progress
        ) >= 100;
    }).length;

    const unread = S.notifications.filter(n => {
        return n.read !== true;
    }).length;

    setPageTitle("الرئيسية");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <section class="st-welcome">

            <h1>
                أهلًا بك،
                ${Student.escape(profile.name || "طالب EICA")}
            </h1>

            <p>
                مرحبًا بك في منصتك التعليمية.
                تابع تقدمك واستكمل رحلتك في عالم التكنولوجيا والبرمجة.
            </p>

        </section>


        <section class="st-grid">

            <div class="st-stat">
                <div class="st-stat-icon">💻</div>
                <strong>${S.courses.length}</strong>
                <span>الكورسات المسندة</span>
            </div>

            <div class="st-stat">
                <div class="st-stat-icon">📈</div>
                <strong>${progress}%</strong>
                <span>متوسط التقدم</span>
            </div>

            <div class="st-stat">
                <div class="st-stat-icon">🏆</div>
                <strong>${completed}</strong>
                <span>الكورسات المكتملة</span>
            </div>

            <div class="st-stat">
                <div class="st-stat-icon">🔔</div>
                <strong>${unread}</strong>
                <span>إشعارات غير مقروءة</span>
            </div>

        </section>


        <div class="st-section-head">

            <h2>استكمل التعلم</h2>

            <button
                class="st-btn secondary"
                data-go="courses">
                كل الكورسات
            </button>

        </div>


        <section class="st-courses-grid">

            ${renderCourseCards(S.courses.slice(0, 3))}

        </section>


        <div class="st-section-head">
            <h2>آخر الإشعارات</h2>
        </div>

        ${renderNotificationCards(S.notifications.slice(0, 3))}

    `;

    bindPageNavigation();

}


/* =========================================================
   15. COURSE CARDS
   ========================================================= */

function renderCourseCards(courses) {

    if (!courses.length) {

        return `
            <div class="st-empty">
                لم يتم إسناد كورسات إلى حسابك حتى الآن.
                <br>
                ستظهر الكورسات هنا بعد إضافتها من الإدارة.
            </div>
        `;

    }

    return courses.map(course => {

        const progress = Student.progress(
            course.enrollment.progress
        );

        const cover = course.coverURL
            ? `<img src="${Student.escape(course.coverURL)}" alt="">`
            : "💻";

        return `

            <article class="st-card">

                <div class="st-course-cover">
                    ${cover}
                </div>

                <div class="st-card-body">

                    <h3>
                        ${Student.escape(course.title || course.name || "كورس")}
                    </h3>

                    <p class="st-muted">
                        ${Student.escape(course.description || "كورس تعليمي من أكاديمية EICA")}
                    </p>

                    <div class="st-progress">
                        <div style="width:${progress}%"></div>
                    </div>

                    <div class="st-progress-label">
                        <span>نسبة الإنجاز</span>
                        <strong>${progress}%</strong>
                    </div>

                    <br>

                    <button
                        class="st-btn full"
                        data-open-course="${Student.escape(course.id)}">
                        دخول الكورس
                    </button>

                </div>

            </article>

        `;

    }).join("");

}


/* =========================================================
   16. COURSES PAGE
   ========================================================= */

async function renderCourses() {

    Student.loading("جاري تحميل الكورسات...");

    await loadCourses();

    setPageTitle("كورساتي");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>الكورسات المخصصة لك</h2>
            <span class="st-badge">${S.courses.length} كورس</span>
        </div>

        <section class="st-courses-grid">
            ${renderCourseCards(S.courses)}
        </section>

    `;

    bindPageNavigation();

}


/* =========================================================
   17. OPEN COURSE DETAILS
   ========================================================= */

async function openCourse(courseId) {

    const course = S.courses.find(c => c.id === courseId);

    if (!course) {
        Student.toast("الكورس غير متاح لحسابك.", "error");
        return;
    }

    S.currentCourse = course;

    Student.loading("جاري تحميل تفاصيل الكورس...");

    const lessonsData = await Student.read(
        `platform/lessons/${courseId}`
    );

    const lessons = Student.entries(lessonsData);

    setPageTitle(course.title || "تفاصيل الكورس");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <button
            class="st-btn secondary"
            data-go="courses">
            ← العودة للكورسات
        </button>

        <div class="st-panel" style="margin-top:20px">

            <h2>${Student.escape(course.title || course.name || "الكورس")}</h2>

            <p class="st-muted">
                ${Student.escape(course.description || "")}
            </p>

            <div class="st-progress">
                <div style="width:${Student.progress(course.enrollment.progress)}%"></div>
            </div>

            <p class="st-muted">
                نسبة الإنجاز:
                ${Student.progress(course.enrollment.progress)}%
            </p>

        </div>

        <div class="st-section-head">
            <h2>محتوى الكورس والدروس</h2>
        </div>

        <div id="stLessonList">

            ${
                lessons.length
                ? lessons.map((lesson, index) => `

                    <div class="st-lesson">

                        <div>
                            <strong>
                                ${index + 1}.
                                ${Student.escape(lesson.title || lesson.name || "الدرس")}
                            </strong>

                            <p class="st-muted">
                                ${Student.escape(lesson.description || "")}
                            </p>
                        </div>

                        <button
                            class="st-btn"
                            data-open-lesson="${Student.escape(lesson.id)}">
                            مشاهدة
                        </button>

                    </div>

                `).join("")
                : `
                    <div class="st-empty">
                        لم تتم إضافة دروس لهذا الكورس بعد.
                    </div>
                `
            }

        </div>

    `;

    bindPageNavigation();

    await Student.log("open_course", {
        courseId
    });

}


/* =========================================================
   18. OPEN LESSON
   ========================================================= */

async function openLesson(lessonId) {

    const course = S.currentCourse;

    if (!course) {
        Student.toast("افتح الكورس أولًا.", "error");
        return;
    }

    const lesson = await Student.read(
        `platform/lessons/${course.id}/${lessonId}`
    );

    if (!lesson) {
        Student.toast("الدرس غير موجود.", "error");
        return;
    }

    S.currentLesson = lesson;

    const video = getEmbedURL(
        lesson.videoURL ||
        lesson.videoUrl ||
        lesson.youtubeURL ||
        lesson.youtubeUrl ||
        ""
    );

    if (!video) {
        Student.toast("لم يتم إضافة فيديو لهذا الدرس.", "error");
        return;
    }

    setPageTitle(lesson.title || "مشاهدة الدرس");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <button
            class="st-btn secondary"
            data-open-course="${Student.escape(course.id)}">
            ← العودة إلى الكورس
        </button>

        <div class="st-panel" style="margin-top:20px">

            <h2>
                ${Student.escape(lesson.title || "الدرس")}
            </h2>

            <p class="st-muted">
                ${Student.escape(lesson.description || "")}
            </p>

            <div class="st-video">
                <iframe
                    src="${Student.escape(video)}"
                    title="${Student.escape(lesson.title || "الدرس")}"
                    allowfullscreen
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture">
                </iframe>
            </div>

            <br>

            <button
                class="st-btn success"
                id="stCompleteLesson">
                ✓ تحديد الدرس كمكتمل
            </button>

        </div>

    `;

    document.getElementById(
        "stCompleteLesson"
    ).addEventListener("click", () => {
        completeLesson(course.id, lessonId);
    });

    await Student.log("open_lesson", {
        courseId: course.id,
        lessonId
    });

}


/* =========================================================
   19. VIDEO URL CONVERTER
   ========================================================= */

function getEmbedURL(url) {

    if (!url) return null;

    try {

        const parsed = new URL(url);

        const host = parsed.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {

            const id = parsed.pathname.slice(1);

            return id
                ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
                : null;

        }

        if (
            host === "youtube.com" ||
            host === "m.youtube.com"
        ) {

            if (parsed.pathname === "/watch") {

                const id = parsed.searchParams.get("v");

                return id
                    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
                    : null;

            }

            if (parsed.pathname.startsWith("/embed/")) {
                return url;
            }

        }

        if (host === "vimeo.com") {

            const id = parsed.pathname.split("/").filter(Boolean).pop();

            if (/^\d+$/.test(id || "")) {
                return `https://player.vimeo.com/video/${id}`;
            }

        }

        return url;

    } catch {
        return null;
    }

}


/* =========================================================
   20. COMPLETE LESSON
   ========================================================= */

async function completeLesson(courseId, lessonId) {

    const uid = Student.uid();

    try {

        await Student.write(
            `platform/users/${uid}/lessonProgress/${courseId}/${lessonId}`,
            {
                completed: true,
                completedAt: Date.now()
            }
        );

        await Student.log("complete_lesson", {
            courseId,
            lessonId
        });

        Student.toast(
            "تم تسجيل الدرس كمكتمل.",
            "success"
        );

    } catch (error) {

        console.error(error);

        Student.toast(
            "تعذر حفظ تقدم الدرس.",
            "error"
        );

    }

}


/* =========================================================
   21. EXAMS PAGE
   ========================================================= */

async function renderExams() {

    Student.loading("جاري تحميل الامتحانات...");

    await loadCourses();

    await loadExams();

    await loadResults();

    setPageTitle("الامتحانات");

    const resultsByExam = new Map(
        S.results.map(result => [
            result.examId || result.id,
            result
        ])
    );

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>الامتحانات المتاحة</h2>
        </div>

        ${
            S.exams.length
            ? S.exams.map(exam => {

                const result = resultsByExam.get(exam.id);

                return `

                    <div class="st-panel">

                        <h3>
                            ${Student.escape(exam.title || exam.name || "امتحان")}
                        </h3>

                        <p class="st-muted">
                            ${Student.escape(exam.description || "")}
                        </p>

                        <p class="st-muted">
                            عدد الأسئلة:
                            ${Student.escape(exam.questionCount || Student.entries(exam.questions).length)}
                        </p>

                        ${
                            result
                            ? `
                                <span class="st-badge success">
                                    تم أداء الامتحان
                                </span>

                                <p>
                                    الدرجة:
                                    ${Student.escape(result.score ?? "--")}
                                </p>
                            `
                            : `
                                <span class="st-badge warning">
                                    لم يتم أداء الامتحان
                                </span>

                                <br><br>

                                <button
                                    class="st-btn"
                                    data-exam="${Student.escape(exam.id)}">
                                    فتح الامتحان
                                </button>
                            `
                        }

                    </div>

                `;

            }).join("")
            : `
                <div class="st-empty">
                    لا توجد امتحانات متاحة لحسابك حاليًا.
                </div>
            `
        }

    `;

    bindPageNavigation();

}


/* =========================================================
   22. START EXAM
   ========================================================= */

async function startExam(examId) {

    const exam = S.exams.find(e => e.id === examId);

    if (!exam) {
        Student.toast("الامتحان غير متاح.", "error");
        return;
    }

    const previous = S.results.find(
        r => r.examId === examId
    );

    if (previous) {
        Student.toast("لقد قمت بأداء هذا الامتحان بالفعل.");
        return;
    }

    const questions = Student.entries(exam.questions);

    if (!questions.length) {
        Student.toast("لا توجد أسئلة مضافة لهذا الامتحان.");
        return;
    }

    const content = document.getElementById(
        "eicaStudentContent"
    );

    content.innerHTML = `

        <div class="st-panel">

            <h2>${Student.escape(exam.title || "الامتحان")}</h2>

            <p class="st-muted">
                اقرأ كل سؤال واختر الإجابة الصحيحة.
            </p>

            <form id="stExamForm">

                ${
                    questions.map((question, index) => {

                        const options = Student.entries(
                            question.options
                        );

                        return `

                            <div class="st-panel">

                                <h3>
                                    ${index + 1}.
                                    ${Student.escape(question.text || question.title || "السؤال")}
                                </h3>

                                ${
                                    options.map((option, optionIndex) => {

                                        const value =
                                            typeof option === "object"
                                            ? option.value ?? option.text ?? option.id
                                            : option;

                                        return `

                                            <label style="
                                                display:block;
                                                padding:10px;
                                                margin:7px 0;
                                                background:var(--st-panel2);
                                                border-radius:9px;
                                                cursor:pointer;
                                            ">

                                                <input
                                                    type="radio"
                                                    name="question_${Student.escape(question.id || index)}"
                                                    value="${Student.escape(value)}"
                                                    required
                                                >

                                                ${Student.escape(
                                                    typeof option === "object"
                                                    ? option.text || option.value
                                                    : option
                                                )}

                                            </label>

                                        `;

                                    }).join("")
                                }

                            </div>

                        `;

                    }).join("")
                }

                <button class="st-btn full" type="submit">
                    تسليم الامتحان
                </button>

            </form>

        </div>

    `;


    document.getElementById(
        "stExamForm"
    ).addEventListener("submit", async event => {

        event.preventDefault();

        await submitExam(exam, questions);

    });

}


/* =========================================================
   23. SUBMIT EXAM
   ========================================================= */

/*
   هذا نموذج أولي لعرض الاختبار.
   تصحيح الإجابات وحساب الدرجات يجب أن يتم في الخادم
   حتى لا يستطيع الطالب الاطلاع على الإجابات الصحيحة.
*/

async function submitExam(exam, questions) {

    Student.toast(
        "نظام تسليم الامتحان يحتاج ربط خدمة التصحيح الآمنة من الخادم.",
        "warning"
    );

}


/* =========================================================
   24. RESULTS PAGE
   ========================================================= */

async function renderResults() {

    Student.loading("جاري تحميل النتائج...");

    await loadResults();

    setPageTitle("النتائج والدرجات");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>سجل نتائجك</h2>
        </div>

        ${
            S.results.length
            ? `

                <div class="st-table-wrap">

                    <table class="st-table">

                        <thead>
                            <tr>
                                <th>الامتحان</th>
                                <th>الدرجة</th>
                                <th>النسبة</th>
                                <th>التاريخ</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                S.results.map(result => `

                                    <tr>

                                        <td>
                                            ${Student.escape(result.examTitle || result.title || "امتحان")}
                                        </td>

                                        <td>
                                            ${Student.escape(result.score ?? "--")}
                                        </td>

                                        <td>
                                            ${Student.escape(result.percentage ?? "--")}%
                                        </td>

                                        <td>
                                            ${Student.date(result.createdAt)}
                                        </td>

                                        <td>
                                            <span class="st-badge success">
                                                ${Student.escape(result.status || "تم التسجيل")}
                                            </span>
                                        </td>

                                    </tr>

                                `).join("")
                            }

                        </tbody>

                    </table>

                </div>

            `
            : `
                <div class="st-empty">
                    لا توجد نتائج مسجلة حتى الآن.
                </div>
            `
        }

    `;

}


/* =========================================================
   25. CERTIFICATES PAGE
   ========================================================= */

async function renderCertificates() {

    Student.loading("جاري تحميل الشهادات...");

    await loadCertificates();

    setPageTitle("الشهادات");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>شهاداتي</h2>
        </div>

        ${
            S.certificates.length
            ? S.certificates.map(certificate => `

                <div class="st-certificate">

                    <div style="font-size:40px">🏆</div>

                    <h2>شهادة إتمام</h2>

                    <p>تشهد أكاديمية EICA بأن الطالب</p>

                    <h2>
                        ${Student.escape(S.profile.name || "")}
                    </h2>

                    <p>
                        قد أتم بنجاح:
                    </p>

                    <h3>
                        ${Student.escape(certificate.courseTitle || certificate.title || "الدورة التدريبية")}
                    </h3>

                    <p>
                        تاريخ الإصدار:
                        ${Student.date(certificate.issuedAt)}
                    </p>

                    <p>
                        رقم الشهادة:
                        ${Student.escape(certificate.certificateNumber || certificate.id)}
                    </p>

                    ${
                        certificate.fileURL
                        ? `
                            <a
                                class="st-btn"
                                href="${Student.escape(certificate.fileURL)}"
                                target="_blank"
                                rel="noopener">
                                عرض الشهادة
                            </a>
                        `
                        : ""
                    }

                </div>

            `).join("")
            : `
                <div class="st-empty">
                    لا توجد شهادات صادرة لحسابك حاليًا.
                    <br>
                    ستظهر شهاداتك هنا بعد إصدارها من الإدارة.
                </div>
            `
        }

    `;

}


/* =========================================================
   26. NOTIFICATIONS
   ========================================================= */

function renderNotificationCards(notifications) {

    if (!notifications.length) {

        return `
            <div class="st-empty">
                لا توجد إشعارات حاليًا.
            </div>
        `;

    }

    return notifications.map(notification => `

        <div class="st-notification ${
            notification.read === true ? "" : "unread"
        }">

            <h3>
                ${Student.escape(notification.title || "إشعار جديد")}
            </h3>

            <p>
                ${Student.escape(notification.message || notification.body || "")}
            </p>

            <small class="st-muted">
                ${Student.date(notification.createdAt)}
            </small>

            ${
                notification.read !== true && notification.id
                ? `
                    <br><br>
                    <button
                        class="st-btn secondary"
                        data-read-notification="${Student.escape(notification.id)}">
                        تحديد كمقروء
                    </button>
                `
                : ""
            }

        </div>

    `).join("");

}


async function renderNotifications() {

    Student.loading("جاري تحميل الإشعارات...");

    await loadNotifications();

    setPageTitle("الإشعارات");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>كل الإشعارات</h2>
        </div>

        ${renderNotificationCards(S.notifications)}

    `;

    bindPageNavigation();

}


async function markNotificationRead(notificationId) {

    const uid = Student.uid();

    try {

        await Student.update(
            `platform/notifications/${uid}/${notificationId}`,
            {
                read: true,
                readAt: Date.now()
            }
        );

        Student.toast("تم تحديث الإشعار.", "success");

        await renderNotifications();

    } catch (error) {

        Student.toast(
            "تعذر تحديث الإشعار.",
            "error"
        );

    }

}


/* =========================================================
   27. PROFILE PAGE
   ========================================================= */

async function renderProfile() {

    setPageTitle("الملف الشخصي");

    const profile = S.profile;

    const photo = profile.photoURL ||
        auth.currentUser?.photoURL ||
        "";

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-panel">

            <div class="st-profile-head">

                <img
                    id="stProfilePhoto"
                    src="${Student.escape(photo)}"
                    alt="الصورة الشخصية"
                >

                <div>
                    <h2>
                        ${Student.escape(profile.name || "الطالب")}
                    </h2>

                    <p class="st-muted">
                        ${Student.escape(profile.email || auth.currentUser?.email || "")}
                    </p>
                </div>

            </div>

            <form id="stProfileForm" class="st-form">

                <div class="st-field">
                    <label>الاسم الكامل</label>
                    <input
                        name="name"
                        value="${Student.escape(profile.name || "")}"
                        required
                    >
                </div>

                <div class="st-field">
                    <label>رقم الهاتف</label>
                    <input
                        name="phone"
                        value="${Student.escape(profile.phone || "")}"
                    >
                </div>

                <div class="st-field">
                    <label>البريد الإلكتروني</label>
                    <input
                        value="${Student.escape(profile.email || auth.currentUser?.email || "")}"
                        disabled
                    >
                </div>

                <div class="st-field">
                    <label>الفرقة / المستوى</label>
                    <input
                        name="level"
                        value="${Student.escape(profile.level || profile.year || "")}"
                    >
                </div>

                <div class="st-field full">
                    <label>الصورة الشخصية</label>
                    <input
                        type="file"
                        id="stPhotoInput"
                        accept="image/png,image/jpeg,image/webp"
                    >
                </div>

                <div class="st-field full">
                    <button class="st-btn" type="submit">
                        حفظ التعديلات
                    </button>
                </div>

            </form>

        </div>

    `;


    document.getElementById(
        "stProfileForm"
    ).addEventListener("submit", saveProfile);


    document.getElementById(
        "stPhotoInput"
    ).addEventListener("change", previewPhoto);

}


function previewPhoto(event) {

    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        Student.toast("اختر ملف صورة صحيحًا.", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        Student.toast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.", "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {

        document.getElementById(
            "stProfilePhoto"
        ).src = reader.result;

    };

    reader.readAsDataURL(file);

}


async function saveProfile(event) {

    event.preventDefault();

    const form = event.currentTarget;

    const uid = Student.uid();

    const formData = new FormData(form);

    const name = String(
        formData.get("name") || ""
    ).trim();

    const phone = String(
        formData.get("phone") || ""
    ).trim();

    const level = String(
        formData.get("level") || ""
    ).trim();

    if (!name) {
        Student.toast("الاسم مطلوب.", "error");
        return;
    }

    try {

        const changes = {
            name,
            phone,
            level,
            updatedAt: serverTimestamp()
        };

        const file = document.getElementById(
            "stPhotoInput"
        ).files?.[0];

        if (file) {

            const uploaded = await Storage.upload(
                file,
                `studentPhotos/${uid}/profile_${Date.now()}`
            );

            changes.photoURL = uploaded.url;

        }

        await Student.update(
            `platform/users/${uid}`,
            changes
        );

        S.profile = {
            ...S.profile,
            ...changes
        };

        Student.toast(
            "تم حفظ بياناتك بنجاح.",
            "success"
        );

        await Student.log("profile_updated");

        await refreshHeader();

        await renderProfile();

    } catch (error) {

        console.error(error);

        Student.toast(
            "تعذر حفظ التعديلات. تحقق من صلاحيات Firebase Storage وقاعدة البيانات.",
            "error"
        );

    }

}


/* =========================================================
   28. ACTIVITY PAGE
   ========================================================= */

async function renderActivity() {

    Student.loading("جاري تحميل سجل النشاط...");

    await loadActivity();

    setPageTitle("سجل النشاط");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-section-head">
            <h2>آخر أنشطتك</h2>
        </div>

        ${
            S.activity.length
            ? S.activity.map(item => `

                <div class="st-notification">

                    <h3>
                        ${Student.escape(item.action || "نشاط")}
                    </h3>

                    <p class="st-muted">
                        ${Student.escape(JSON.stringify(item.details || {}))}
                    </p>

                    <small class="st-muted">
                        ${Student.date(item.time)}
                    </small>

                </div>

            `).join("")
            : `
                <div class="st-empty">
                    لا توجد أنشطة مسجلة حتى الآن.
                </div>
            `
        }

    `;

}


/* =========================================================
   29. SECURITY PAGE
   ========================================================= */

async function renderSecurity() {

    setPageTitle("الأمان");

    const user = auth.currentUser;

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-panel">

            <h2>أمان الحساب</h2>

            <p class="st-muted">
                بيانات حسابك الأساسية.
            </p>

            <p>
                البريد الإلكتروني:
                <strong>${Student.escape(user?.email || "")}</strong>
            </p>

            <p>
                حالة البريد:
                <span class="st-badge">
                    ${user?.emailVerified ? "مؤكد" : "غير مؤكد"}
                </span>
            </p>

            <p class="st-muted">
                يتم تسجيل الدخول من خلال Firebase Authentication.
            </p>

        </div>


        <div class="st-panel">

            <h2>تغيير كلمة المرور</h2>

            <form id="stPasswordForm">

                <div class="st-field">
                    <label>كلمة المرور الجديدة</label>
                    <input
                        type="password"
                        name="password"
                        minlength="6"
                        required
                    >
                </div>

                <br>

                <button class="st-btn" type="submit">
                    تغيير كلمة المرور
                </button>

            </form>

            <p class="st-muted">
                قد يطلب Firebase إعادة تسجيل الدخول
                إذا كانت جلسة الحساب قديمة.
            </p>

        </div>


        <div class="st-panel">

            <h2>الجهاز الحالي</h2>

            <p class="st-muted">
                ${Student.escape(navigator.userAgent)}
            </p>

            <span class="st-badge warning">
                عرض معلومات الجهاز فقط
            </span>

            <p class="st-muted">
                ربط الحساب بجهاز واحد يحتاج سياسة تحقق
                من جهة الخادم؛ لا يمكن ضمان منع كل الأجهزة
                الأخرى بمجرد قراءة معلومات المتصفح.
            </p>

        </div>

    `;


    document.getElementById(
        "stPasswordForm"
    ).addEventListener("submit", async event => {

        event.preventDefault();

        const password = new FormData(
            event.currentTarget
        ).get("password");

        try {

            if (!window.EICA_CHANGE_PASSWORD) {
                throw new Error("خدمة تغيير كلمة المرور غير متاحة.");
            }

            await window.EICA_CHANGE_PASSWORD(password);

            Student.toast(
                "تم تغيير كلمة المرور.",
                "success"
            );

            event.currentTarget.reset();

        } catch (error) {

            Student.toast(
                error.message,
                "error"
            );

        }

    });

}


/* =========================================================
   30. SUPPORT PAGE
   ========================================================= */

async function renderSupport() {

    setPageTitle("الدعم الفني");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-panel">

            <h2>تواصل مع الدعم الفني</h2>

            <p class="st-muted">
                اكتب استفسارك وسيتم إرساله إلى إدارة الأكاديمية.
            </p>

            <form id="stSupportForm" class="st-form">

                <div class="st-field">
                    <label>نوع الطلب</label>

                    <select name="category" required>
                        <option value="technical">مشكلة تقنية</option>
                        <option value="course">استفسار عن كورس</option>
                        <option value="account">مشكلة في الحساب</option>
                        <option value="other">طلب آخر</option>
                    </select>
                </div>

                <div class="st-field">
                    <label>عنوان الرسالة</label>

                    <input
                        name="title"
                        required
                        maxlength="100"
                    >
                </div>

                <div class="st-field full">
                    <label>تفاصيل الرسالة</label>

                    <textarea
                        name="message"
                        required
                        maxlength="2000">
                    </textarea>
                </div>

                <div class="st-field full">

                    <button class="st-btn" type="submit">
                        إرسال الطلب
                    </button>

                </div>

            </form>

        </div>

    `;


    document.getElementById(
        "stSupportForm"
    ).addEventListener("submit", async event => {

        event.preventDefault();

        const data = new FormData(
            event.currentTarget
        );

        try {

            await Student.add(
                `platform/support/${Student.uid()}`,
                {
                    studentName: S.profile.name || "",
                    email: auth.currentUser?.email || "",
                    category: data.get("category"),
                    title: data.get("title"),
                    message: data.get("message"),
                    status: "open"
                }
            );

            Student.toast(
                "تم إرسال طلبك بنجاح.",
                "success"
            );

            event.currentTarget.reset();

            await Student.log("support_request_sent");

        } catch (error) {

            console.error(error);

            Student.toast(
                "تعذر إرسال الطلب. تحقق من صلاحيات قاعدة البيانات.",
                "error"
            );

        }

    });

}


/* =========================================================
   31. SETTINGS PAGE
   ========================================================= */

async function renderSettings() {

    setPageTitle("الإعدادات");

    const light = document.getElementById(
        "eicaStudentApp"
    ).classList.contains("light");

    document.getElementById(
        "eicaStudentContent"
    ).innerHTML = `

        <div class="st-panel">

            <h2>إعدادات المنصة</h2>

            <div class="st-lesson">

                <div>
                    <strong>المظهر</strong>
                    <p class="st-muted">
                        التبديل بين الوضع الليلي والنهاري.
                    </p>
                </div>

                <button
                    class="st-btn"
                    id="stSettingsTheme">
                    ${light ? "الوضع الليلي" : "الوضع النهاري"}
                </button>

            </div>

            <div class="st-lesson">

                <div>
                    <strong>تحديث البيانات</strong>
                    <p class="st-muted">
                        إعادة تحميل بيانات حسابك.
                    </p>
                </div>

                <button
                    class="st-btn secondary"
                    id="stRefreshData">
                    تحديث
                </button>

            </div>

        </div>

    `;


    document.getElementById(
        "stSettingsTheme"
    ).addEventListener("click", toggleTheme);


    document.getElementById(
        "stRefreshData"
    ).addEventListener("click", async () => {

        await refreshDashboard();

        Student.toast(
            "تم تحديث البيانات.",
            "success"
        );

    });

}


/* =========================================================
   32. NAVIGATION
   ========================================================= */

function setPageTitle(title) {

    document.getElementById(
        "stPageTitle"
    ).textContent = title;

}


function bindPageNavigation() {

    document.querySelectorAll(
        "#eicaStudentContent [data-go]"
    ).forEach(button => {

        button.addEventListener("click", () => {
            navigate(button.dataset.go);
        });

    });


    document.querySelectorAll(
        "#eicaStudentContent [data-open-course]"
    ).forEach(button => {

        button.addEventListener("click", () => {
            openCourse(button.dataset.openCourse);
        });

    });


    document.querySelectorAll(
        "#eicaStudentContent [data-open-lesson]"
    ).forEach(button => {

        button.addEventListener("click", () => {
            openLesson(button.dataset.openLesson);
        });

    });


    document.querySelectorAll(
        "#eicaStudentContent [data-exam]"
    ).forEach(button => {

        button.addEventListener("click", () => {
            startExam(button.dataset.exam);
        });

    });


    document.querySelectorAll(
        "#eicaStudentContent [data-read-notification]"
    ).forEach(button => {

        button.addEventListener("click", () => {
            markNotificationRead(
                button.dataset.readNotification
            );
        });

    });

}


/* =========================================================
   33. NAVIGATION ROUTER
   ========================================================= */

async function navigate(page) {

    S.currentSection = page;

    document.querySelectorAll(
        "#eicaStudentApp [data-page]"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });

    try {

        switch (page) {

            case "dashboard":
                await renderDashboard();
                break;

            case "courses":
                await renderCourses();
                break;

            case "exams":
                await renderExams();
                break;

            case "results":
                await renderResults();
                break;

            case "certificates":
                await renderCertificates();
                break;

            case "notifications":
                await renderNotifications();
                break;

            case "profile":
                await renderProfile();
                break;

            case "activity":
                await renderActivity();
                break;

            case "security":
                await renderSecurity();
                break;

            case "support":
                await renderSupport();
                break;

            case "settings":
                await renderSettings();
                break;

            default:
                await renderDashboard();

        }

    } catch (error) {

        console.error("Student Navigation Error:", error);

        Student.toast(
            error.message || "حدث خطأ أثناء تحميل القسم.",
            "error"
        );

    }

}


/* =========================================================
   34. REFRESH HEADER
   ========================================================= */

async function refreshHeader() {

    const profile = S.profile || {};

    const name = profile.name ||
        auth.currentUser?.displayName ||
        "الطالب";

    const photo = profile.photoURL ||
        auth.currentUser?.photoURL ||
        "https://placehold.co/100x100/10233b/22d3ee?text=EICA";

    document.getElementById(
        "stTopName"
    ).textContent = name;

    document.getElementById(
        "stTopAvatar"
    ).src = photo;

}


/* =========================================================
   35. OPEN DASHBOARD
   ========================================================= */

async function openStudentDashboard() {

    const user = auth.currentUser;

    if (!user) {
        Student.toast("سجل دخولك أولًا.", "error");
        return;
    }

    if (window.EICA.currentRole !== "student") {
        Student.toast("هذه اللوحة مخصصة للطلاب فقط.", "error");
        return;
    }

    createDashboard();

    const app = document.getElementById(
        "eicaStudentApp"
    );

    app.classList.add("active");

    loadTheme();

    try {

        await loadProfile();

        await refreshHeader();

        if (S.profile.status !== "active") {

            setPageTitle("حالة الحساب");

            document.getElementById(
                "eicaStudentContent"
            ).innerHTML = `

                <div class="st-empty">

                    <h2>حسابك في انتظار التفعيل</h2>

                    <p>
                        تم إنشاء حسابك بنجاح.
                        ستتمكن من الوصول إلى الكورسات
                        بعد موافقة إدارة الأكاديمية.
                    </p>

                    <span class="st-badge warning">
                        ${Student.escape(S.profile.status || "pending")}
                    </span>

                </div>

            `;

            return;

        }

        await Student.log("student_dashboard_opened");

        await navigate("dashboard");

    } catch (error) {

        console.error(error);

        Student.toast(
            error.message || "تعذر فتح لوحة الطالب.",
            "error"
        );

    }

}


/* =========================================================
   36. CLOSE DASHBOARD
   ========================================================= */

function closeStudentDashboard() {

    const app = document.getElementById(
        "eicaStudentApp"
    );

    if (app) {
        app.classList.remove("active");
    }

}


/* =========================================================
   37. REFRESH DASHBOARD
   ========================================================= */

async function refreshDashboard() {

    if (!auth.currentUser) return;

    await loadProfile();

    await refreshHeader();

    await navigate(S.currentSection || "dashboard");

}


/* =========================================================
   38. LOGOUT
   ========================================================= */

async function logout() {

    const confirmed = confirm(
        "هل أنت متأكد أنك تريد تسجيل الخروج؟"
    );

    if (!confirmed) return;

    try {

        if (typeof window.EICA_AUTH_LOGOUT === "function") {

            await window.EICA_AUTH_LOGOUT();

        }

        closeStudentDashboard();

        Student.toast(
            "تم تسجيل الخروج بنجاح.",
            "success"
        );

    } catch (error) {

        Student.toast(
            error.message || "تعذر تسجيل الخروج.",
            "error"
        );

    }

}


/* =========================================================
   39. AUTH STATE INTEGRATION
   ========================================================= */

let authListenerStarted = false;

function initializeStudentAuth() {

    if (authListenerStarted) return;

    authListenerStarted = true;

    auth.onAuthStateChanged(auth, async user => {

        if (!user) {

            closeStudentDashboard();

            return;

        }

        if (window.EICA.currentRole === "student") {

            await openStudentDashboard();

        }

    });

}


/* =========================================================
   40. PUBLIC FUNCTIONS
   ========================================================= */

window.EICA_OPEN_STUDENT_DASHBOARD =
    openStudentDashboard;

window.EICA_CLOSE_STUDENT_DASHBOARD =
    closeStudentDashboard;

window.EICA_REFRESH_STUDENT_DASHBOARD =
    refreshDashboard;

window.EICA_STUDENT_NAVIGATE =
    navigate;

window.EICA_STUDENT_OPEN_COURSE =
    openCourse;

window.EICA_STUDENT_OPEN_LESSON =
    openLesson;


/* =========================================================
   41. START MODULE
   ========================================================= */

initializeStudentAuth();

S.initialized = true;

console.log(
    "%c EICA COMPLETE STUDENT DASHBOARD ",
    "background:#071a35;color:#00e5ff;padding:12px;font-weight:bold;border-radius:6px;"
);

console.log(
    "All-in-One Student Dashboard Loaded."
);
