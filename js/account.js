let currentUser = null;
let currentProfile = null;


/* =========================================
   LOAD ACCOUNT
========================================= */

async function loadAccount() {

    const {
        data: {
            session
        },
        error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError || !session) {

        window.location.href =
            "logsignin.html";

        return;
    }


    currentUser =
        session.user;


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(`
            display_name,
            username,
            avatar_url,
            bio,
            is_staff
        `)
        .eq("id", currentUser.id)
        .single();


    if (profileError) {

        console.error(
            "Could not load KiKi profile:",
            profileError
        );

        return;
    }


    currentProfile =
        profile;


    displayProfile(profile);

    prepareEditForm(profile);
}


/* =========================================
   DISPLAY PROFILE
========================================= */

function displayProfile(profile) {

    document.getElementById(
        "account-display-name"
    ).textContent =
        profile.display_name ||
        "KiKi user";


    document.getElementById(
        "account-username"
    ).textContent =
        profile.username
            ? "@" + profile.username
            : "";


    document.getElementById(
        "account-bio"
    ).textContent =
        profile.bio || "";


    const avatar =
        document.getElementById(
            "account-avatar"
        );


    if (profile.avatar_url) {

        avatar.src =
            profile.avatar_url;

        avatar.style.display =
            "block";

    } else {

        avatar.style.display =
            "none";
    }


    const staffBadge =
        document.getElementById(
            "staff-badge"
        );


    if (profile.is_staff) {

        staffBadge.style.display =
            "flex";

    } else {

        staffBadge.style.display =
            "none";
    }
}


/* =========================================
   PREPARE EDIT FORM
========================================= */

function prepareEditForm(profile) {

    document.getElementById(
        "edit-display-name"
    ).value =
        profile.display_name || "";


    document.getElementById(
        "edit-username"
    ).value =
        profile.username || "";


    document.getElementById(
        "edit-bio"
    ).value =
        profile.bio || "";
}


/* =========================================
   OPEN EDIT PROFILE
========================================= */

document.getElementById(
    "edit-profile-button"
).addEventListener(
    "click",
    function() {

        document.getElementById(
            "edit-profile-panel"
        ).style.display =
            "block";

    }
);


/* =========================================
   CANCEL EDIT
========================================= */

document.getElementById(
    "cancel-edit-profile"
).addEventListener(
    "click",
    function() {

        document.getElementById(
            "edit-profile-panel"
        ).style.display =
            "none";

        prepareEditForm(
            currentProfile
        );

    }
);


/* =========================================
   SAVE PROFILE
========================================= */

document.getElementById(
    "edit-profile-form"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const message =
            document.getElementById(
                "profile-edit-message"
            );


        const displayName =
            document.getElementById(
                "edit-display-name"
            ).value.trim();


        let username =
            document.getElementById(
                "edit-username"
            ).value.trim()
            .toLowerCase();


        const bio =
            document.getElementById(
                "edit-bio"
            ).value.trim();


        /* =========================
           BASIC VALIDATION
        ========================= */

        if (!displayName) {

            message.textContent =
                "Please enter a display name.";

            return;
        }


        if (username) {

            if (
                !/^[a-z0-9_]{3,30}$/
                    .test(username)
            ) {

                message.textContent =
                    "Username must be 3–30 characters and can only contain letters, numbers, and underscores.";

                return;
            }
        }


        message.textContent =
            "Saving...";


        /* =========================
           CHECK USERNAME
        ========================= */

        if (username) {

            const {
                data: existingUser,
                error: usernameError
            } = await supabaseClient
                .from("profiles")
                .select("id")
                .eq("username", username)
                .neq("id", currentUser.id)
                .maybeSingle();


            if (usernameError) {

                console.error(
                    usernameError
                );

                message.textContent =
                    "Could not check username.";

                return;
            }


            if (existingUser) {

                message.textContent =
                    "That username is already taken.";

                return;
            }
        }


        /* =========================
           UPDATE PROFILE
        ========================= */

        const {
            data: updatedProfile,
            error: updateError
        } = await supabaseClient
            .from("profiles")
            .update({
                display_name:
                    displayName,

                username:
                    username || null,

                bio:
                    bio || null,

                updated_at:
                    new Date().toISOString()
            })
            .eq("id", currentUser.id)
            .select()
            .single();


        if (updateError) {

            console.error(
                updateError
            );

            message.textContent =
                "Could not save your profile.";

            return;
        }


        /* =========================
           SUCCESS
        ========================= */

        currentProfile =
            updatedProfile;


        displayProfile(
            updatedProfile
        );

        prepareEditForm(
            updatedProfile
        );


        message.textContent =
            "Profile saved!";


        setTimeout(
            function() {

                document.getElementById(
                    "edit-profile-panel"
                ).style.display =
                    "none";

                message.textContent =
                    "";

            },
            1000
        );

    }
);


/* =========================================
   START
========================================= */

loadAccount();