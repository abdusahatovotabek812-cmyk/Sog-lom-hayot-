(function () {
    const USERS_KEY = "soglom_users_v1";
    const SESSION_KEY = "soglom_session_v1";

    function getUsers() {
        return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    }

    function setUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getSession() {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    }

    function setSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    async function hashPassword(password) {
        const enc = new TextEncoder().encode(password);
        const digest = await crypto.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    async function registerUser(name, email, password) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim();

        if (!normalizedName || !normalizedEmail || !password) {
            throw new Error("Barcha maydonlarni to'ldiring.");
        }

        const users = getUsers();
        if (users.some((u) => u.email === normalizedEmail)) {
            throw new Error("Bu email bilan foydalanuvchi allaqachon mavjud.");
        }

        const passwordHash = await hashPassword(password);
        users.push({
            id: Date.now().toString(36),
            name: normalizedName,
            email: normalizedEmail,
            passwordHash
        });
        setUsers(users);
    }

    async function loginUser(email, password) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const users = getUsers();
        const found = users.find((u) => u.email === normalizedEmail);
        if (!found) {
            throw new Error("Email yoki parol noto'g'ri.");
        }

        const passwordHash = await hashPassword(password);
        if (found.passwordHash !== passwordHash) {
            throw new Error("Email yoki parol noto'g'ri.");
        }

        setSession({
            userId: found.id,
            name: found.name,
            email: found.email,
            loggedAt: new Date().toISOString()
        });
        return found;
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
    }

    function requireAuth() {
        const session = getSession();
        if (session) return session;

        const next = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
        location.href = `auth.html?next=${next}`;
        return null;
    }

    function mountNavbarAuth() {
        const navLinks = document.querySelector(".nav-links");
        if (!navLinks) return;
        if (document.getElementById("authNavItem")) return;

        const navbar = navLinks.closest(".navbar");
        if (navbar && !navbar.querySelector(".nav-toggle")) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "nav-toggle";
            btn.setAttribute("aria-label", "Menyuni ochish");
            btn.innerHTML = `<span></span><span></span><span></span>`;
            btn.addEventListener("click", () => {
                navbar.classList.toggle("nav-open");
            });
            navbar.insertBefore(btn, navLinks);

            // mobil menyudan link bosilganda yopilsin
            navLinks.addEventListener("click", (e) => {
                if (e.target.closest("a")) navbar.classList.remove("nav-open");
            });
        }

        // Theme toggle
        if (navbar && !navbar.querySelector(".nav-theme-toggle")) {
            const themeBtn = document.createElement("button");
            themeBtn.type = "button";
            themeBtn.className = "nav-theme-toggle";
            const prefersDark = localStorage.getItem("theme_pref") === "dark";
            if (prefersDark) document.body.classList.add("theme-dark");
            themeBtn.textContent = document.body.classList.contains("theme-dark") ? "☀️" : "🌙";
            themeBtn.addEventListener("click", () => {
                const dark = document.body.classList.toggle("theme-dark");
                localStorage.setItem("theme_pref", dark ? "dark" : "light");
                themeBtn.textContent = dark ? "☀️" : "🌙";
            });
            navbar.insertBefore(themeBtn, navLinks);
        }

        const session = getSession();
        const li = document.createElement("li");
        li.id = "authNavItem";

        if (!session) {
            const link = document.createElement("a");
            link.href = "auth.html";
            link.textContent = "Kirish";
            li.appendChild(link);
            navLinks.appendChild(li);
            return;
        }

        const userBadge = document.createElement("span");
        userBadge.className = "nav-user-badge";
        userBadge.textContent = session.name;

        const logoutBtn = document.createElement("button");
        logoutBtn.type = "button";
        logoutBtn.className = "nav-logout-btn";
        logoutBtn.textContent = "Chiqish";
        logoutBtn.addEventListener("click", () => {
            logout();
            location.href = "auth.html";
        });

        li.appendChild(userBadge);
        li.appendChild(logoutBtn);
        navLinks.appendChild(li);
    }

    function markActiveNav() {
        const navLinks = document.querySelectorAll(".nav-links a");
        if (!navLinks.length) return;
        const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
        navLinks.forEach((link) => {
            const href = (link.getAttribute("href") || "").toLowerCase();
            if (href === path) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    }

    window.Auth = {
        getSession,
        registerUser,
        loginUser,
        logout,
        requireAuth,
        mountNavbarAuth,
        markActiveNav
    };
})();

// Language switcher vaqtincha o'chirilgan (stub)
window.LangSwitch = { init() {} };
