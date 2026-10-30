/* =========================================================
   EICA - EGYPT INTERNATIONAL COMPUTER ACADEMY
   MAIN JAVASCRIPT - STABLE VERSION
   ========================================================= */

"use strict";

/* =========================================================
   1. GLOBAL HELPERS
   ========================================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

const safeStorage = {
  get(key, fallback = null) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch (error) {
      console.warn("LocalStorage read error:", error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("LocalStorage write error:", error);
    }
  }
};

/* =========================================================
   2. DOM ELEMENTS
   ========================================================= */

const elements = {
  loadingScreen: $("#loadingScreen") || $(".loading-screen"),

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
   3. APPLICATION STATE
   ========================================================= */

const EICA = {
  currentUser: null,
  currentRole: null,
  isAuthenticated: false,
  theme: safeStorage.get("eica-theme", "dark"),
  toastContainer: null,
  particlesAnimation: null
};

if (!["dark", "light"].includes(EICA.theme)) {
  EICA.theme = "dark";
}

/* =========================================================
   4. GENERAL HELPERS
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

  element.textContent = message || "";
  element.classList.toggle("success", type === "success");
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

function isAnyOverlayOpen() {
  return Boolean(
    elements.sidebar?.classList.contains("open") ||
    elements.loginModal?.classList.contains("open") ||
    elements.registerModal?.classList.contains("open")
  );
}

function syncBodyScroll() {
  document.body.style.overflow =
    isAnyOverlayOpen() ? "hidden" : "";
}

function safeFocus(element) {
  if (!element) return;

  try {
    element.focus();
  } catch (error) {
    console.warn("Focus error:", error);
  }
}

/* =========================================================
   5. LOADING SCREEN - FIXED
   ========================================================= */

let loadingScreenHidden = false;

function hideLoadingScreen() {
  const screen =
    elements.loadingScreen ||
    $("#loadingScreen") ||
    $(".loading-screen");

  if (!screen || loadingScreenHidden) return;

  loadingScreenHidden = true;

  screen.classList.add("loaded");

  // حماية إضافية إذا لم يعمل انتقال CSS
  setTimeout(() => {
    screen.style.display = "none";
    screen.setAttribute("aria-hidden", "true");
  }, 1400);
}

// إذا كانت الصفحة محملة بالفعل
if (document.readyState === "complete") {
  hideLoadingScreen();
} else {
  window.addEventListener("load", hideLoadingScreen, {
    once: true
  });
}

// عدم ترك المقدمة معلقة لأي سبب
setTimeout(hideLoadingScreen, 5000);

/* =========================================================
   6. SIDEBAR
   ========================================================= */

function openSidebar() {
  if (!elements.sidebar) return;

  closeAllMenus();

  showElement(elements.sidebar);
  showElement(elements.sidebarOverlay);

  syncBodyScroll();
}

function closeSidebar() {
  hideElement(elements.sidebar);
  hideElement(elements.sidebarOverlay);

  syncBodyScroll();
}

elements.menuToggle?.addEventListener("click", openSidebar);

elements.closeSidebar?.addEventListener(
  "click",
  closeSidebar
);

elements.sidebarOverlay?.addEventListener(
  "click",
  closeSidebar
);

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
   7. SETTINGS MENU
   ========================================================= */

elements.settingsToggle?.addEventListener("click", event => {
  event.stopPropagation();

  hideElement(elements.accountMenu);

  elements.settingsMenu?.classList.toggle("open");
});

/* =========================================================
   8. ACCOUNT MENU
   ========================================================= */

elements.accountToggle?.addEventListener("click", event => {
  event.stopPropagation();

  hideElement(elements.settingsMenu);

  elements.accountMenu?.classList.toggle("open");
});

document.addEventListener("click", event => {
  const insideSettings =
    elements.settingsMenu?.contains(event.target) ||
    elements.settingsToggle?.contains(event.target);

  const insideAccount =
    elements.accountMenu?.contains(event.target) ||
    elements.accountToggle?.contains(event.target);

  if (!insideSettings) {
    hideElement(elements.settingsMenu);
  }

  if (!insideAccount) {
    hideElement(elements.accountMenu);
  }
});

/* =========================================================
   9. DARK / LIGHT THEME
   ========================================================= */

function applyTheme(theme) {
  if (!["dark", "light"].includes(theme)) {
    theme = "dark";
  }

  EICA.theme = theme;

  document.body.classList.toggle(
    "light-theme",
    theme === "light"
  );

  if (elements.themeIcon) {
    elements.themeIcon.textContent =
      theme === "light" ? "☀" : "☾";
  }

  if (elements.themeToggle) {
    elements.themeToggle.setAttribute(
      "aria-label",
      theme === "light"
        ? "تفعيل الوضع الليلي"
        : "تفعيل الوضع النهاري"
    );
  }

  safeStorage.set("eica-theme", theme);
}

function toggleTheme() {
  applyTheme(
    EICA.theme === "dark" ? "light" : "dark"
  );
}

elements.themeToggle?.addEventListener(
  "click",
  toggleTheme
);

elements.settingsTheme?.addEventListener("click", () => {
  toggleTheme();
  hideElement(elements.settingsMenu);
});

applyTheme(EICA.theme);

/* =========================================================
   10. LOGIN MODAL
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

  syncBodyScroll();

  setTimeout(() => {
    safeFocus(elements.loginIdentifier);
  }, 250);
}

function closeLoginModal() {
  hideElement(elements.loginModal);

  clearStatus(elements.loginStatus);

  syncBodyScroll();
}

elements.closeLoginModal?.addEventListener(
  "click",
  closeLoginModal
);

elements.loginModal?.addEventListener("click", event => {
  if (event.target === elements.loginModal) {
    closeLoginModal();
  }
});

/* =========================================================
   11. LOGIN BUTTONS
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
   12. REGISTRATION MODAL
   ========================================================= */

function openRegisterModal() {
  if (!elements.registerModal) return;

  closeAllMenus();
  closeSidebar();

  clearStatus(elements.registerStatus);

  showElement(elements.registerModal);

  syncBodyScroll();
}

function closeRegisterModal() {
  hideElement(elements.registerModal);

  clearStatus(elements.registerStatus);

  syncBodyScroll();
}

elements.closeRegisterModal?.addEventListener(
  "click",
  closeRegisterModal
);

elements.registerModal?.addEventListener("click", event => {
  if (event.target === elements.registerModal) {
    closeRegisterModal();
  }
});

// أزرار فتح التسجيل إن وجدت في HTML
[
  "#openRegister",
  "#registerButton",
  "#studentRegister",
  "#accountRegister"
].forEach(selector => {
  $(selector)?.addEventListener("click", openRegisterModal);
});

/* =========================================================
   13. ESCAPE KEY
   ========================================================= */

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  closeLoginModal();
  closeRegisterModal();
  closeSidebar();
  closeAllMenus();
});

