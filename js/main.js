here/* =========================================================
   EICA - EGYPT INTERNATIONAL COMPUTER ACADEMY
   MAIN JAVASCRIPT
   ========================================================= */

"use strict";

/* =========================================================
   1. GLOBAL ELEMENTS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  loadingScreen: $("#loadingScreen"),

  sidebar: $("#sidebar"),
  menuToggle: $("#menuToggle"),
  closeSidebar: $("#closeSidebar"),
  sidebarOverlay: $("#sidebarOverlay"),

  settingsToggle: $("#settingsToggle"),
  settingsMenu: $("#settingsMenu"),
  accountToggle: $("#accountToggle"),
  accountMenu: $("#accountMenu"),

  themeToggle: $("#themeToggle"),
  themeIcon: $("#themeIcon"),
  settingsTheme: $("#settingsTheme"),

  loginModal: $("#loginModal"),
  registerModal: $("#registerModal"),
  closeLoginModal: $("#closeLoginModal"),
  closeRegisterModal: $("#closeRegisterModal"),

  loginForm: $("#loginForm"),
  loginType: $("#loginType"),
  loginTitle: $("#loginTitle"),
  loginDescription: $("#loginDescription"),
  loginIdentifier: $("#loginIdentifier"),
  loginPassword: $("#loginPassword"),
  loginStatus: $("#loginStatus"),
  loginSubmit: $("#loginSubmit"),

  registerForm: $("#registerForm"),
  registerStatus: $("#registerStatus"),

  backToTop: $("#backToTop")
};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const EICA = {
  currentUser: null,
  currentRole: null,
  isAuthenticated: false,
  theme: localStorage.getItem("eica-theme") || "dark"
};


/* =========================================================
   3. HELPER FUNCTIONS
   ========================================================= */

function showElement(element) {
  if (element) {
    element.classList.add("open");
  }
}

function hideElement(element) {
  if (element) {
    element.classList.remove("open");
  }
}

function setStatus(element, message, type = "error") {
  if (!element) return;

  element.textContent = message;
  element.classList.remove("success");

  if (type === "success") {
    element.classList.add("success");
  }
}

function clearStatus(element) {
  if (!element) return;

  element.textContent = "";
  element.classList.remove("success");
}

function closeAllMenus() {
  hideElement(elements.settingsMenu);
  hideElement(elements.accountMenu);
}


/* =========================================================
   4. LOADING SCREEN
   ========================================================= */

window.addEventListener("load", () => {

  setTimeout(() => {

    if (elements.loadingScreen) {
      elements.loadingScreen.classList.add("loaded");
    }

  }, 900);

});


/* =========================================================
   5. SIDEBAR
   ========================================================= */

function openSidebar() {

  showElement(elements.sidebar);
  showElement(elements.sidebarOverlay);

  document.body.style.overflow = "hidden";

}

function closeSidebar() {

  hideElement(elements.sidebar);
  hideElement(elements.sidebarOverlay);

  document.body.style.overflow = "";

}

elements.menuToggle?.addEventListener("click", openSidebar);

elements.closeSidebar?.addEventListener("click", closeSidebar);

elements.sidebarOverlay?.addEventListener("click", closeSidebar);

$$(".side-navigation a").forEach(link => {

  link.addEventListener("click", () => {

    $$(".nav-link").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    closeSidebar();

  });

});


/* =========================================================
   6. SETTINGS MENU
   ========================================================= */

elements.settingsToggle?.addEventListener("click", (event) => {

  event.stopPropagation();

  hideElement(elements.accountMenu);

  elements.settingsMenu?.classList.toggle("open");

});


/* =========================================================
   7. ACCOUNT MENU
   ========================================================= */

elements.accountToggle?.addEventListener("click", (event) => {

  event.stopPropagation();

  hideElement(elements.settingsMenu);

  elements.accountMenu?.classList.toggle("open");

});


document.addEventListener("click", (event) => {

  const clickedInsideSettings =
    elements.settingsMenu?.contains(event.target) ||
    elements.settingsToggle?.contains(event.target);

  const clickedInsideAccount =
    elements.accountMenu?.contains(event.target) ||
    elements.accountToggle?.contains(event.target);

  if (!clickedInsideSettings) {
    hideElement(elements.settingsMenu);
  }

  if (!clickedInsideAccount) {
    hideElement(elements.accountMenu);
  }

});


/* =========================================================
   8. DARK / LIGHT THEME
   ========================================================= */

