async function updateAuthUI() {

    const loginButton =
        document.getElementById("login-button");

    const accountDropdown =
        document.getElementById("account-dropdown");

    if (!loginButton) {
        return;
    }

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(
            "KiKi authentication error:",
            error
        );

        return;
    }


    /* =========================
       LOGGED OUT
    ========================= */

    if (!session) {

        loginButton.href = "logsignin.html";

        loginButton.innerHTML =
            "Log in or sign up";

        loginButton.onclick = null;

        if (accountDropdown) {
            accountDropdown.classList.remove("open");
        }

        return;
    }


    /* =========================
       LOGGED IN
    ========================= */

    const user = session.user;


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(
            "display_name, username, avatar_url, is_staff"
        )
        .eq("id", user.id)
        .single();


    if (profileError) {

        console.error(
            "KiKi profile error:",
            profileError
        );

        return;
    }


    const displayName =
        profile.display_name ||
        profile.username ||
        user.email.split("@")[0];


    const avatar =
        profile.avatar_url;


    /* =========================
       PROFILE BUTTON
    ========================= */

    loginButton.href = "#";

    loginButton.innerHTML = `

        ${
            avatar
                ? `
                    <img
                        src="${escapeHTML(avatar)}"
                        class="header-profile-picture"
                        alt=""
                    >
                `
                : ""
        }

        <span>
            ${escapeHTML(displayName)}
        </span>

    `;


    /* =========================
       STAFF BADGE
    ========================= */

    if (profile.is_staff) {

        loginButton.innerHTML += `

            <img
                src="images/Kikifficial.gif"
                class="kikifficial-header-badge"
                alt="KiKifficial"
                title="Staff member"
            >

        `;
    }


    /* =========================
       PROFILE BUTTON CLICK
    ========================= */

    loginButton.onclick = function(event) {

        event.preventDefault();

        if (!accountDropdown) {
            return;
        }

        accountDropdown.classList.toggle("open");
    };


    /* =========================
       LOGOUT BUTTON
    ========================= */

    const logoutButton =
        document.getElementById("logout-button");


    if (logoutButton) {

        logoutButton.onclick = async function() {

            const {
                error
            } = await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "KiKi logout error:",
                    error
                );

                return;
            }


            accountDropdown.classList.remove("open");

            updateAuthUI();
        };
    }

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}


/* =========================
   CLOSE DROPDOWN WHEN
   CLICKING OUTSIDE
========================= */

document.addEventListener(
    "click",
    function(event) {

        const loginButton =
            document.getElementById("login-button");

        const accountDropdown =
            document.getElementById("account-dropdown");


        if (
            !loginButton ||
            !accountDropdown
        ) {
            return;
        }


        if (
            !loginButton.contains(event.target) &&
            !accountDropdown.contains(event.target)
        ) {

            accountDropdown.classList.remove(
                "open"
            );
        }

    }
);


/* =========================
   INITIAL AUTH CHECK
========================= */

updateAuthUI();


/* =========================
   AUTH STATE LISTENER
========================= */

supabaseClient.auth.onAuthStateChange(
    function() {

        updateAuthUI();

    }
);