/* =========================================================
   14. PASSWORD VISIBILITY
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

  button.setAttribute(
    "aria-label",
    "إظهار أو إخفاء كلمة المرور"
  );

  button.style.position = "absolute";
  button.style.left = "13px";
  button.style.top = "50%";
  button.style.transform = "translateY(-50%)";
  button.style.background = "transparent";
  button.style.border = "none";
  button.style.color = "#42bfff";
  button.style.cursor = "pointer";
  button.style.fontSize = "17px";
  button.style.zIndex = "2";

  input.style.paddingLeft = "42px";

  button.addEventListener("click", () => {
    const show = input.type === "password";

    input.type = show ? "text" : "password";

    button.textContent = show ? "◎" : "◉";
  });

  wrapper.appendChild(button);
}

createPasswordToggle($("#loginPassword"));
createPasswordToggle($("#registerPassword"));

/* =========================================================
   15. LOGIN FORM
   ========================================================= */

elements.loginForm?.addEventListener(
  "submit",
  async event => {
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

    const submitButton = elements.loginSubmit;
    const submitText = $("span", submitButton);

    if (submitButton) {
      submitButton.disabled = true;

      if (submitText) {
        submitText.textContent = "جارٍ التحقق...";
      }
    }

    clearStatus(elements.loginStatus);

    try {
      if (typeof window.EICA_AUTH_LOGIN !== "function") {
        throw new Error("AUTH_NOT_READY");
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

      if (result.user) {
        updateAccountUI(result.user);
      }

      closeLoginModal();

      showToast(
        "تم تسجيل الدخول بنجاح",
        "success"
      );

    } catch (error) {
      console.error("EICA Login Error:", error);

      let message =
        "تعذر تسجيل الدخول. تحقق من بياناتك.";

      if (error.message === "AUTH_NOT_READY") {
        message =
          "نظام تسجيل الدخول لم يتم ربطه بعد.";

      } else if (error.code === "auth/invalid-credential") {
        message =
          "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

      } else if (error.code === "auth/user-disabled") {
        message =
          "هذا الحساب موقوف حالياً.";

      } else if (error.code === "auth/too-many-requests") {
        message =
          "محاولات كثيرة. حاول مرة أخرى لاحقاً.";

      } else if (error.code === "auth/network-request-failed") {
        message =
          "تعذر الاتصال بالإنترنت. تحقق من اتصالك.";

      } else if (
        error.message &&
        error.message !== "AUTH_NOT_READY"
      ) {
        message = error.message;
      }

      setStatus(elements.loginStatus, message);

    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        if (submitText) {
          submitText.textContent = "دخول إلى المنصة";
        }
      }
    }
  }
);