function applyTheme(theme) {

  EICA.theme = theme;

  document.body.classList.toggle(
    "light-theme",
    theme === "light"
  );

  if (elements.themeIcon) {

    elements.themeIcon.textContent =
      theme === "light" ? "☀" : "☾";

  }

  localStorage.setItem("eica-theme", theme);

}

function toggleTheme() {

  const newTheme =
    EICA.theme === "dark" ? "light" : "dark";

  applyTheme(newTheme);

}

elements.themeToggle?.addEventListener("click", toggleTheme);

elements.settingsTheme?.addEventListener("click", () => {

  toggleTheme();

  hideElement(elements.settingsMenu);

});

applyTheme(EICA.theme);


/* =========================================================
   9. LOGIN MODAL
   ========================================================= */

function openLoginModal(type = "student") {

  if (!elements.loginModal) return;

  closeAllMenus();
  closeSidebar();

  const isAdmin = type === "admin";

  if (elements.loginType) {
    elements.loginType.value = type;
  }

  if (elements.loginTitle) {

    elements.loginTitle.textContent =
      isAdmin ? "دخول الإدارة" : "دخول الطلاب";

  }

  if (elements.loginDescription) {

    elements.loginDescription.textContent =
      isAdmin
        ? "سجّل الدخول باستخدام بيانات حساب الإدارة."
        : "أدخل بيانات حسابك الطلابي للمتابعة.";

  }

  if (elements.loginIdentifier) {

    elements.loginIdentifier.placeholder =
      isAdmin
        ? "اسم المستخدم أو البريد الإلكتروني"
        : "البريد الإلكتروني أو اسم المستخدم";

  }

  clearStatus(elements.loginStatus);

  showElement(elements.loginModal);

  document.body.style.overflow = "hidden";

  setTimeout(() => {
    elements.loginIdentifier?.focus();
  }, 250);

}


function closeLoginModal() {

  hideElement(elements.loginModal);

  document.body.style.overflow = "";

  clearStatus(elements.loginStatus);

}


elements.closeLoginModal?.addEventListener(
  "click",
  closeLoginModal
);

elements.loginModal?.addEventListener("click", (event) => {

  if (event.target === elements.loginModal) {
    closeLoginModal();
  }

});


/* =========================================================
   10. OPEN LOGIN BUTTONS
   ========================================================= */

const studentLoginButtons = [
  "#studentLoginNav",
  "#accountStudentLogin",
  "#heroStudentLogin",
  "#studentAccess",
  "#footerStudentLogin"
];

const adminLoginButtons = [
  "#adminLoginNav",
  "#accountAdminLogin",
  "#adminAccess",
  "#footerAdminLogin"
];

studentLoginButtons.forEach(selector => {

  $(selector)?.addEventListener("click", () => {

    openLoginModal("student");

  });

});

adminLoginButtons.forEach(selector => {

  $(selector)?.addEventListener("click", () => {

    openLoginModal("admin");

  });

});

$("#headerLogin")?.addEventListener("click", () => {

  openLoginModal("student");

});


/* =========================================================
   11. REGISTRATION MODAL
   ========================================================= */

function openRegisterModal() {

  closeAllMenus();

  showElement(elements.registerModal);

  document.body.style.overflow = "hidden";

}

function closeRegisterModal() {

  hideElement(elements.registerModal);

  document.body.style.overflow = "";

  clearStatus(elements.registerStatus);

}

elements.closeRegisterModal?.addEventListener(
  "click",
  closeRegisterModal
);

elements.registerModal?.addEventListener("click", (event) => {

  if (event.target === elements.registerModal) {
    closeRegisterModal();
  }

});


/* =========================================================
   12. CLOSE MODALS WITH ESCAPE
   ========================================================= */

document.addEventListener("keydown", (event) => {

  if (event.key === "Escape") {

    closeLoginModal();
    closeRegisterModal();
    closeSidebar();
    closeAllMenus();

  }

});


/* =========================================================
   13. PASSWORD VISIBILITY
   ========================================================= */

function createPasswordToggle(input) {

  if (!input || input.dataset.toggleCreated) return;

  input.dataset.toggleCreated = "true";

  const wrapper = input.parentElement;

  if (!wrapper) return;

  wrapper.style.position = "relative";

  const button = document.createElement("button");

  button.type = "button";
  button.textContent = "◉";

  button.setAttribute("aria-label", "إظهار أو إخفاء كلمة المرور");

  button.style.position = "absolute";
  button.style.left = "13px";
  button.style.top = "50%";
  button.style.transform = "translateY(-50%)";
  button.style.background = "transparent";
  button.style.border = "none";
  button.style.color = "#42bfff";
  button.style.cursor = "pointer";
  button.style.fontSize = "17px";

  input.style.paddingLeft = "42px";

  button.addEventListener("click", () => {

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";

    button.textContent = isPassword ? "◎" : "◉";

  });

  wrapper.appendChild(button);

}

