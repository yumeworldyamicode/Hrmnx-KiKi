async function loadKiKiFeed() {

    const feed = document.getElementById("postFeed");

    if (!feed) {
        return;
    }

    feed.innerHTML = `
        <div class="feed-loading">
            Loading KiKi...
        </div>
    `;


    const {
        data: posts,
        error
    } = await supabaseClient
        .from("posts")
        .select(`
            id,
            title,
            content,
            image_url,
            is_staff_post,
            created_at,

            profiles!posts_author_id_fkey (
                display_name,
                username,
                avatar_url,
                is_staff
            ),

            artists (
                name,
                slug
            )
        `)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "KiKi feed error:",
            error
        );

        feed.innerHTML = `
            <div class="feed-error">
                Unable to load KiKi posts.
            </div>
        `;

        return;
    }


    if (!posts || posts.length === 0) {

        feed.innerHTML = `
            <div class="feed-empty">
                No posts yet.
            </div>
        `;

        return;
    }


    feed.innerHTML = "";


    /*
     * =========================================
     * GET CURRENT USER
     * =========================================
     */

    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();


    /*
     * =========================================
     * LOAD ALL LIKES
     * =========================================
     */

    const postIds =
        posts.map(post => post.id);


    const {
        data: likes,
        error: likesError
    } = await supabaseClient
        .from("post_likes")
        .select(`
            post_id,
            user_id
        `)
        .in(
            "post_id",
            postIds
        );


    if (likesError) {

        console.error(
            "KiKi likes error:",
            likesError
        );

    }


    /*
     * =========================================
     * CREATE LIKE DATA
     * =========================================
     */

    const likeCounts = {};

    const userLikes = {};


    (likes || []).forEach(like => {

        /*
         * Total likes for this post
         */

        likeCounts[like.post_id] =
            (likeCounts[like.post_id] || 0) + 1;


        /*
         * Whether THIS user liked it
         */

        if (
            user &&
            like.user_id === user.id
        ) {

            userLikes[like.post_id] =
                true;

        }

    });


    /*
     * =========================================
     * RENDER POSTS
     * =========================================
     */

    posts.forEach(post => {

        const profile =
            post.profiles;

        const artist =
            post.artists;


        const displayName =
            profile?.display_name ||
            "KiKi user";


        const artistName =
            artist?.name ||
            "";


        const artistSlug =
            artist?.slug ||
            "";


        const avatar =
            profile?.avatar_url;


        const date =
            new Date(
                post.created_at
            ).toLocaleString();


        const article =
            document.createElement(
                "article"
            );


        article.className =
            "post";


        article.dataset.artist =
            artistName;


        article.dataset.postId =
            post.id;


        /*
         * =========================================
         * OPEN INDIVIDUAL POST
         * =========================================
         */

        article.style.cursor =
            "pointer";


        article.addEventListener(
            "click",
            event => {

                /*
                 * Don't open the post when
                 * clicking an interactive element.
                 */

                if (
                    event.target.closest("button") ||
                    event.target.closest("a") ||
                    event.target.closest("select") ||
                    event.target.closest("input") ||
                    event.target.closest("textarea")
                ) {
                    return;
                }


                const postUrl =
                    "post.html?id=" +
                    encodeURIComponent(
                        post.id
                    );


                /*
                 * If home.html is inside
                 * the main KiKi iframe.
                 */

                if (
                    window.parent &&
                    window.parent !== window
                ) {

                    window.parent.postMessage(
                        {
                            type:
                                "kiki-load-page",

                            url:
                                postUrl
                        },
                        "*"
                    );

                    return;
                }


                /*
                 * Fallback when opened directly.
                 */

                window.location.href =
                    postUrl;

            }
        );


        /* =========================
           OFFICIAL LABEL
        ========================= */

        const officialLabel =
            post.is_staff_post
                ? `
                    <div class="official-label">

                        <img
                            src="images/Kikifficial.gif"
                            alt="KiKifficial"
                        >

                        <span>
                            KiKifficial
                        </span>

                    </div>
                `
                : "";


        /* =========================
           AUTHOR AVATAR
        ========================= */

        const authorAvatar =
            avatar
                ? `
                    <img
                        src="${escapeHTML(avatar)}"
                        class="artist-avatar-image"
                        alt=""
                        style="
                            width: 42px;
                            height: 42px;
                            border-radius: 50%;
                            object-fit: cover;
                            display: block;
                            flex-shrink: 0;
                        "
                    >
                `
                : `
                    <div
                        class="artist-avatar"
                        style="
                            width: 42px;
                            height: 42px;
                            border-radius: 50%;
                            flex-shrink: 0;
                        "
                    >
                        ${
                            artistName
                                .substring(0, 2)
                                .toUpperCase()
                        }
                    </div>
                `;


        /* =========================
           STAFF BADGE
        ========================= */

        const staffBadge =
            profile?.is_staff
                ? `
                    <img
                        src="images/Kikifficial.gif"
                        class="kikifficial-post-badge"
                        alt="Staff member"
                        title="Staff member"
                    >
                `
                : "";


        /*
         * =========================
         * LIKE DATA
         * =========================
         */

        const likeCount =
            likeCounts[post.id] || 0;


        const isLiked =
            userLikes[post.id] === true;


        /*
         * =========================
         * POST HTML
         * =========================
         */

        article.innerHTML = `

            ${officialLabel}


            <div class="post-header">

                ${authorAvatar}


                <div class="post-author">

                    <strong>
                        ${escapeHTML(
                            displayName
                        )}
                    </strong>

                    ${staffBadge}


                    <span class="post-date">

                        ${
                            post.is_staff_post
                                ? "KiKifficial · "
                                : ""
                        }

                        ${escapeHTML(date)}

                    </span>

                </div>

            </div>


            ${
                artistName
                    ? `
                        <div class="post-artist">

                            ${escapeHTML(
                                artistName
                            )}

                        </div>
                    `
                    : ""
            }


            <h2 class="post-title">

                ${escapeHTML(
                    post.title || ""
                )}

            </h2>


            <p class="post-content">

                ${escapeHTML(
                    post.content || ""
                )}

            </p>


            ${
                post.image_url
                    ? `
                        <img
                            src="${escapeHTML(
                                post.image_url
                            )}"
                            class="post-image"
                            alt=""
                        >
                    `
                    : ""
            }


            <div class="translation-area">

                <div class="translation-controls">

                    <label>
                        Language:
                    </label>

                    <select
                        onchange="translatePost(this)"
                    >

                        <option value="en">
                            English
                        </option>

                        <option value="ja">
                            日本語
                        </option>

                        <option value="ko">
                            한국어
                        </option>

                        <option value="zh">
                            中文
                        </option>

                    </select>

                </div>

            </div>


            <div class="post-actions">

                <button
                    class="reaction-button ${
                        isLiked
                            ? "liked"
                            : ""
                    }"
                    data-post-id="${post.id}"
                    onclick="togglePostLike(event, this)"
                >

                    ${
                        isLiked
                            ? "♥"
                            : "♡"
                    }

                    <span>
                        ${likeCount}
                    </span>

                </button>


                <button
                    class="comment-button"
                    onclick="openPostComments(event, '${post.id}')"
                >

                    Comments

                </button>

            </div>

        `;


        feed.appendChild(
            article
        );

    });

}


