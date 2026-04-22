(function () {
    const USERS_KEY = "soglom_users_v1";
    const SESSION_KEY = "soglom_session_v1";
    const ADMIN_EMAIL = "abdusahatovotabek812@gmail.com";

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

    function isAdmin(session) {
        return session && session.email === ADMIN_EMAIL;
    }

    function requireAdmin() {
        const session = requireAuth();
        if (!session) return null;
        if (!isAdmin(session)) {
            location.href = "index.html";
            return null;
        }
        return session;
    }

    function deleteUser(userId) {
        let users = getUsers();
        users = users.filter(u => u.id !== userId);
        setUsers(users);
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
            const li = document.createElement("li");
            li.appendChild(themeBtn);
            navLinks.appendChild(li);
        }

        // Custom Language Selector
        if (navbar && !navbar.querySelector(".custom-lang-selector")) {
            const langContainer = document.createElement("div");
            langContainer.className = "custom-lang-selector";
            
            const btn = document.createElement("button");
            btn.className = "lang-btn";
            btn.innerHTML = `🌐 O'zbek`;
            
            const dropdown = document.createElement("div");
            dropdown.className = "lang-dropdown";
            
            const searchDiv = document.createElement("div");
            searchDiv.className = "lang-search";
            const searchInput = document.createElement("input");
            searchInput.type = "text";
            searchInput.placeholder = "Tilni qidiring...";
            searchDiv.appendChild(searchInput);
            
            const list = document.createElement("ul");
            list.className = "lang-list";
            
            const languages = [
                { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
                { code: 'en', name: "English", flag: '🇬🇧' },
                { code: 'ru', name: "Русский", flag: '🇷🇺' },
                { code: 'tr', name: "Türkçe", flag: '🇹🇷' },
                { code: 'kk', name: "Қазақша", flag: '🇰🇿' },
                { code: 'tg', name: "Тоҷикӣ", flag: '🇹🇯' },
                { code: 'ky', name: "Кыргызча", flag: '🇰🇬' },
                { code: 'ar', name: "العربية", flag: '🇸🇦' },
                { code: 'zh-CN', name: "中文", flag: '🇨🇳' }
            ];
            
            function renderList(filterText = "") {
                list.innerHTML = "";
                languages.filter(l => l.name.toLowerCase().includes(filterText.toLowerCase())).forEach(lang => {
                    const li = document.createElement("li");
                    li.dataset.lang = lang.code;
                    li.innerHTML = `${lang.flag} ${lang.name}`;
                    li.addEventListener("click", () => {
                        langContainer.classList.remove("open");
                        // Google Translate selectorini topib o'zgartirish
                        let gtSelect = document.querySelector(".goog-te-combo");
                        
                        if (gtSelect) {
                            gtSelect.value = lang.code;
                            gtSelect.dispatchEvent(new Event("change"));
                            btn.innerHTML = `🌐 ${lang.name}`;
                        } else {
                            // Balki yuklanishga biroz vaqt kerakdir yoki cache muammosi
                            alert("Tarjimon hali to'liq yuklanmadi. Iltimos, sahifani yangilang (F5) va yana urining.");
                        }
                    });
                    list.appendChild(li);
                });
            }
            
            renderList();
            
            searchInput.addEventListener("input", (e) => {
                renderList(e.target.value);
            });
            
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                langContainer.classList.toggle("open");
                if(langContainer.classList.contains("open")) {
                    setTimeout(() => searchInput.focus(), 50);
                }
            });
            
            document.addEventListener("click", (e) => {
                if (!langContainer.contains(e.target)) {
                    langContainer.classList.remove("open");
                }
            });
            
            dropdown.appendChild(searchDiv);
            dropdown.appendChild(list);
            langContainer.appendChild(btn);
            langContainer.appendChild(dropdown);
            
            const li = document.createElement("li");
            li.appendChild(langContainer);
            navLinks.appendChild(li);
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

        if (isAdmin(session)) {
            const adminLink = document.createElement("a");
            adminLink.href = "admin.html";
            adminLink.className = "nav-admin-link";
            adminLink.textContent = "Admin Panel";
            adminLink.style.marginRight = "10px";
            li.appendChild(adminLink);
        }

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
        getUsers,
        deleteUser,
        registerUser,
        loginUser,
        logout,
        requireAuth,
        requireAdmin,
        isAdmin,
        mountNavbarAuth,
        markActiveNav
    };
})();

// Google Translate ulash
(function() {
    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    // Vidjet ko'rinishini yashirin ushlab turamiz, chunki maxsus dropdown ishlatiladi
    document.body.appendChild(translateDiv);

    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'uz',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
})();