createPasswordToggle($("#loginPassword"));
createPasswordToggle($("#registerPassword"));


/* =========================================================
   14. LOGIN FORM CONNECTION
   ========================================================= */

/*
  مهم:
  تسجيل الدخول الحقيقي سيتم ربطه بملف auth.js.
  هذا الملف لا ينشئ صلاحيات الإدارة بنفسه.
*/

elements.loginForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  const identifier =
    elements.loginIdentifier?.value.trim();

  const password =
    elements.loginPassword?.value;

  const loginType =
    elements.loginType?.value || "student";

  if (!identifier || !password) {

    setStatus(
      elements.loginStatus,
      "من فضلك أدخل اسم المستخدم وكلمة المرور."
    );

    return;

  }

  if (elements.loginSubmit) {

    elements.loginSubmit.disabled = true;

    elements.loginSubmit.querySelector("span").textContent =
      "جارٍ التحقق...";

  }

  clearStatus(elements.loginStatus);

  try {

    /*
      الدالة EICA_AUTH_LOGIN سيتم تعريفها في auth.js.
      يتم استدعاؤها بعد ربط Firebase.
    */

    if (typeof window.EICA_AUTH_LOGIN !== "function") {

      throw new Error(
        "AUTH_NOT_READY"
      );

    }

    const result = await window.EICA_AUTH_LOGIN({
      identifier,
      password,
      loginType
    });

    if (!result || !result.success) {

      throw new Error(
        result?.message || "بيانات الدخول غير صحيحة."
      );

    }

    closeLoginModal();

    showToast("تم تسجيل الدخول بنجاح", "success");

  } catch (error) {

    console.error("EICA Login Error:", error);

    let message = "تعذر تسجيل الدخول. تحقق من بياناتك.";

    if (error.message === "AUTH_NOT_READY") {

      message = "نظام تسجيل الدخول لم يتم ربطه بعد.";

    } else if (error.code === "auth/invalid-credential") {

      message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

    } else if (error.code === "auth/user-disabled") {

      message = "هذا الحساب موقوف حالياً.";

    } else if (error.code === "auth/too-many-requests") {

      message = "محاولات كثيرة. حاول مرة أخرى لاحقاً.";

    } else if (
      error.message &&
      error.message !== "AUTH_NOT_READY"
    ) {

      message = error.message;

    }

    setStatus(
      elements.loginStatus,
      message
    );

  } finally {

    if (elements.loginSubmit) {

      elements.loginSubmit.disabled = false;

      elements.loginSubmit.querySelector("span").textContent =
        "دخول إلى المنصة";

    }

  }

});


/* =========================================================
   15. STUDENT REGISTRATION CONNECTION
   ========================================================= */

elements.registerForm?.addEventListener("submit", async (event) => {

  event.preventDefault();

  const data = {

    name: $("#registerName")?.value.trim(),

    email: $("#registerEmail")?.value.trim(),

    phone: $("#registerPhone")?.value.trim(),

    password: $("#registerPassword")?.value

  };

  if (
    !data.name ||
    !data.email ||
    !data.phone ||
    !data.password
  ) {

    setStatus(
      elements.registerStatus,
      "يرجى استكمال جميع البيانات."
    );

    return;

  }

  if (data.password.length < 8) {

    setStatus(
      elements.registerStatus,
      "كلمة المرور يجب ألا تقل عن 8 أحرف."
    );

    return;

  }

  try {

    if (typeof window.EICA_STUDENT_REGISTER !== "function") {

      throw new Error("REGISTER_NOT_READY");

    }

    const result =
      await window.EICA_STUDENT_REGISTER(data);

    if (!result || !result.success) {

      throw new Error(
        result?.message || "تعذر إرسال طلب التسجيل."
      );

    }

    setStatus(
      elements.registerStatus,
      "تم إرسال طلب التسجيل بنجاح.",
      "success"
    );

    elements.registerForm.reset();

  } catch (error) {

    console.error("EICA Registration Error:", error);

    const message =
      error.message === "REGISTER_NOT_READY"
        ? "خدمة التسجيل لم يتم ربطها بعد."
        : error.message;

    setStatus(
      elements.registerStatus,
      message
    );

  }

});


/* =========================================================
   16. FORGOT PASSWORD
   ========================================================= */

