/* =========================================
   KIKI PUBLIC PROFILE
========================================= */


let profile = null;
let artist = null;
let releases = [];

let countdownIntervals = [];


/* =========================================
   GET USERNAME
========================================= */

function getUsernameFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("username");

}


/* =========================================
   LOAD PROFILE
========================================= */

async function loadProfile() {

    console.log("KiKi profile: starting...");


    /* =========================================
       CHECK SUPABASE
    ========================================= */

    if (typeof supabaseClient === "undefined") {

        console.error(
            "KiKi profile: supabaseClient is not defined."
        );

        showError(
            "Supabase could not be loaded."
        );

        return;
    }


    console.log(
        "KiKi profile: Supabase client found."
    );


    /* =========================================
       GET USERNAME
    ========================================= */

    const username =
        getUsernameFromURL();


    console.log(
        "KiKi profile: username =",
        username
    );


    if (!username) {

        showError(
            "No profile specified."
        );

        return;
    }


    /* =========================================
       LOAD PROFILE
    ========================================= */

    console.log(
        "KiKi profile: requesting profile..."
    );


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("profiles")

            .select(`
                id,
                username,
                display_name,
                avatar_url,
                bio,
                is_staff,
                profile_type,
                artist_id
            `)

            .eq(
                "username",
                username
            )

            .single();


        console.log(
            "KiKi profile: Supabase response:",
            {
                data,
                error
            }
        );


        if (error) {

            console.error(
                "KiKi profile: profile query failed:",
                error
            );


            showError(
                "Could not load this profile."
            );

            return;
        }


        if (!data) {

            showError(
                "This profile doesn't exist."
            );

            return;
        }


        profile = data;


        console.log(
            "KiKi profile: profile loaded:",
            profile
        );


        displayProfile(
            profile
        );


        /* =========================================
           ARTIST
        ========================================= */

        if (
            profile.profile_type ===
            "artist"
        ) {

            console.log(
                "KiKi profile: this is an artist."
            );


            await loadArtist();

            await loadReleases();
            await loadIndmPublications();

        }


        /* =========================================
           POSTS
        ========================================= */

        await loadPosts();


        console.log(
            "KiKi profile: finished loading."
        );

    }

    catch (error) {

        console.error(
            "KiKi profile: unexpected error:",
            error
        );


        showError(
            "Something went wrong while loading this profile."
        );

    }

}


/* =========================================
   DISPLAY PROFILE
========================================= */

function displayProfile(profile) {


    document.getElementById(
        "profile-name"
    ).textContent =
        profile.display_name ||
        "KiKi user";


    document.getElementById(
        "profile-username"
    ).textContent =
        profile.username
            ? "@" + profile.username
            : "";


    document.getElementById(
        "profile-bio"
    ).textContent =
        profile.bio || "";


    /* ================================
       TYPE
    ================================= */

    const typeElement =
        document.getElementById(
            "profile-type"
        );


    const typeNames = {

        user:
            "User",

        artist:
            "Artist",

        producer:
            "Producer",

        producer_team:
            "Producer Team",

        songwriter:
            "Songwriter",

        composer:
            "Composer",

        staff:
            "Staff"

    };


    const type =
        profile.profile_type ||
        "user";


    typeElement.textContent =
        typeNames[type] ||
        "User";


    /* ================================
       AVATAR
    ================================= */

    const avatar =
        document.getElementById(
            "profile-avatar"
        );


    if (profile.avatar_url) {

        avatar.src =
            profile.avatar_url;

    } else {

        avatar.style.display =
            "none";

    }


    /* ================================
       STAFF BADGE
    ================================= */

    const badge =
        document.getElementById(
            "staff-badge"
        );


    if (profile.is_staff) {

        badge.style.display =
            "flex";

    }

}


/* =========================================
   LOAD ARTIST
========================================= */

