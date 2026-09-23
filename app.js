/* =========================================================
   KIKI / YUMEWORLDYAMI SUPABASE AUTHENTICATION
========================================================= */

/* =========================================================
   ELEMENTS
========================================================= */

const signupForm = document.getElementById("signup-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleButton = document.getElementById("google-btn");
const message = document.getElementById("message");


/* =========================================================
   MESSAGE HELPER
========================================================= */

function showMessage(text, type = "") {

    message.textContent = text;

    message.className = "status-message";

    if (type) {
        message.classList.add(type);
    }

}


/* =========================================================
   EMAIL SIGN UP
========================================================= */

signupForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;


    if (!email || !password) {

        showMessage(
            "Please enter your email and password.",
            "error"
        );

        return;

    }


    showMessage("Creating your account...", "loading");


    try {

        const { data, error } =
            await supabaseClient.auth.signUp({
                email: email,
                password: password,

                options: {
                    emailRedirectTo:
                        window.location.origin + "/"
                }
            });


        if (error) {

            console.error(error);

            showMessage(
                error.message,
                "error"
            );

            return;

        }


        /*
         * Supabase may require the user to verify
         * their email before they can log in.
         */

        if (data.user && !data.session) {

            showMessage(
                "Account created! Please check your email to verify your account.",
                "success"
            );

            return;

        }


        /*
         * If email confirmation is disabled,
         * the user can already be logged in.
         */

        if (data.session) {

            showMessage(
                "Successfully logged in! Redirecting...",
                "success"
            );

            setTimeout(() => {

                window.location.href =
                    "index.html";

            }, 1000);

        }

    } catch (error) {

        console.error(error);

        showMessage(
            "Something went wrong. Please try again.",
            "error"
        );

    }

});


/* =========================================================
   GOOGLE LOGIN
========================================================= */

googleButton.addEventListener("click", async function() {

    showMessage(
        "Connecting to Google...",
        "loading"
    );


    try {

        const { error } =
            await supabaseClient.auth.signInWithOAuth({

                provider: "google",

                options: {
                    redirectTo:
                        window.location.origin + "/"
                }

            });


        if (error) {

            console.error(error);

            showMessage(
                error.message,
                "error"
            );

        }

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to connect to Google.",
            "error"
        );

    }

});