$("#forgotPassword")?.addEventListener("click", async () => {

  const email =
    elements.loginIdentifier?.value.trim();

  if (!email || !email.includes("@")) {

    setStatus(
      elements.loginStatus,
      "أدخل بريدك الإلكتروني أولاً لاستعادة كلمة المرور."
    );

    return;

  }

  if (typeof window.EICA_RESET_PASSWORD !== "function") {

    setStatus(
      elements.loginStatus,
      "خدمة استعادة كلمة المرور لم يتم ربطها بعد."
    );

    return;

  }

  try {

    await window.EICA_RESET_PASSWORD(email);

    setStatus(
      elements.loginStatus,
      "تم إرسال رابط استعادة كلمة المرور إلى بريدك.",
      "success"
    );

  } catch (error) {

    setStatus(
      elements.loginStatus,
      "تعذر إرسال رابط الاستعادة. تحقق من البريد الإلكتروني."
    );

  }

});


/* =========================================================
   17. USER SESSION DISPLAY
   ========================================================= */

function updateAccountUI(user) {

  EICA.currentUser = user || null;
  EICA.isAuthenticated = !!user;

  const name =
    user?.displayName ||
    user?.name ||
    user?.email ||
    "زائر الأكاديمية";

  const role =
    user?.role || "غير مسجل الدخول";

  $("#accountName") &&
    ($("#accountName").textContent = name);

  $("#accountRole") &&
    ($("#accountRole").textContent = role);

  const sidebarName =
    $("#sidebarUser .sidebar-user-info strong");

  const sidebarDescription =
    $("#sidebarUser .sidebar-user-info small");

  if (sidebarName) {
    sidebarName.textContent = name;
  }

  if (sidebarDescription) {
    sidebarDescription.textContent = role;
  }

  $("#logoutNav")?.classList.toggle(
    "hidden",
    !user
  );

  $("#accountLogout")?.classList.toggle(
    "hidden",
    !user
  );

  if (user) {

    $("#headerLogin")?.classList.add("hidden");

  } else {

    $("#headerLogin")?.classList.remove("hidden");

  }

}

window.EICA_UPDATE_ACCOUNT_UI = updateAccountUI;


/* =========================================================
   18. LOGOUT
   ========================================================= */

async function logoutUser() {

  try {

    if (typeof window.EICA_AUTH_LOGOUT !== "function") {

      throw new Error("LOGOUT_NOT_READY");

    }

    await window.EICA_AUTH_LOGOUT();

    updateAccountUI(null);

    showToast("تم تسجيل الخروج", "success");

  } catch (error) {

    console.error("Logout Error:", error);

    showToast(
      "تعذر تسجيل الخروج حالياً",
      "error"
    );

  }

}

$("#logoutNav")?.addEventListener("click", logoutUser);

$("#accountLogout")?.addEventListener("click", logoutUser);


/* =========================================================
   19. TOAST NOTIFICATIONS
   ========================================================= */

function showToast(message, type = "info") {

  let container = $("#eicaToastContainer");

  if (!container) {

    container = document.createElement("div");

    container.id = "eicaToastContainer";

    container.style.position = "fixed";
    container.style.top = "100px";
    container.style.left = "20px";
    container.style.zIndex = "5000";

    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";

    document.body.appendChild(container);

  }

  const toast = document.createElement("div");

  toast.textContent = message;

  toast.style.minWidth = "230px";
  toast.style.maxWidth = "320px";
  toast.style.padding = "14px 18px";
  toast.style.borderRadius = "12px";
  toast.style.fontSize = "11px";
  toast.style.fontWeight = "700";
  toast.style.color = "#fff";
  toast.style.background =
    type === "success"
      ? "linear-gradient(100deg,#087d5a,#00b88a)"
      : type === "error"
        ? "linear-gradient(100deg,#a32c40,#dc5366)"
        : "linear-gradient(100deg,#087fff,#00a9d6)";

  toast.style.boxShadow = "0 10px 35px rgba(0,0,0,.25)";

  toast.style.opacity = "0";
  toast.style.transform = "translateY(-10px)";
  toast.style.transition = "all .3s ease";

  container.appendChild(toast);

  requestAnimationFrame(() => {

    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

  });

  setTimeout(() => {

    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";

    setTimeout(() => toast.remove(), 350);

  }, 3500);

}

window.EICA_SHOW_TOAST = showToast;


/* =========================================================
   20. BACK TO TOP
   ========================================================= */