/* =========================================
   LIKE / UNLIKE
========================================= */

async function togglePostLike(
    event,
    button
) {

    /*
     * Stop the article click handler.
     */

    event.preventDefault();

    event.stopPropagation();


    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();


    /*
     * User isn't logged in.
     */

    if (!user) {

        window.parent.postMessage(
            {
                type:
                    "kiki-load-page",

                url:
                    "logsignin.html"
            },
            "*"
        );

        return;
    }


    const postId =
        button.dataset.postId;


    /*
     * Check whether this user
     * already likes the post.
     */

    const {
        data: existingLike,
        error: checkError
    } = await supabaseClient

        .from("post_likes")

        .select("post_id")

        .eq(
            "post_id",
            postId
        )

        .eq(
            "user_id",
            user.id
        )

        .maybeSingle();


    if (checkError) {

        console.error(
            "Like check error:",
            checkError
        );

        return;
    }


    /*
     * Remove existing like.
     */

    if (existingLike) {

        const {
            error
        } = await supabaseClient

            .from("post_likes")

            .delete()

            .eq(
                "id",
                existingLike.id
            );


        if (error) {

            console.error(
                "Unlike error:",
                error
            );

            return;
        }


        button.classList.remove(
            "liked"
        );


        button.childNodes[0].textContent =
            "♡ ";


        const count =
            button.querySelector("span");


        count.textContent =
            Math.max(
                0,
                parseInt(
                    count.textContent || "0"
                ) - 1
            );


        return;
    }


    /*
     * Add new like.
     */

    const {
        error
    } = await supabaseClient

        .from("post_likes")

        .insert({

            post_id:
                postId,

            user_id:
                user.id

        });


    if (error) {

        console.error(
            "Like error:",
            error
        );

        return;
    }


    button.classList.add(
        "liked"
    );


    button.childNodes[0].textContent =
        "♥ ";


    const count =
        button.querySelector("span");


    count.textContent =
        parseInt(
            count.textContent || "0"
        ) + 1;

}