async function loadArtist() {

    if (!profile.artist_id) {

        console.warn(
            "Artist profile has no artist_id."
        );

        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("artists")

        .select(`
            id,
            name,
            slug,
            description,
            avatar_url
        `)

        .eq(
            "id",
            profile.artist_id
        )

        .single();


    if (error) {

        console.error(
            "Could not load artist:",
            error
        );

        return;
    }


    artist = data;


    /* ================================
       USE ARTIST AVATAR
    ================================= */

    const avatar =
        document.getElementById(
            "profile-avatar"
        );


    if (
        artist.avatar_url
    ) {

        avatar.src =
            artist.avatar_url;

    }


    /* ================================
       SHOW MUSIC TAB
    ================================= */

    document.getElementById(
        "music-tab-button"
    ).style.display =
        "block";

}


/* =========================================
   LOAD RELEASES
========================================= */

async function loadReleases() {

    if (!artist) {
        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("releases")

        .select(`
            id,
            artist_id,
            title,
            type,
            cover_url,
            release_date,
            distribution_problem,
            distribution_message
        `)

        .eq(
            "artist_id",
            artist.id
        )

        .order(
            "release_date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Could not load releases:",
            error
        );

        return;
    }


    releases =
        data || [];


    renderFeaturedRelease();

    renderMusic();

}


/* =========================================
   FIND FEATURED RELEASE
========================================= */

function getFeaturedRelease() {

    if (!releases.length) {

        return null;
    }


    const now =
        new Date();


    /* ================================
       UPCOMING RELEASE
    ================================= */

    const upcoming =
        releases

            .filter(
                release =>
                    new Date(
                        release.release_date
                    ) > now
            )

            .sort(
                (a,b) =>
                    new Date(
                        a.release_date
                    ) -
                    new Date(
                        b.release_date
                    )
            );


    if (upcoming.length) {

        return upcoming[0];

    }


    /* ================================
       LATEST RELEASE
    ================================= */

    return releases[0];

}


/* =========================================
   FEATURED RELEASE
========================================= */

function renderFeaturedRelease() {

    const container =
        document.getElementById(
            "featured-release"
        );


    const release =
        getFeaturedRelease();


    if (!release) {

        container.style.display =
            "none";

        return;
    }


    container.style.display =
        "block";


    const releaseDate =
        new Date(
            release.release_date
        );


    const upcoming =
        releaseDate >
        new Date();


    const label =
        upcoming
            ? "Upcoming Release"
            : "New Release";


    container.innerHTML = `

        <div class="release-label">
            ${label}
        </div>


        <div class="release-content">

            <img
                class="release-cover"
                src="${release.cover_url || ""}"
                alt="${escapeHTML(release.title)}"
            >


            <div class="release-details">

                <h2 class="release-title">
                    ${escapeHTML(release.title)}
                </h2>


                <div class="release-type">
                    ${escapeHTML(release.type)}
                </div>


                <div class="release-date">

                    ${
                        upcoming
                            ? "Releases "
                            : "Released "
                    }

                    ${formatDate(
                        releaseDate
                    )}

                </div>


                ${
                    upcoming
                        ? `
                            <div
                                class="release-countdown"
                                id="featured-countdown"
                            >
                                Loading...
                            </div>
                        `
                        : `
                            <div class="release-countdown">
                                Out now
                            </div>
                        `
                }


                ${
                    release.distribution_problem
                        ? `
                            <div class="release-problem">

                                ${
                                    release.distribution_message ||
                                    "this release has some problems, we're working to solve them as fast as we can"
                                }

                            </div>
                        `
                        : ""
                }

            </div>

        </div>

    `;


    if (upcoming) {

        startCountdown(
            release.release_date
        );

    }

}


/* =========================================
   COUNTDOWN
========================================= */

function startCountdown(
    releaseDate
) {

    const element =
        document.getElementById(
            "featured-countdown"
        );


    if (!element) {
        return;
    }


    function update() {

        const now =
            new Date()
                .getTime();


        const target =
            new Date(
                releaseDate
            ).getTime();


        const difference =
            target - now;


        if (difference <= 0) {

            element.textContent =
                "Out now";

            return;
        }


        const days =
            Math.floor(
                difference /
                (1000 * 60 * 60 * 24)
            );


        const hours =
            Math.floor(
                (
                    difference %
                    (1000 * 60 * 60 * 24)
                ) /
                (1000 * 60 * 60)
            );


        const minutes =
            Math.floor(
                (
                    difference %
                    (1000 * 60 * 60)
                ) /
                (1000 * 60)
            );


        const seconds =
            Math.floor(
                (
                    difference %
                    (1000 * 60)
                ) /
                1000
            );


        element.textContent =

            `${days}d ` +
            `${String(hours).padStart(2,"0")}h ` +
            `${String(minutes).padStart(2,"0")}m ` +
            `${String(seconds).padStart(2,"0")}s`;

    }


    update();


    const interval =
        setInterval(
            update,
            1000
        );


    countdownIntervals.push(
        interval
    );

}


/* =========================================
   MUSIC TAB
========================================= */

async function renderMusic() {

    const container =
        document.getElementById(
            "music-content"
        );


    if (!releases.length) {

        container.innerHTML = `

            <div class="empty-state">
                No releases yet.
            </div>

        `;

        return;
    }


    container.innerHTML = "";


    for (
        const release of releases
    ) {


        /* ================================
           TRACKS
        ================================= */

        const {
            data: tracks,
            error: tracksError
        } = await supabaseClient

            .from("release_tracks")

            .select(`
                track_number,
                title
            `)

            .eq(
                "release_id",
                release.id
            )

            .order(
                "track_number",
                {
                    ascending: true
                }
            );


        if (tracksError) {

            console.error(
                tracksError
            );

        }


        /* ================================
           PLATFORMS
        ================================= */

        const {
            data: platforms,
            error: platformsError
        } = await supabaseClient

            .from("release_platforms")

            .select(`
                platform,
                url
            `)

            .eq(
                "release_id",
                release.id
            );


        if (platformsError) {

            console.error(
                platformsError
            );

        }


        /* ================================
           TRACK HTML
        ================================= */

        let tracksHTML = "";


        (tracks || []).forEach(
            track => {

                tracksHTML += `

                    <div class="track">

                        <span
                            class="track-number"
                        >
                            ${String(
                                track.track_number
                            ).padStart(2,"0")}
                        </span>


                        <span>
                            ${escapeHTML(
                                track.title
                            )}
                        </span>

                    </div>

                `;

            }
        );


        /* ================================
           PLATFORM HTML
        ================================= */

        let platformsHTML = "";


        (platforms || []).forEach(
            platform => {

                platformsHTML += `

                    <a
                        class="platform"
                        href="${escapeAttribute(platform.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHTML(
                            platform.platform
                        )}
                    </a>

                `;

            }
        );


        /* ================================
           RELEASE
        ================================= */

        const releaseElement =
            document.createElement(
                "article"
            );


        releaseElement.className =
            "music-release";


        releaseElement.innerHTML = `

            <div class="music-release-top">

                <img
                    class="music-cover"
                    src="${release.cover_url || ""}"
                    alt="${escapeHTML(
                        release.title
                    )}"
                >


                <div>

                    <h3 class="music-title">
                        ${escapeHTML(
                            release.title
                        )}
                    </h3>


                    <div class="music-meta">

                        ${escapeHTML(
                            release.type
                        )}

                        ·

                        ${formatDate(
                            new Date(
                                release.release_date
                            )
                        )}

                    </div>

                </div>

            </div>


            ${
                tracksHTML
                    ? `
                        <div class="tracklist">
                            ${tracksHTML}
                        </div>
                    `
                    : ""
            }


            ${
                platformsHTML
                    ? `
                        <div class="platforms">
                            ${platformsHTML}
                        </div>
                    `
                    : ""
            }


            ${
                release.distribution_problem
                    ? `
                        <div class="release-problem">

                            ${
                                release.distribution_message ||
                                "this release has some problems, we're working to solve them as fast as we can"
                            }

                        </div>
                    `
                    : ""
            }

        `;


        container.appendChild(
            releaseElement
        );

    }

}


/* =========================================
   INDM / INDESIGN PUBLICATIONS
========================================= */

async function loadIndmPublications() {
    const tabButton = document.getElementById("indm-tab-button");
    const container = document.getElementById("indm-content");
    if (!tabButton || !container || !profile || profile.profile_type !== "artist") return;

    try {
        // Only Nemawashi-verified artist identities receive this tab.
        const { data: verified, error: verifyError } = await supabaseClient
            .from("in_music_verified_artists")
            .select("artist_name")
            .eq("user_id", profile.id)
            .eq("verified", true)
            .maybeSingle();

        if (verifyError) throw verifyError;
        if (!verified) return;

        tabButton.style.display = "block";
        container.innerHTML = '<div class="empty-state">Loading INDM publications...</div>';

        // Include publications owned by this account and releases credited to the verified artist name.
        const results = await Promise.all([
            supabaseClient.from("indesign_dems")
                .select("slug,title,artist,cover_path,created_at")
                .eq("owner_id", profile.id)
                .eq("visibility", "public")
                .order("created_at", { ascending: false })
                .limit(60),
            supabaseClient.from("indesign_dems")
                .select("slug,title,artist,cover_path,created_at")
                .eq("artist", verified.artist_name)
                .eq("visibility", "public")
                .order("created_at", { ascending: false })
                .limit(60)
        ]);

        for (const result of results) {
            if (result.error) throw result.error;
        }

        const bySlug = new Map();
        results.forEach(result => (result.data || []).forEach(item => bySlug.set(item.slug, item)));
        const publications = [...bySlug.values()].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (!publications.length) {
            container.innerHTML = '<div class="empty-state">No public indesign publications yet.</div>';
            return;
        }

        container.innerHTML = '<div class="indm-label"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> INDESIGN PUBLICATIONS</div>';
        const intro = document.createElement("p");
        intro.className = "indm-intro";
        intro.textContent = "Music ideas, DEM releases and synced lyric experiences published through Nemawashi indesign.";
        container.appendChild(intro);

        publications.forEach(item => {
            const card = document.createElement("article");
            card.className = "indm-publication";

            const cover = item.cover_path
                ? supabaseClient.storage.from("in-music-artwork").getPublicUrl(item.cover_path).data.publicUrl
                : "";

            const postUrl = "https://nemawashi.hrmnx.site/app/in-music/post.html?id=" + encodeURIComponent(item.slug);
            const lyricsUrl = "https://nemawashi.hrmnx.site/app/indesign/dem.html?id=" + encodeURIComponent(item.slug);

            card.innerHTML = `
                ${cover
                    ? `<img class="indm-cover" src="${escapeAttribute(cover)}" alt="${escapeAttribute(item.title)}">`
                    : `<div class="indm-cover-fallback"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>`}
                <div class="indm-publication-info">
                    <h3>${escapeHTML(item.title)}</h3>
                    <div class="indm-publication-meta">${escapeHTML(item.artist || verified.artist_name)} · ${formatDate(new Date(item.created_at))}</div>
                    <div class="indm-actions">
                        <a class="indm-action" href="${postUrl}" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>
                            Publication
                        </a>
                        <a class="indm-action" href="${lyricsUrl}" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h8"/></svg>
                            Synced lyrics &amp; player
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Could not load INDM publications:", error);
        tabButton.style.display = "block";
        container.innerHTML = '<div class="empty-state">INDM publications are temporarily unavailable.</div>';
    }
}


/* =========================================
   POSTS
========================================= */

async function loadPosts() {

    const container =
        document.getElementById(
            "posts-content"
        );


    if (!profile) {
        return;
    }


    /*
       This assumes your posts table has
       a user_id column pointing to profiles.id.
    */


    const {
        data,
        error
    } = await supabaseClient

        .from("posts")

        .select("*")

	.eq(
	    "author_id",
	    profile.id
	)

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Could not load posts:",
            error
        );


        container.innerHTML = `

            <div class="empty-state">
                Unable to load posts.
            </div>

        `;

        return;
    }


    if (!data || !data.length) {

        container.innerHTML = `

            <div class="empty-state">
                No posts yet.
            </div>

        `;

        return;
    }


    container.innerHTML = "";


data.forEach(
    post => {

        const element =
            document.createElement(
                "article"
            );

        element.className =
            "post-card";

        element.style.cursor =
            "pointer";

        element.innerHTML = `

            <div class="post-text">

                ${escapeHTML(
                    post.content ||
                    ""
                )}

            </div>

        `;

        element.addEventListener(
            "click",
            () => {

                window.location.href =
                    `post.html?id=${encodeURIComponent(post.id)}`;

            }
        );

        container.appendChild(
            element
        );

    }
);

}


/* =========================================
   TAB SWITCHING
========================================= */

document.querySelectorAll(
    ".profile-tab"
).forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                const tab =
                    this.dataset.tab;


                document
                    .querySelectorAll(
                        ".profile-tab"
                    )
                    .forEach(
                        button => {

                            button.classList
                                .remove(
                                    "active"
                                );

                        }
                    );


                this.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".tab-content"
                    )
                    .forEach(
                        content => {

                            content.classList
                                .remove(
                                    "active"
                                );

                        }
                    );


                document
                    .getElementById(
                        tab + "-tab"
                    )
                    .classList
                    .add(
                        "active"
                    );

            }
        );

    }
);


/* =========================================
   ERROR
========================================= */

function showError(message) {

    document.querySelector(
        ".profile-page"
    ).innerHTML = `

        <div class="empty-state">

            ${escapeHTML(message)}

        </div>

    `;

}


/* =========================================
   DATE
========================================= */

function formatDate(date) {

    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


/* =========================================
   HTML ESCAPING
========================================= */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


function escapeAttribute(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );

}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {
        loadProfile();
    }
);