window.addEventListener("scroll", () => {

  const shouldShow = window.scrollY > 400;

  elements.backToTop?.classList.toggle(
    "show",
    shouldShow
  );

});

elements.backToTop?.addEventListener("click", () => {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});


/* =========================================================
   21. SCROLL ACTIVE NAVIGATION
   ========================================================= */

const sections = $$("main section[id]");

if ("IntersectionObserver" in window) {

  const sectionObserver = new IntersectionObserver(
    (entries) => {

      entries.forEach(entry => {

        if (!entry.isIntersecting) return;

        const id = entry.target.id;

        $$(".side-navigation a").forEach(link => {

          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${id}`
          );

        });

      });

    },
    {
      threshold: 0.35
    }
  );

  sections.forEach(section => {

    sectionObserver.observe(section);

  });

}


/* =========================================================
   22. SCROLL REVEAL ANIMATIONS
   ========================================================= */

const revealElements = $$(
  ".about-card, .vision-card, .feature-card, .access-card"
);

if ("IntersectionObserver" in window) {

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {

      entries.forEach(entry => {

        if (!entry.isIntersecting) return;

        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";

        observer.unobserve(entry.target);

      });

    },
    {
      threshold: 0.12
    }
  );

  revealElements.forEach(element => {

    element.style.opacity = "0";
    element.style.transform = "translateY(25px)";
    element.style.transition =
      "opacity .7s ease, transform .7s ease";

    revealObserver.observe(element);

  });

}


/* =========================================================
   23. PARTICLE BACKGROUND
   ========================================================= */

const particleCanvas = $("#particles");

if (particleCanvas) {

  const ctx = particleCanvas.getContext("2d");

  let particles = [];

  let canvasWidth = 0;
  let canvasHeight = 0;

  function resizeCanvas() {

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    particleCanvas.width =
      canvasWidth * pixelRatio;

    particleCanvas.height =
      canvasHeight * pixelRatio;

    particleCanvas.style.width =
      `${canvasWidth}px`;

    particleCanvas.style.height =
      `${canvasHeight}px`;

    ctx.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0
    );

    createParticles();

  }

  function createParticles() {

    const count = Math.min(
      Math.floor(canvasWidth / 13),
      100
    );

    particles = [];

    for (let i = 0; i < count; i++) {

      particles.push({

        x: Math.random() * canvasWidth,

        y: Math.random() * canvasHeight,

        size: Math.random() * 1.7 + 0.4,

        speedX: (Math.random() - 0.5) * 0.3,

        speedY: (Math.random() - 0.5) * 0.3,

        opacity: Math.random() * 0.55 + 0.1

      });

    }

  }

  function drawParticles() {

    ctx.clearRect(
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    particles.forEach(particle => {

      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < 0 || particle.x > canvasWidth) {
        particle.speedX *= -1;
      }

      if (particle.y < 0 || particle.y > canvasHeight) {
        particle.speedY *= -1;
      }

      ctx.beginPath();

      ctx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        `rgba(50,190,255,${particle.opacity})`;

      ctx.fill();

    });

    for (let i = 0; i < particles.length; i++) {

      for (let j = i + 1; j < particles.length; j++) {

        const a = particles[i];
        const b = particles[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 110) {

          ctx.beginPath();

          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);

          ctx.strokeStyle =
            `rgba(30,160,255,${0.08 * (1 - distance / 110)})`;

          ctx.lineWidth = 0.7;

          ctx.stroke();

        }

      }

    }

    requestAnimationFrame(drawParticles);

  }

  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);

  drawParticles();

}


/* =========================================================
   24. SETTINGS HELP
   ========================================================= */

$("#settingsHelp")?.addEventListener("click", () => {

  hideElement(elements.settingsMenu);

  showToast(
    "للمساعدة والدعم تواصل مع إدارة الأكاديمية.",
    "info"
  );

});


/* =========================================================
   25. LANGUAGE PLACEHOLDER
   ========================================================= */

$("#settingsLanguage")?.addEventListener("click", () => {

  showToast(
    "الواجهة الحالية باللغة العربية.",
    "info"
  );

});


/* =========================================================
   26. INITIAL APPLICATION STATE
   ========================================================= */

updateAccountUI(null);

console.log(
  "%c EICA DIGITAL SYSTEM ",
  "background:#087fff;color:#fff;font-size:18px;font-weight:bold;padding:10px;"
);

console.log(
  "%c THE FUTURE OF TECHNOLOGY STARTS HERE ",
  "color:#00dfff;font-size:11px;font-weight:bold;"
);


/* =========================================================
   END OF MAIN.JS
   ========================================================= */
