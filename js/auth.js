(function () {
    const SESSION_KEY = "soglom_session_v1";
    const ADMIN_EMAIL = "abdusahatovotabek812@gmail.com";

    // --- Firebase Initialization ---
    let firebaseApp = null;
    let db = null;
    let auth = null;

    async function initFirebase() {
        if (window.firebase) {
            if (!firebaseApp) {
                db = window.firebase.firestore();
                auth = window.firebase.auth();
            }
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script1 = document.createElement("script");
            script1.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
            document.head.appendChild(script1);
            
            script1.onload = () => {
                const script2 = document.createElement("script");
                script2.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js";
                document.head.appendChild(script2);
                
                const script3 = document.createElement("script");
                script3.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js";
                document.head.appendChild(script3);

                script3.onload = () => {
                    const firebaseConfig = {
                        apiKey: "AIzaSyAusyZptjCQ_1fGDXGjPa1cSHNBhDgEU8Q",
                        authDomain: "sog-lom-hayot-2d846.firebaseapp.com",
                        projectId: "sog-lom-hayot-2d846",
                        storageBucket: "sog-lom-hayot-2d846.firebasestorage.app",
                        messagingSenderId: "540725342705",
                        appId: "1:540725342705:web:0fd788976f9e44289c1450"
                    };
                    firebaseApp = window.firebase.initializeApp(firebaseConfig);
                    db = window.firebase.firestore();
                    auth = window.firebase.auth();
                    resolve();
                };
                script3.onerror = reject;
            };
            script1.onerror = reject;
        });
    }

    // --- End Firebase ---

    function getSession() {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    }

    function setSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    async function registerUser(name, email, password) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim();

        if (!normalizedName || !normalizedEmail || !password) {
            throw new Error("Barcha maydonlarni to'ldiring.");
        }

        await initFirebase();
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(normalizedEmail, password);
            const user = userCredential.user;
            
            await db.collection("users").doc(user.uid).set({
                id: user.uid,
                name: normalizedName,
                email: normalizedEmail,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            setSession({
                userId: user.uid,
                name: normalizedName,
                email: normalizedEmail,
                loggedAt: new Date().toISOString()
            });
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                throw new Error("Bu email bilan foydalanuvchi allaqachon mavjud.");
            }
            throw new Error("Xatolik yuz berdi: " + error.message);
        }
    }

    async function loginUser(email, password) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        
        await initFirebase();
        try {
            const userCredential = await auth.signInWithEmailAndPassword(normalizedEmail, password);
            const user = userCredential.user;
            
            const doc = await db.collection("users").doc(user.uid).get();
            const name = doc.exists ? doc.data().name : "Foydalanuvchi";

            setSession({
                userId: user.uid,
                name: name,
                email: normalizedEmail,
                loggedAt: new Date().toISOString()
            });
            return user;
        } catch (error) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                throw new Error("Email yoki parol noto'g'ri.");
            }
            throw new Error("Baza xatoligi: " + error.message);
        }
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        if (auth) auth.signOut();
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

    async function getUsers() {
        await initFirebase();
        const snapshot = await db.collection("users").get();
        return snapshot.docs.map(doc => doc.data());
    }

    async function deleteUser(userId) {
        await initFirebase();
        await db.collection("users").doc(userId).delete();
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
