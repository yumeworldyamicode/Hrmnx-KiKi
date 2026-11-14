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

        }

        // INDM access is based on the verified-artist record, not the
        // general KiKi profile_type. A verified creator may still have
        // a regular "user" profile type.
        await loadIndmPublications();


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
    if (!tabButton || !container || !profile) return;

    try {
        const { data: verified, error: verifyError } = await supabaseClient
            .from("in_music_verified_artists")
            .select("artist_name")
            .eq("user_id", profile.id)
            .eq("verified", true)
            .maybeSingle();
        if (verifyError) throw verifyError;

        const isArtistProfile = profile.profile_type === "artist";
        if (!verified && !isArtistProfile) return;

        tabButton.style.display = "inline-flex";
        container.innerHTML = '<div class="empty-state">Loading INDM publications...</div>';

        const artistName = verified?.artist_name || artist?.name || "";
        const requests = [
            supabaseClient.from("indesign_dems")
                .select("slug,title,artist,cover_path,package_path,created_at")
                .eq("owner_id", profile.id)
                .eq("visibility", "public")
                .order("created_at", { ascending: false })
                .limit(60)
        ];
        if (artistName) {
            requests.push(
                supabaseClient.from("indesign_dems")
                    .select("slug,title,artist,cover_path,package_path,created_at")
                    .eq("artist", artistName)
                    .eq("visibility", "public")
                    .order("created_at", { ascending: false })
                    .limit(60)
            );
        }

        const results = await Promise.all(requests);
        for (const result of results) if (result.error) throw result.error;

        const bySlug = new Map();
        results.forEach(result => (result.data || []).forEach(item => bySlug.set(item.slug, item)));
        const publications = [...bySlug.values()].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (!publications.length) {
            container.innerHTML = '<div class="empty-state">No public indesign publications yet.</div>';
            return;
        }

        container.innerHTML = "";
        const intro = document.createElement("p");
        intro.className = "indm-intro";
        intro.textContent = "Music ideas, DEM releases and synced lyric experiences published through Nemawashi indesign.";
        container.appendChild(intro);

        let activeAudio = null;
        const objectUrls = [];
        window.addEventListener("pagehide", () => objectUrls.forEach(url => URL.revokeObjectURL(url)), { once: true });

        async function prepareDem(item) {
            const card = document.createElement("article");
            card.className = "indm-publication";
            card.innerHTML = `
                <div class="indm-publication-top">
                    <button class="indm-cover-button" type="button" aria-label="Play ${escapeAttribute(item.title)}">
                        <span class="indm-cover-placeholder" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </span>
                        <span class="indm-cover-play" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7z"/></svg>
                        </span>
                    </button>
                    <div class="indm-publication-info">
                        <h3>${escapeHTML(item.title)}</h3>
                        <div class="indm-publication-meta">${escapeHTML(item.artist || artistName || "Artist")} · ${formatDate(new Date(item.created_at))}</div>
                        <div class="indm-play-status">Preparing audio…</div>
                    </div>
                </div>
                <div class="indm-audio-progress" aria-hidden="true"><span></span></div>
                <div class="indm-lyrics-panel">
                    <div class="indm-lyrics-heading">SYNCED LYRICS</div>
                    <div class="indm-lyrics-current"><span class="indm-lyrics-placeholder">Lyrics will appear here when playback starts.</span></div>
                </div>
                <a class="indm-publication-link" href="https://nemawashi.hrmnx.site/app/in-music/post.html?id=${encodeURIComponent(item.slug)}" target="_blank" rel="noopener noreferrer">View publication</a>
            `;
            container.appendChild(card);

            const coverButton = card.querySelector(".indm-cover-button");
            const status = card.querySelector(".indm-play-status");
            const progress = card.querySelector(".indm-audio-progress span");
            const lyricsBox = card.querySelector(".indm-lyrics-current");
            let audio = null;
            let rules = [];
            let lastActive = -1;

            const coverUrl = item.cover_path
                ? supabaseClient.storage.from("in-music-artwork").getPublicUrl(item.cover_path).data.publicUrl
                : "";
            if (coverUrl) {
                const img = document.createElement("img");
                img.className = "indm-cover";
                img.src = coverUrl;
                img.alt = item.title + " album cover";
                img.loading = "lazy";
                coverButton.prepend(img);
                card.querySelector(".indm-cover-placeholder").remove();
            }

            try {
                const { data: record, error: recordError } = await supabaseClient
                    .rpc("get_indesign_dem_by_slug", { dem_slug: item.slug })
                    .maybeSingle();
                if (recordError) throw recordError;
                if (!record?.package_path) throw new Error("Audio package unavailable.");

                const { data: packageBlob, error: packageError } = await supabaseClient
                    .storage.from("indesign-dems").download(record.package_path);
                if (packageError) throw packageError;

                if (!window.JSZip) throw new Error("Audio package reader unavailable.");
                const zip = await JSZip.loadAsync(packageBlob);
                const manifestFile = zip.file("manifest.json");
                if (!manifestFile) throw new Error("This DEM has no manifest.");
                const manifest = JSON.parse(await manifestFile.async("string"));
                rules = (manifest.lyrics?.rules || []).slice().sort((a, b) => Number(a.time || 0) - Number(b.time || 0));

                const audioName = manifest.assets?.audio;
                const audioFile = audioName ? zip.file("audio/" + audioName) : null;
                if (!audioFile) throw new Error("No playable audio in this DEM.");

                const rawAudio = await audioFile.async("blob");
                const ext = (audioName.split(".").pop() || "").toLowerCase();
                const mime = { mp3:"audio/mpeg", wav:"audio/wav", m4a:"audio/mp4", aac:"audio/aac", ogg:"audio/ogg", flac:"audio/flac", webm:"audio/webm" }[ext] || rawAudio.type || "application/octet-stream";
                const playableBlob = new Blob([rawAudio], { type: mime });
                const audioUrl = URL.createObjectURL(playableBlob);
                objectUrls.push(audioUrl);
                audio = new Audio(audioUrl);
                audio.preload = "metadata";
                status.textContent = "Tap the cover to play";
                coverButton.disabled = false;

                if (!coverUrl && manifest.assets?.artwork) {
                    const artFile = zip.file("artwork/" + manifest.assets.artwork);
                    if (artFile) {
                        const artBlob = await artFile.async("blob");
                        const artUrl = URL.createObjectURL(artBlob);
                        objectUrls.push(artUrl);
                        const img = document.createElement("img");
                        img.className = "indm-cover";
                        img.src = artUrl;
                        img.alt = item.title + " album cover";
                        coverButton.prepend(img);
                        card.querySelector(".indm-cover-placeholder")?.remove();
                    }
                }

                function renderLyric(index) {
                    if (index === lastActive) return;
                    lastActive = index;
                    const rule = rules[index];
                    if (!rule) {
                        lyricsBox.innerHTML = '<span class="indm-lyrics-placeholder">Waiting for the next lyric…</span>';
                        return;
                    }
                    lyricsBox.innerHTML = "";
                    const line = document.createElement("div");
                    line.className = "indm-lyric-enter";
                    const section = document.createElement("span");
                    section.className = "indm-lyric-section";
                    section.textContent = rule.section || "LYRICS";
                    const original = document.createElement("div");
                    original.className = "indm-lyric-original";
                    original.textContent = rule.text || "";
                    line.append(section, original);
                    if (rule.romanized) {
                        const romanized = document.createElement("div");
                        romanized.className = "indm-lyric-translation";
                        romanized.textContent = rule.romanized;
                        line.appendChild(romanized);
                    }
                    (rule.translations || []).forEach(translation => {
                        const translated = document.createElement("div");
                        translated.className = "indm-lyric-translation";
                        translated.textContent = translation.text || "";
                        line.appendChild(translated);
                    });
                    lyricsBox.appendChild(line);
                }

                audio.addEventListener("timeupdate", () => {
                    const current = audio.currentTime;
                    let active = -1;
                    rules.forEach((rule, index) => {
                        if (Number(rule.time || 0) <= current) active = index;
                    });
                    renderLyric(active);
                    if (audio.duration) progress.style.width = (current / audio.duration * 100) + "%";
                });
                const coverPlayIcon = coverButton.querySelector(".indm-cover-play svg");
                const showPlayIcon = () => { if (coverPlayIcon) coverPlayIcon.innerHTML = '<path d="m9 5 10 7-10 7z"/>'; };
                const showPauseIcon = () => { if (coverPlayIcon) coverPlayIcon.innerHTML = '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>'; };
                audio.addEventListener("play", () => {
                    status.textContent = "Playing";
                    card.classList.add("is-playing");
                    showPauseIcon();
                });
                audio.addEventListener("pause", () => {
                    if (!audio.ended) status.textContent = "Paused";
                    card.classList.remove("is-playing");
                    showPlayIcon();
                });
                audio.addEventListener("ended", () => {
                    status.textContent = "Finished";
                    card.classList.remove("is-playing");
                    showPlayIcon();
                    progress.style.width = "0%";
                });
                coverButton.addEventListener("click", async () => {
                    if (activeAudio && activeAudio !== audio) activeAudio.pause();
                    if (audio.paused) {
                        activeAudio = audio;
                        try { await audio.play(); }
                        catch (error) { status.textContent = "Playback was blocked. Tap again to play."; console.error(error); }
                    } else {
                        audio.pause();
                    }
                });
            } catch (error) {
                console.error("Could not prepare INDM DEM:", item.slug, error);
                coverButton.disabled = true;
                status.textContent = "Audio unavailable";
                if (rules.length) lyricsBox.innerHTML = '<span class="indm-lyrics-placeholder">Synced lyrics are available in the DEM player.</span>';
            }
        }

        await Promise.all(publications.map(prepareDem));
    } catch (error) {
        console.error("Could not load INDM publications:", error);
        if (profile.profile_type === "artist") tabButton.style.display = "inline-flex";
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

                ${escapeHTML(normalizePostText(post.content || ""))}

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

function normalizePostText(value) {
    return String(value ?? "")
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map(line => line.trim())
        .join("\n")
        .trim();
}

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