/* =========================================================
   16. STUDENT REGISTRATION
   ========================================================= */

elements.registerForm?.addEventListener(
  "submit",
  async event => {
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setStatus(
        elements.registerStatus,
        "من فضلك أدخل بريدًا إلكترونيًا صحيحًا."
      );
      return;
    }

    const submitButton =
      $('button[type="submit"]', elements.registerForm);

    if (submitButton) {
      submitButton.disabled = true;
    }

    clearStatus(elements.registerStatus);

    try {
      if (
        typeof window.EICA_STUDENT_REGISTER !== "function"
      ) {
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

      let message =
        "تعذر إرسال طلب التسجيل حالياً.";

      if (error.message === "REGISTER_NOT_READY") {
        message =
          "خدمة التسجيل لم يتم ربطها بعد.";
      } else if (error.message) {
        message = error.message;
      }

      setStatus(elements.registerStatus, message);

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }
);

/* =========================================================
   17. FORGOT PASSWORD
   ========================================================= */

$("#forgotPassword")?.addEventListener(
  "click",
  async () => {
    const email =
      elements.loginIdentifier?.value.trim();

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setStatus(
        elements.loginStatus,
        "أدخل بريدك الإلكتروني الصحيح أولاً."
      );
      return;
    }

    if (
      typeof window.EICA_RESET_PASSWORD !== "function"
    ) {
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
      console.error("Password Reset Error:", error);

      setStatus(
        elements.loginStatus,
        "تعذر إرسال رابط الاستعادة. تحقق من البريد الإلكتروني."
      );
    }
  }
);

/* =========================================================
   18. ACCOUNT UI
   ========================================================= */

function updateAccountUI(user) {
  EICA.currentUser = user || null;
  EICA.isAuthenticated = Boolean(user);

  EICA.currentRole = user?.role || null;

  const name =
    user?.displayName ||
    user?.name ||
    user?.email ||
    "زائر الأكاديمية";

  const role =
    user?.role || "غير مسجل الدخول";

  const accountName = $("#accountName");
  const accountRole = $("#accountRole");

  const sidebarName =
    $("#sidebarUser .sidebar-user-info strong");

  const sidebarDescription =
    $("#sidebarUser .sidebar-user-info small");

  if (accountName) {
    accountName.textContent = name;
  }

  if (accountRole) {
    accountRole.textContent = role;
  }

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

  $("#headerLogin")?.classList.toggle(
    "hidden",
    Boolean(user)
  );
}

window.EICA_UPDATE_ACCOUNT_UI = updateAccountUI;

/* =========================================================
   19. LOGOUT
   ========================================================= */

async function logoutUser() {
  try {
    if (typeof window.EICA_AUTH_LOGOUT !== "function") {
      throw new Error("LOGOUT_NOT_READY");
    }

    await window.EICA_AUTH_LOGOUT();

    updateAccountUI(null);

    showToast(
      "تم تسجيل الخروج",
      "success"
    );

  } catch (error) {
    console.error("Logout Error:", error);

    showToast(
      "تعذر تسجيل الخروج حالياً",
      "error"
    );
  }
}

$("#logoutNav")?.addEventListener(
  "click",
  logoutUser
);

$("#accountLogout")?.addEventListener(
  "click",
  logoutUser
);

/* =========================================================
   20. TOAST NOTIFICATIONS
   ========================================================= */