/* =========================================
   OPEN COMMENTS / POST PAGE
========================================= */

function openPostComments(
    event,
    postId
) {

    event.preventDefault();

    event.stopPropagation();


    const postUrl =
        "post.html?id=" +
        encodeURIComponent(
            postId
        );


    if (
        window.parent &&
        window.parent !== window
    ) {

        window.parent.postMessage(
            {
                type:
                    "kiki-load-page",

                url:
                    postUrl
            },
            "*"
        );

        return;
    }


    window.location.href =
        postUrl;

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}

/* =========================================
   DATABASE LIKES
========================================= */

async function react(button) {

    const post =
        button.closest(".post");

    if (!post) {
        return;
    }

    const postId =
        post.dataset.postId;

    const {
        data: {
            user
        }
    } = await supabaseClient.auth.getUser();


    /* User isn't logged in */

    if (!user) {

        if (
            window.parent &&
            window.parent !== window
        ) {

            window.parent.postMessage(
                {
                    type: "kiki-load-page",
                    url: "logsignin.html"
                },
                "*"
            );

        } else {

            window.location.href =
                "logsignin.html";

        }

        return;
    }


    /* Check existing like */

    const {
        data: existingLike,
        error: checkError
    } =
        await supabaseClient
            .from("post_likes")
            .select("post_id")
            .eq("post_id", postId)
            .eq("user_id", user.id)
            .maybeSingle();


    if (checkError) {

        console.error(
            "Like check error:",
            checkError
        );

        return;
    }


    const number =
        button.querySelector("span");

    let count =
        parseInt(
            number.textContent
        ) || 0;


    /* UNLIKE */

    if (existingLike) {

        const {
            error
        } =
            await supabaseClient
                .from("post_likes")
		.delete()
		.eq(
		    "post_id",
		    postId
		)
		.eq(
		    "user_id",
		    user.id
		);


        if (error) {

            console.error(
                "Unlike error:",
                error
            );

            return;
        }


        button.classList.remove(
            "reacted"
        );

        button.firstChild.textContent =
            "♡";

        number.textContent =
            Math.max(
                0,
                count - 1
            );

        return;
    }


    /* LIKE */

    const {
        error
    } =
        await supabaseClient
            .from("post_likes")
            .insert({
                post_id: postId,
                user_id: user.id
            });


    if (error) {

        console.error(
            "Like error:",
            error
        );

        return;
    }


    button.classList.add(
        "reacted"
    );

    button.firstChild.textContent =
        "♥";

    number.textContent =
        count + 1;
}

/* =========================================
   LOAD FEED
========================================= */

loadKiKiFeed();