function showToast(message, type = "info") {
  let container = $("#eicaToastContainer");

  if (!container) {
    container = document.createElement("div");

    container.id = "eicaToastContainer";

    Object.assign(container.style, {
      position: "fixed",
      top: "100px",
      left: "20px",
      zIndex: "5000",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      pointerEvents: "none"
    });

    document.body.appendChild(container);
  }

  const toast = document.createElement("div");

  toast.textContent = String(message);

  Object.assign(toast.style, {
    minWidth: "230px",
    maxWidth: "320px",
    padding: "14px 18px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#fff",
    background:
      type === "success"
        ? "linear-gradient(100deg,#087d5a,#00b88a)"
        : type === "error"
          ? "linear-gradient(100deg,#a32c40,#dc5366)"
          : "linear-gradient(100deg,#087fff,#00a9d6)",
    boxShadow: "0 10px 35px rgba(0,0,0,.25)",
    opacity: "0",
    transform: "translateY(-10px)",
    transition: "all .3s ease",
    pointerEvents: "auto"
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";

    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 3500);
}

window.EICA_SHOW_TOAST = showToast;

/* =========================================================
   21. BACK TO TOP
   ========================================================= */

let scrollTicking = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;

    scrollTicking = true;

    requestAnimationFrame(() => {
      elements.backToTop?.classList.toggle(
        "show",
        window.scrollY > 400
      );

      scrollTicking = false;
    });
  },
  { passive: true }
);

elements.backToTop?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

/* =========================================================
   22. ACTIVE NAVIGATION
   ========================================================= */

const sections = $$("main section[id]");

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    entries => {
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
   23. SCROLL REVEAL
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

} else {
  revealElements.forEach(element => {
    element.style.opacity = "1";
    element.style.transform = "none";
  });
}

/* =========================================================
   24. PARTICLE BACKGROUND
   ========================================================= */

const particleCanvas = $("#particles");

if (particleCanvas) {
  const ctx = particleCanvas.getContext("2d");

  if (ctx) {
    let particles = [];

    let canvasWidth = 0;
    let canvasHeight = 0;

    let animationFrame = null;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function resizeCanvas() {
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;

      particleCanvas.width =
        Math.round(canvasWidth * pixelRatio);

      particleCanvas.height =
        Math.round(canvasHeight * pixelRatio);

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

      if (reducedMotion) {
        drawStaticParticles();
      }
    }

    function createParticles() {
      const count = Math.min(
        Math.floor(canvasWidth / 15),
        85
      );

      particles = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvasWidth,
          y: Math.random() * canvasHeight,
          size: Math.random() * 1.5 + 0.4,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.45 + 0.1
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

        if (
          particle.x < 0 ||
          particle.x > canvasWidth
        ) {
          particle.speedX *= -1;
        }

        if (
          particle.y < 0 ||
          particle.y > canvasHeight
        ) {
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

          const distance = Math.hypot(dx, dy);

          if (distance < 110) {
            ctx.beginPath();

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            ctx.strokeStyle =
              `rgba(30,160,255,${0.07 * (1 - distance / 110)})`;

            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      if (!reducedMotion) {
        animationFrame =
          requestAnimationFrame(drawParticles);
      }
    }

    function drawStaticParticles() {
      ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      particles.forEach(particle => {
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
    }

    resizeCanvas();

    if (!reducedMotion) {
      drawParticles();
    }

    window.addEventListener(
      "resize",
      resizeCanvas,
      { passive: true }
    );

    // إيقاف الحركة عندما تكون الصفحة في الخلفية
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        } else if (
          !document.hidden &&
          !reducedMotion &&
          !animationFrame
        ) {
          drawParticles();
        }
      }
    );
  }
}

/* =========================================================
   25. SETTINGS HELP
   ========================================================= */

$("#settingsHelp")?.addEventListener("click", () => {
  hideElement(elements.settingsMenu);

  showToast(
    "للمساعدة والدعم تواصل مع إدارة الأكاديمية.",
    "info"
  );
});

/* =========================================================
   26. LANGUAGE PLACEHOLDER
   ========================================================= */

$("#settingsLanguage")?.addEventListener("click", () => {
  showToast(
    "الواجهة الحالية باللغة العربية.",
    "info"
  );
});

/* =========================================================
   27. INITIAL APPLICATION STATE
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
   END OF EICA MAIN JAVASCRIPT
   ========================================================= */
